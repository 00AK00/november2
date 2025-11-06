export function createUI(p) {
  const ui = {
    visible: true,

    show() { this.visible = true; },
    hide() { this.visible = false; },

    draw(layer) {
      if (!this.visible) return;

      layer.push();
      layer.fill(255);
      layer.textAlign(p.LEFT, p.TOP);
      layer.textSize(18);

      // Example: show FPS + player info
      const fps = p.frameRate().toFixed(0);
      const player = p.shared?.player;
      const hp = player ? player.health : '-';

      layer.text(`FPS: ${fps}`, 10 - p.width/2, 10 - p.height/2);
      layer.text(`HP: ${hp}`, 10 - p.width/2, 30 - p.height/2);
      layer.pop();
    }
  };

  p.shared.ui = ui;
  return ui;
}