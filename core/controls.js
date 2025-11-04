// core/controls.js
export function registerControls(p) {
  p.mousePressed = () => {
    console.log(`Mouse pressed at (${p.mouseX}, ${p.mouseY})`);
    p.onMousePressed?.(p.mouseX, p.mouseY);
  };

  p.mouseReleased = () => {
    console.log(`Mouse released at (${p.mouseX}, ${p.mouseY})`);
    p.onMouseReleased?.(p.mouseX, p.mouseY);
  };

  p.mouseMoved = () => {
    console.log(`Mouse moved to (${p.mouseX}, ${p.mouseY})`);
    p.onMouseMoved?.(p.mouseX, p.mouseY);
  };

  p.mouseDragged = () => {
    console.log(`Mouse dragged at (${p.mouseX}, ${p.mouseY})`);
    p.onMouseDragged?.(p.mouseX, p.mouseY);
  };

  p.touchStarted = () => {
    console.log(`Touch started at (${p.mouseX}, ${p.mouseY})`);
    p.onTouchStarted?.(p.mouseX, p.mouseY);
  };

  p.touchEnded = () => {
    console.log(`Touch ended at (${p.mouseX}, ${p.mouseY})`);
    p.onTouchEnded?.(p.mouseX, p.mouseY);
  };

  p.keyPressed = () => {
    console.log(`Key pressed: ${p.key} (${p.keyCode})`);
    p.onKeyPressed?.(p.key, p.keyCode);
  };

  p.keyReleased = () => {
    console.log(`Key released: ${p.key} (${p.keyCode})`);
    p.onKeyReleased?.(p.key, p.keyCode);
  };
}