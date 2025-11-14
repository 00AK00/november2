import { PhysicsWorld } from './PhysicsWorld.js';
import { PhysicsSolver } from './PhysicsSolver.js';

export class BaseScene {
  constructor(p) {
    this.p = p;
    this.Debug = p.shared.Debug;
    this.renderer = p.shared.renderer;
    this.sceneFrameCount = 0;
    this.recentlyLaunchedScene = true;
    this.recentlyChangedScene = true;
    this.lastSceneChangeFrameNumber = 0;
    this.entities = [];
    this.tileLookup = null;
    this.currentsLookup = null;
    this.physicsWorld = new PhysicsWorld({
      getTile: this.getTile.bind(this),
      restitution: 0.2,
      friction: 0.1
    });
    this.physicsSolver = new PhysicsSolver(this.physicsWorld, {
      integrator: 'verlet',
      springIterations: 1,
      useMemoryTethers: true,
      gravity: { x: 0, y: 0.15 }
    });
  }

  init() {
    this.Debug.log('level', `📜 ${this.constructor.name} initialized`);
    this.sceneFrameCount = 0;
    const player = this.p.shared.player;
    this.padding = this.calculatePadding();
    if (this.levelData) {
      this.computeMapTransform(this.levelData, { paddingPx: this.padding });
      player.setScene(this);
      player.reset(this.levelData.spawn);
      this.tileLookup = new Map();
      for (const t of this.levelData.tiles) {
        const key = `${t.x},${t.y}`;
        this.tileLookup.set(key, t);
      }
      this.currentsLookup = new Map();
      for (const c of this.levelData.currents) {
        const key = `${c.x},${c.y}`;
        this.currentsLookup.set(key, c);
      }
    }
    const r = this.p.shared.renderer;
    r.reset();
    this.registerEntity(player);
    return [r, player];
  }

  update() {
    const r = this.p.shared.renderer;
    const player = this.p.shared.player;
    const dt = this.p.shared.timing.delta;

    this.sceneFrameCount++;
    this.recentlyLaunchedScene = this.sceneFrameCount < 5;
    this.recentlyChangedScene = (this.sceneFrameCount - this.lastSceneChangeFrameNumber) < 5;

    // 1. apply entity forces
    for (const entity of this.entities) {
      entity.applyForces(dt);
      const p = entity.mainPhysicsParticle;
      if (p) {
        const cx = Math.floor(p.pos.x);
        const cy = Math.floor(p.pos.y);
        const current = this.getCurrent(cx, cy);
        if (current) {
          this.Debug.log('level', `Applying current to entity at (${cx},${cy}): dx=${current.dx}, dy=${current.dy}`);
          p.addForce(current.dx, current.dy);
        }
      }
    }

    // 2. gather root particles (for example, each entity exposes mainPhysicsParticle)
    const roots = [];
    for (const entity of this.entities) {
      if (entity.mainPhysicsParticle) {
        roots.push(entity.mainPhysicsParticle);
      }
    }

    // 3. step the physics
    this.physicsSolver.step(dt, roots);

    // 4. post-physics entity updates
    for (const entity of this.entities) {
      entity.postPhysics(dt);
    }

    return [r, player, dt];
  }

  registerEntity(entity) {
    this.entities.push(entity);
    entity.setScene(this);
  }

  getTile(x, y) {
    if (!this.tileLookup || !this.levelData) return null;

    const cols = this.levelData.cols;
    const rows = this.levelData.rows;

    // 1. Outside playable area → implicit solid boundary
    if (x < 0 || y < 0 || x >= cols || y >= rows) {
      return {
        x,
        y,
        solid: true,
        type: "boundary"
      };
    }

    // 2. Inside world → return actual tile
    const tile = this.tileLookup.get(`${x},${y}`);
    if (!tile) return null;

    return {
      ...tile,
      solid: tile.type === "wall"
    };
  }

  // getTile(x, y) {
  //   if (!this.tileLookup) return null;
  //   const tile = this.tileLookup.get(`${x},${y}`);
  //   if (!tile) return null;

  //   // Tag anything with type === 'wall' as solid
  //   return {
  //     ...tile,
  //     solid: tile.type === 'wall'
  //   };
  // }

  getCurrent(x, y) {
    if (!this.currentsLookup) return null;
    return this.currentsLookup.get(`${x},${y}`) || null;
  }

  onKeyPressed(key, keyCode) {
    this.Debug.log('level', `Key pressed in ${this.constructor.name}: ${key} (${keyCode})`);
    if (this.p.keyIsPressed && this.p.key === 's') {
      this.p.shared.settings.enableShaders = !this.p.shared.settings.enableShaders;
      this.Debug.log('level', `Toggled shaders: ${this.p.shared.settings.enableShaders}`);
      // this.Debug.log('level', `Toggled physics debug: ${this.physicsWorld.debug}`);
      // this.physicsWorld.DEBUG_COLLISIONS = !this.physicsWorld.DEBUG_COLLISIONS;
    }
  }



  draw() {
    // default noop
  }

  cleanup() {
    this.Debug.log('level', `🧹 ${this.constructor.name} cleanup`);
  }

  // ---- Drawing Tools ----------------------------------------------------------

  // --------------------------------------------------------------
  // Identify contiguous wall regions (4-way connectivity)
  // --------------------------------------------------------------
  extractTileRegions(tiles) {
    const grid = new Map();
    for (const t of tiles) {
      grid.set(`${t.x},${t.y}`, t);
    }

    const visited = new Set();
    const regions = [];

    for (const tile of tiles) {
      const key = `${tile.x},${tile.y}`;
      if (visited.has(key)) continue;

      const stack = [tile];
      const region = [];

      while (stack.length) {
        const cur = stack.pop();
        const ck = `${cur.x},${cur.y}`;
        if (visited.has(ck)) continue;

        visited.add(ck);
        region.push(cur);

        // 4-way neighbors
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nk = `${cur.x + dx},${cur.y + dy}`;
          if (grid.has(nk) && !visited.has(nk)) {
            stack.push({ x: cur.x + dx, y: cur.y + dy });
          }
        }
      }

      regions.push(region);
    }

    return regions;
  }

  // --------------------------------------------------------------
  // Convert region tiles into a polygon outline (clockwise)
  // Simple marching-squares boundary tracing
  // --------------------------------------------------------------
  computeRegionOutline(region) {
    const tileSet = new Set(region.map(t => `${t.x},${t.y}`));

    const edges = [];

    for (const t of region) {
      const { x, y } = t;

      const isEmpty = (dx, dy) => !tileSet.has(`${x + dx},${y + dy}`);

      if (isEmpty(0, -1)) edges.push([[x, y], [x + 1, y]]);
      if (isEmpty(1, 0)) edges.push([[x + 1, y], [x + 1, y + 1]]);
      if (isEmpty(0, 1)) edges.push([[x + 1, y + 1], [x, y + 1]]);
      if (isEmpty(-1, 0)) edges.push([[x, y + 1], [x, y]]);
    }

    if (edges.length === 0) return [];

    const outline = [];
    let [startA, startB] = edges[0];
    outline.push({ x: startA[0], y: startA[1] });

    let current = startB;
    let guard = 0;

    while (guard++ < 5000) {
      outline.push({ x: current[0], y: current[1] });

      const next = edges.find(e => e[0][0] === current[0] && e[0][1] === current[1]);
      if (!next) break;

      current = next[1];
      if (current[0] === startA[0] && current[1] === startA[1]) break;
    }

    return outline;
  }

  // --------------------------------------------------------------
  // Apply noise-based organic displacement + corner softness
  // --------------------------------------------------------------
  distortPolygon(points, opts = {}) {
    const noiseScale = opts.noiseScale ?? 0.08;
    const noiseAmp = opts.noiseAmp ?? 0.25;
    const cornerSmooth = opts.cornerSmooth ?? 0.5;

    const p = this.p;
    const out = [];

    for (let i = 0; i < points.length; i++) {
      const a = points[(i - 1 + points.length) % points.length];
      const b = points[i];
      const c = points[(i + 1) % points.length];

      const vx1 = b.x - a.x;
      const vy1 = b.y - a.y;
      const vx2 = c.x - b.x;
      const vy2 = c.y - b.y;

      const avgx = b.x + (vx1 + vx2) * cornerSmooth * 0.5;
      const avgy = b.y + (vy1 + vy2) * cornerSmooth * 0.5;

      const n = p.noise(b.x * noiseScale, b.y * noiseScale) - 0.5;
      const angle = Math.atan2(vy1 + vy2, vx1 + vx2);

      const dx = Math.cos(angle) * n * noiseAmp;
      const dy = Math.sin(angle) * n * noiseAmp;

      out.push({ x: avgx + dx, y: avgy + dy });
    }

    return out;
  }

  // --------------------------------------------------------------
  // Draws organic blobby wall shapes instead of squares
  // --------------------------------------------------------------
  drawOrganicBlockingBackground(layer, tiles, opts = {}) {
    if (!layer || !this.mapTransform) {
      console.warn('⚠️ drawOrganicBlockingBackground: Missing layer or mapTransform');
      return;
    }

    const { tileSizePx, originPx } = this.mapTransform;

    layer.clear();
    layer.noStroke();
    const chroma = this.p.shared.chroma;
    const pc = chroma.terrain;
    layer.fill(pc[0], pc[1], pc[2], pc[3]);

    const regions = this.extractTileRegions(tiles);

    for (const region of regions) {
      const outline = this.computeRegionOutline(region);
      if (outline.length === 0) continue;

      const distorted = this.distortPolygon(outline, opts);

      layer.beginShape();
      for (const p of distorted) {
        const sx = originPx.x + p.x * tileSizePx;
        const sy = originPx.y + p.y * tileSizePx;
        layer.curveVertex(sx, sy);
      }
      layer.endShape(this.p.CLOSE);
    }
  }

  drawBlockingBackgroundTransformed(layer, tiles) {
    if (!layer || !this.mapTransform) {
      console.warn('⚠️ drawBlockingBackgroundTransformed: Missing layer or mapTransform');
      return;
    }
    const { tileSizePx, originPx } = this.mapTransform;

    layer.clear();
    layer.noStroke();
    layer.fill(100, 120, 150);

    for (const t of tiles) {
      if (t && Number.isFinite(t.x) && Number.isFinite(t.y)) {
        const px = originPx.x + t.x * tileSizePx;
        const py = originPx.y + t.y * tileSizePx;
        layer.rect(px, py, tileSizePx, tileSizePx);
      }
    }
  }

  drawCurrents(layer, drawArrows = true) {
    if (!this.currentsLookup) return;

    const chroma = this.p.shared.chroma;
    const pc = chroma.current;

    layer.fill(pc[0], pc[1], pc[2], pc[3]);

    const { tileSizePx, originPx } = this.mapTransform;

    for (const [key, c] of this.currentsLookup.entries()) {
      layer.noStroke();
      const { x, y, dx, dy } = c;

      // convert world → screen
      const { x: sx, y: sy } = this.worldToScreen({ x, y });

      // draw current tile box
      layer.rect(sx, sy, tileSizePx, tileSizePx);

      if (drawArrows) {
        // arrow center
        const cx = sx + tileSizePx * 0.5;
        const cy = sy + tileSizePx * 0.5;

        // arrow direction scaled for visual clarity
        const ax = dx * (tileSizePx * 0.01);
        const ay = dy * (tileSizePx * 0.01);

        layer.stroke(0);
        layer.strokeWeight(1);
        layer.line(cx, cy, cx + ax, cy + ay);

        // Simple arrowhead
        const angle = Math.atan2(ay, ax);
        const headLen = tileSizePx * 0.15;

        layer.line(
          cx + ax,
          cy + ay,
          cx + ax - headLen * Math.cos(angle - Math.PI / 6),
          cy + ay - headLen * Math.sin(angle - Math.PI / 6)
        );

        layer.line(
          cx + ax,
          cy + ay,
          cx + ax - headLen * Math.cos(angle + Math.PI / 6),
          cy + ay - headLen * Math.sin(angle + Math.PI / 6)
        );
      }
    }
  }

  drawRainbowBar(layer, tileSize = 32) {
    if (!layer) {
      this.Debug.log('level', '⚠️ drawRainbowBar: No layer provided');
      return;
    }
    layer.clear();
    layer.noStroke();
    const width = layer.width || 320;
    const height = tileSize;

    if (typeof layer.colorMode === 'function') layer.colorMode(layer.HSB, 360, 100, 100);
    for (let x = 0; x < width; x++) {
      const hue = (x / width) * 360;
      layer.fill(hue, 100, 100);
      layer.rect(x, 100, 1, height);
    }
    if (typeof layer.colorMode === 'function') layer.colorMode(layer.RGB, 255, 255, 255);
  }

  // ---- Helpers -------------------------------------------------

  markDirty(...layers) {
    const r = this.renderer;
    if (!r || !r.layerDirty) return;

    const flat = layers.flat();
    flat.forEach(name => {
      if (r.layerDirty[name] !== undefined) {
        r.layerDirty[name] = true;
        this.Debug.log('renderer', `🟠 Marked dirty: ${name}`);
      }
    });
  }

  markClean(...layers) {
    const r = this.renderer;
    if (!r || !r.layerDirty) return;
    layers.forEach(name => {
      if (r.layerDirty[name] !== undefined) r.layerDirty[name] = false;
    });
  }

  deactivatePlayer() {
    const player = this.p.shared.player;
    if (player) player.deactivate();
  }

  onResize(w, h) {
    this.Debug.log('level', `🔄 Scene onResize called: ${w}x${h}`);
    this.lastSceneChangeFrameNumber = this.sceneFrameCount;
    this.padding = this.calculatePadding();
    if (this.levelData) this.computeMapTransform(this.levelData, { paddingPx: this.padding });
  }

  onActionStart(action) {
    const player = this.p.shared.player;
    player?.onActionStart?.(action);
    if (action === "pause") this.p.shared.sceneManager.change("menu");
  }

  onActionEnd(action) {
    const player = this.p.shared.player;
    player?.onActionEnd?.(action);
  }

  calculatePadding() {
    const p = this.p;
    const W = p.width;
    const H = p.height;
    const scale = this.p.shared.settings?.paddingRatio ?? 1;

    const paddingPx = Math.floor(Math.min(W, H) * scale);
    this.Debug.log('level', `Calculated padding: ${paddingPx}px (scale: ${scale})`);
    return paddingPx;
  }

  computeMapTransform(levelData, opts = {}) {
    const p = this.p;
    const W = p.width;
    const H = p.height;
    const scale = this.p.shared.settings?.graphicsScaling ?? 1;

    const cols = levelData.cols;
    const rows = levelData.rows;
    if (!cols || !rows) {
      this.Debug.log('level', '⚠️ computeMapTransform: invalid layout');
      return null;
    }

    const paddingPx = opts.paddingPx ?? 0;

    // Work entirely in *internal render space*
    const internalW = W / scale;
    const internalH = H / scale;
    const usableW = internalW - 2 * paddingPx;
    const usableH = internalH - 2 * paddingPx;
    const tileSizePx = Math.floor(Math.min(usableW / cols, usableH / rows));

    // Center inside the internal coordinate system
    const mapW = cols * tileSizePx;
    const mapH = rows * tileSizePx;
    const originPx = {
      x: Math.floor((internalW - mapW) / 2),
      y: Math.floor((internalH - mapH) / 2)
    };

    this.mapTransform = {
      cols,
      rows,
      tileSizePx,
      originPx,
      scale
    };

    this.Debug.log(
      'level',
      `🧭 mapTransform: ${cols}×${rows} tiles, ${tileSizePx}px each, origin=(${originPx.x},${originPx.y}), scale=${scale}`
    );

    return this.mapTransform;
  }

  worldToScreen(pt) {
    if (!this.mapTransform) return pt;
    const { originPx, tileSizePx, scale } = this.mapTransform;
    // convert from grid to internal pixel space, then scale up
    return {
      x: (originPx.x + pt.x * tileSizePx),
      y: (originPx.y + pt.y * tileSizePx)
    };
  }

  screenToWorld(pt) {
    if (!this.mapTransform) return pt;
    const { originPx, tileSizePx, scale } = this.mapTransform;
    // invert worldToScreen to return logical grid coordinates
    return {
      x: (pt.x - originPx.x) / tileSizePx,
      y: (pt.y - originPx.y) / tileSizePx
    };
  }
}