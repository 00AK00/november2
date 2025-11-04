# Copilot Instructions for "The Enemy Of My Anemone"

## Project Overview
This is a p5.js-based web game with a modular ES6 architecture. The project uses sequential module loading to ensure proper initialization order and dependency management.

## Architecture & Module System

### Core Pattern: Sequential Module Loading
- **File**: `index.html` contains the module loader that imports JS files in dependency order
- **Order**: `controls.js` → `level1.js` → `main.js` (this order is critical)
- **Why**: Each module may depend on globals/functions from previous modules
- **Example**: When adding new modules, update the `files` array in `index.html` and maintain dependency order

```javascript
const files = [
    './controls.js',    // Input handling, must load first
    './level1.js',      // Game logic, depends on controls
    './main.js'         // Main game loop, depends on all others
];
```

### Module Structure
- Each `.js` file should be an ES6 module but can define global variables for p5.js compatibility
- Use `window.functionName = ...` for functions that need cross-module access
- p5.js functions (`setup()`, `draw()`) should only be defined in `main.js`

## Development Workflow

### Local Development
```bash
python3 -m http.server
```
- **Required**: Use a local server (not file://) due to ES6 module CORS restrictions
- **Port**: Default 8000, access via `http://localhost:8000`
- **Why**: Browsers block ES6 module imports from file:// protocol

### File Organization
- `index.html`: Entry point with module loader and p5.js CDN import
- `controls.js`: Input handling (keyboard, mouse events)
- `level1.js`: Game state, entities, collision detection
- `main.js`: p5.js lifecycle functions (`setup()`, `draw()`)

## Key Conventions

### p5.js Integration
- Use p5.js global mode (functions available globally)
- CDN version: 1.11.1 (specified in `index.html`)
- Only define p5 lifecycle functions in `main.js` to avoid conflicts

### Code Patterns
- Empty files are placeholder modules - fill them following the established pattern
- Console logging in module loader helps debug loading issues
- Maintain the "✅ All modules loaded!" confirmation message

## When Adding Features
1. Identify which module the feature belongs to based on responsibility
2. If adding a new module, insert it in the correct position in `index.html`
3. Test module loading order if cross-dependencies are introduced
4. Use the local server for testing - file:// protocol will not work

## Game-Specific Context
- Title: "The Enemy Of My Anemone" (suggests marine/underwater theme)
- Currently a skeleton project with placeholder modules
- Designed for browser-based gameplay with p5.js rendering