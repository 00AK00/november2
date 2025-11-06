// Fallbacks for default shaders
const vsDefault = `
  precision mediump float;
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vTexCoord;
  void main() {
    vTexCoord = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
  }
`;

const fsDefault = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D tex0;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uTime;
  void main() {
    gl_FragColor = texture2D(tex0, vTexCoord);
  }
`;

export async function createRenderer(p) {
  const renderer = {
    layers: {},
    shaders: {},
    shader_components: {},
    activeShader: null,
    layerDirty: {},

    _pendingShaders: {},

    frameCount: 0,
    frameThreshold: 1,
    Debug: p.shared.Debug,

    deferShader(layerName, shaderName = 'default') {
      this._pendingShaders[layerName] = shaderName;
      this.layerDirty[layerName] = true;
      this.Debug.log('renderer', `🕒 Deferred shader "${shaderName}" for layer "${layerName}"`);
    },

    setNoShader(layerName) {
      const layer = this.layers[layerName];
      if (!layer) {
        this.Debug.log('renderer', '[WARN]', `⚠️ Tried to remove shader from unknown layer: "${layerName}".`);
        return;
      }
      if (typeof layer.resetShader === 'function') {
        layer.resetShader();
      }
      if ('activeShader' in layer) {
        delete layer.activeShader;
      }
      if (this._pendingShaders[layerName]) {
        delete this._pendingShaders[layerName];
      }
      layer.noShader = true;
      this.layerDirty[layerName] = true;
      this.Debug.log('renderer', `🗑️ Removed shader from layer "${layerName}"`);
    },

    async loadShader(name, vertPath, fragPath) {
      try {
        const [vert, frag] = await Promise.all([
          fetch(vertPath).then(res => (res.ok ? res.text() : vsDefault)),
          fetch(fragPath).then(res => (res.ok ? res.text() : fsDefault)),
        ]);
        this.shader_components[name] = { "vert": vert, "frag": frag };
        this.shaders[name] = p.createShader(vert, frag);
        this.Debug.log('renderer', `🎨 Loaded shader: ${name}`);
      } catch (err) {
        this.Debug.log('renderer', '[WARN]', `⚠️ Shader load failed (${name}), using built-in defaults`, err);
        this.shaders[name] = p.createShader(vsDefault, fsDefault);
      }
    },

    async init() {
      // Create all major rendering layers
      ['background', 'world', 'entities', 'ui'].forEach(layerName => {
        this.layers[layerName] = p.createGraphics(p.width, p.height, p.WEBGL);
        this.layerDirty[layerName] = true;
        this.layers[layerName].textFont(p.shared.mainFont);
        this.layers[layerName].textAlign(p.CENTER, p.CENTER);
        this.layers[layerName].textSize(42);
      });

      await this.loadShader('default', './shaders/default.vert', './shaders/default.frag');
    },

    updateUniforms(p) {
      const t = p.millis() / 1000.0;
      const res = [p.width, p.height];
      const mouse = [p.mouseX, p.mouseY];

      if (this.activeShader && !this.activeShader.noShader) {
        try {
          this.activeShader.setUniform('uTime', t);
          this.activeShader.setUniform('uResolution', res);
          this.activeShader.setUniform('uMouse', mouse);
        } catch (err) {
          // Ignore errors for shaders that don't define these uniforms
        }
      }

      for (const [layerName, layer] of Object.entries(this.layers)) {
        if (layer.noShader) continue;
        if (layer.activeShader) {
          try {
            layer.activeShader.setUniform('uTime', t);
            layer.activeShader.setUniform('uResolution', res);
            layer.activeShader.setUniform('uMouse', mouse);
          } catch (err) {
            // Ignore errors for shaders that don't define these uniforms
          }
        }
      }
    },

    createAndApplyShader(layerName, shaderName = 'default') {
      const layer = this.layers[layerName];
      if (!layer) {
        this.Debug.log('renderer', '[WARN]', `⚠️ Layer "${layerName}" not found for shader application.`);
        return;
      }
      if (layer.noShader) return;
      const shaderComp = this.shader_components[shaderName];
      if (!shaderComp) {
        this.Debug.log('renderer', '[WARN]', `⚠️ Shader components for "${shaderName}" not found.`);
        return;
      }
      try {
        const layer_shader = layer.createShader(shaderComp.vert, shaderComp.frag);
        layer.shader(layer_shader);
        layer.activeShader = layer_shader;
        layer.noShader = false;
        delete this._pendingShaders[layerName];
        this.Debug.log('renderer', `🎨 Applied deferred shader "${shaderName}" to layer "${layerName}"`);
      } catch (err) {
        this.Debug.log('renderer', '[WARN]', `💥 Deferred shader still failed for "${layerName}" — will retry next frame`, err);
      }
    },

    use(shaderName = 'default') {
      const shader = this.shaders[shaderName];
      if (shader) {
        this.activeShader = shader;
        p.shader(shader);
        this.updateUniforms(p);
      } else {
        this.Debug.log('renderer', '[WARN]', `⚠️ Shader "${shaderName}" not found; reverting to default`);
        this.activeShader = this.shaders.default;
        p.shader(this.activeShader);
        this.updateUniforms(p);
      }
    },

    markDirty(layerName) {
      if (!this.layers[layerName]) {
        this.Debug.log('renderer', '[WARN]', `⚠️ Tried to mark unknown layer dirty: "${layerName}". Creating a new layer.`);
        this.layers[layerName] = p.createGraphics(p.width, p.height, p.WEBGL);
      }
      this.layerDirty[layerName] = true;
    },

    markClean(layerName) {
      if (!this.layers[layerName]) {
        this.Debug.log('renderer', '[WARN]', `⚠️ Tried to mark unknown layer clean: "${layerName}". Creating a new layer.`);
        this.layers[layerName] = p.createGraphics(p.width, p.height, p.WEBGL);
      }
      this.layerDirty[layerName] = false;
    },

    drawScene(drawFn) {
      this.frameCount++;
      this.updateUniforms(p);

      // Pass layers to scene draw function
      const { background, world, entities, ui } = this.layers;

      for (const [name, layer] of Object.entries(this.layers)) {
        if (this.layerDirty[name]) {
          layer.clear();
          layer.noStroke();
          layer.drawingContext.disable(layer.drawingContext.DEPTH_TEST);
        }

        // Only apply deferred shaders after a few frames have passed since reset
        if (this._pendingShaders[name] && this.frameCount > this.frameThreshold) {
          const shaderName = this._pendingShaders[name];
          const shader = this.shaders[shaderName];
          if (p.shared.timing.every(5)) {
            this.Debug.log('renderer', shaderName);
          }
          if (shader && layer._renderer?.GL) {
            this.createAndApplyShader(name, shaderName);
          }
        }
      }

      // Let scene draw into layers
      drawFn(this.layers);

      // Mark all layers clean after draw
      for (const name in this.layerDirty) {
        this.layerDirty[name] = false;
      }

      // Composite onto main canvas
      p.resetShader();
      p.image(background, -p.width / 2, -p.height / 2);
      p.image(world, -p.width / 2, -p.height / 2);
      p.image(entities, -p.width / 2, -p.height / 2);
      p.image(ui, -p.width / 2, -p.height / 2);

      // Check renderer readiness
      if (!this.ready && Object.keys(this._pendingShaders).length === 0) {
        this.ready = true;
        this.Debug.log('renderer', '✅ Renderer fully initialized with shaders');
      }
    },

    resize(w, h) {
      Object.entries(this.layers).forEach(([name, layer]) => {
        layer.resizeCanvas(w, h);
        this.layerDirty[name] = true; // mark dirty after resize
      });
    },
    reset() {
      for (const [name, layer] of Object.entries(this.layers)) {
        layer.clear();
        layer.noStroke();
        layer.drawingContext.disable(layer.drawingContext.DEPTH_TEST);
        this.layerDirty[name] = true; // mark everything dirty for next draw
      }
      this.activeShader = this.shaders.default;
      this.updateUniforms(p);
      this.frameCount = 0;
      this.Debug.log('renderer', '🔄 Renderer reset, frame counter cleared');
    }
  };

  await renderer.init();
  p.shared.renderer = renderer;
  return renderer;
}