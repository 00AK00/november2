export function loadLevel1(p) {
    return {
        Debug: p.shared.Debug,

        init() {
            this.Debug.log('level', "🎮 Level 1 started");
            const levels = p.shared.levels;
            const spawn = levels.level1.spawn || { x: 0, y: 0 };
            const player = p.shared.player;
            this.Debug.log('level', `Level 1 spawn point at (${spawn.x}, ${spawn.y})`);
            player.reset({ x: spawn.x, y: spawn.y });

            const r = p.shared.renderer;
            r.reset();
            r.deferShader('background', 'default');
            r.deferShader('world', 'default');
            r.setNoShader('entities');
            r.deferShader('ui', 'default');
        },

        onActionStart(action) {
            const player = p.shared.player;
            player?.onActionStart?.(action);
            if (action === "pause") p.shared.sceneManager.change("menu");
        },

        onActionEnd(action) {
            const player = p.shared.player;
            player?.onActionEnd?.(action);
        },

        onKeyPressed(key, keyCode) {
            if (p.keyIsPressed && p.key === 'l') {
                p.shared.sceneManager.change('gameover');
            }
        },

        update() {
            const r = p.shared.renderer;
            const player = p.shared.player;
            const dt = p.shared.timing.delta;
            if (player?.visible) player.update(dt);
            r.markDirty('entities');
            r.markDirty('ui');
        },

        draw() {
            const r = p.shared.renderer;
            const ui = p.shared.ui;
            const player = p.shared.player;

            r.use('default');

            r.drawScene(({ background, world, entities, ui: uiLayer }) => {
                background.background(50, 0, 200);
                if (player?.visible) {
                    player.draw(entities);
                }
                ui.draw(uiLayer);
            });
        },

        cleanup() {
            console.log("🧹 Level 1 cleanup");
            const player = p.shared.player;
            player.visible = false;
        },
    };
}