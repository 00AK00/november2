

export function loadGameOver(p) {
    return {
        Debug: p.shared.Debug,
        init() {
            this.Debug.log('level', "Game Over");
            p.shared.ui.hide();
            const r = p.shared.renderer;
            const player = p.shared.player;
            player.deactivate();
            r.reset();
            r.deferShader('background', 'default');
            r.deferShader('world', 'default');
            r.setNoShader('entities');
            r.setNoShader('ui');
            // r.deferShader('ui', 'default');
        },
        onActionStart(action) {
            if (action === "pause") p.shared.sceneManager.change("menu");
        },

        onKeyPressed(key, keyCode) {
            if (p.keyIsPressed && p.key === 'm') {
                p.shared.sceneManager.change('menu');
            }
        },

        update() {
            const r = p.shared.renderer;
            r.markDirty('ui');
            r.markDirty('background');
        },

        draw() {
            const r = p.shared.renderer;
            r.use('default');

            r.drawScene(({ background, ui }) => {
                // Background layer
                if (r.layerDirty.background) {
                    background.background(80, 0, 0);
                }
                // UI layer (text)
                if (r.layerDirty.ui) {
                    ui.push();
                    ui.textAlign(p.CENTER, p.CENTER);
                    ui.textSize(42);
                    ui.fill(255);
                    ui.text(`Game Over\nPress ${p.shared.controls.map.pause} for Menu`, 0, 0);
                    ui.pop();
                }
            });
        },

        cleanup() {
            this.Debug.log('level', "🧹 Game Over cleanup");
        },
    };
}