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
  void main() {
    gl_FragColor = texture2D(tex0, vTexCoord);
  }
`;

export async function createRenderer(p) {
  const renderer = {
    layers: {},
    shaders: {},
    activeShader: null,

    async loadShader(name, vertPath, fragPath) {
      try {
        const [vert, frag] = await Promise.all([
          fetch(vertPath).then(res => (res.ok ? res.text() : vsDefault)),
          fetch(fragPath).then(res => (res.ok ? res.text() : fsDefault)),
        ]);
        this.shaders[name] = p.createShader(vert, frag);
        console.log(`🎨 Loaded shader: ${name}`);
      } catch (err) {
        console.warn(`⚠️ Shader load failed (${name}), using built-in defaults`, err);
        this.shaders[name] = p.createShader(vsDefault, fsDefault);
      }
    },

    async init() {
      this.layers.main = p.createGraphics(p.width, p.height, p.WEBGL);
      this.layers.ui = p.createGraphics(p.width, p.height, p.WEBGL);

      await this.loadShader('default', './shaders/default.vert', './shaders/default.frag');
    },

    use(shaderName = 'default') {
      const shader = this.shaders[shaderName];
      if (shader) {
        this.activeShader = shader;
        p.shader(shader);
      } else {
        console.warn(`⚠️ Shader "${shaderName}" not found; reverting to default`);
        this.activeShader = this.shaders.default;
        p.shader(this.activeShader);
      }
    },

    drawScene(drawFn) {
      if (this.activeShader) p.shader(this.activeShader);
      drawFn(this.layers.main);
    },

    resize(w, h) {
      Object.values(this.layers).forEach(layer => layer.resizeCanvas(w, h));
    },
  };

  await renderer.init();
  p.shared.renderer = renderer;
  return renderer;
}