export function loadMenu(p) {
  p.activeScene = {
    draw() {
      const r = p.shared.renderer;
      r.use('default');
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('Menu Scene', 0, 0);
    }
  };
}