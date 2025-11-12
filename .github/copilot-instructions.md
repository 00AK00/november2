# Copilot Instructions for "The Enemy Of My Anemone"

## Project Architecture
This is a sophisticated WebGL-based game using p5.js in instance mode with a modular ES6 architecture. The project uses a custom renderer with shader support, scene management, and event-driven input handling.

## Core System Design

### Entry Point & Module Loading
- **File**: `main.js` - Uses p5.js instance mode (`new p5(mainSketch)`)
- **Pattern**: ES6 imports with async initialization in `p.setup()`
- **Critical Order**: renderer → system events → controls → initial scene
- **Shared State**: `p.shared` object contains all cross-module references

### Renderer System (`core/renderer.js`)
- **WebGL Pipeline**: Multi-layer graphics with custom shader support
- **Shader Loading**: Graceful fallback to built-in defaults if files fail to load
- **Layers**: `main` (world) and `ui` (overlay) graphics buffers
- **Usage**: Always call `renderer.use('shaderName')` before drawing operations

```javascript
// Standard pattern for scene drawing
const r = p.shared.renderer;
r.use('chroma'); // or custom shader
// draw operations here
```

### Scene Management
- **Current Scene**: `p.activeScene` object with `draw()` method
- **Scene Loading**: Import and call scene loader functions (e.g., `loadMenu(p)`)
- **Scene Structure**: Each scene should set `p.activeScene = { draw() { ... } }`

### Event System
- **Controls**: `core/controls.js` registers p5 event handlers with optional callbacks
- **System Events**: `core/system.js` handles window resize/orientation with debouncing
- **Pattern**: Use optional chaining for scene callbacks: `p.onKeyPressed?.(key, keyCode)`

## Directory Structure & Responsibilities

```
core/          # Core engine systems
├── renderer.js    # WebGL rendering & shader management
├── system.js      # Window events, resize handling
├── controls.js    # Input event registration
└── ui.js          # UI components (placeholder)

entities/      # Game objects
├── player.js      # Player entity logic
└── enemy.js       # Enemy entity logic

scenes/        # Game states/screens
├── menu.js        # Main menu scene
└── level1.js      # Level 1 gameplay scene

shaders/       # WebGL shaders
├── default.vert   # Default vertex shader
└── default.frag   # Default fragment shader
```

## Key Development Patterns

### Shader Integration
- Place shader files in `shaders/` directory
- Use `renderer.loadShader(name, vertPath, fragPath)` in setup
- Always provide fallback handling for failed shader loads
- Shaders are automatically registered with graceful error handling

### Scene Development
1. Create scene file in `scenes/`
2. Export a load function: `export function loadSceneName(p) { ... }`
3. Set `p.activeScene` with required `draw()` method
4. Import and call from appropriate trigger point

### Input Handling
- Register scene-specific callbacks using optional event handlers
- Example: `p.onKeyPressed = (key, keyCode) => { /* scene logic */ }`
- All core events (mouse, touch, keyboard) are automatically logged

### Mobile/Responsive Support
- Automatic canvas resizing with debounced events
- Orientation change detection with angle/type reporting
- CSS ensures full-screen, no-overflow display
- Touch events are mapped and logged alongside mouse events

## Development Workflow

### Local Development
```bash
python3 -m http.server
```
- **Required**: Local server for WebGL shader loading and ES6 modules
- **Port**: Default 8000, access via `http://localhost:8000`

### Adding New Features
1. **Entities**: Add to `entities/`, follow existing patterns for game objects
2. **Scenes**: Create in `scenes/`, implement scene loading pattern
3. **Shaders**: Place in `shaders/`, register via renderer in scene setup
4. **Core Systems**: Extend `core/` modules for engine-level functionality

## WebGL & Performance Notes
- Uses WebGL mode for hardware acceleration
- Font loading required for WebGL text rendering (see `p.preload()`)
- Multiple graphics layers for efficient UI/world separation
- Debounced resize events prevent performance issues on mobile

## Error Handling Philosophy
- Graceful degradation for asset loading failures
- Console logging for debugging input events and system state
- Optional chaining pattern for loose coupling between systems