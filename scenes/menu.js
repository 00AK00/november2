export function loadMenu(p) {
    return {
        Debug: p.shared.Debug,

        init() {
            this.Debug.log('level', "📜 Menu initialized");
            p.shared.ui.hide();
            const r = p.shared.renderer;
            const player = p.shared.player;
            player.deactivate();
            r.reset();
            r.deferShader('background', 'default');
            r.deferShader('world', 'default');
            r.setNoShader('entities');
            r.deferShader('ui', 'default');
        },

        onKeyPressed(key, keyCode) {
            this.Debug.log('level', `Key pressed in Menu: ${key} (${keyCode})`);
            p.shared.sceneManager.change('level1');
        },

        update() {
            const r = p.shared.renderer;
            // Menu rarely changes, but mark UI dirty for blinking text or animation
            r.markDirty('ui');
            r.markDirty('background');
        },

        draw() {
            const r = p.shared.renderer;
            r.use('default');

            r.drawScene(({ background, ui }) => {
                // Background layer
                if (r.layerDirty.background) {
                    background.background(0, 0, 80);
                }

                // UI layer (text)
                if (r.layerDirty.ui) {
                    ui.push();
                    ui.textAlign(p.CENTER, p.CENTER);
                    ui.textSize(42);
                    ui.fill(255);
                    ui.text("Main Menu\nPress any key to start", 0, 0);
                    ui.pop();
                }
            });
        },

        cleanup() {
            this.Debug.log('level', "🧹 Menu cleanup");
            p.shared.ui.show();
        },
    };
}