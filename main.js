import { createRenderer } from './core/renderer.js';
import { registerSystemEvents } from './core/system.js';
import { registerControls } from './core/controls.js';
import { loadMenu } from './scenes/menu.js';

export const mainSketch = (p) => {
    let testFont;

    p.preload = () => {
        // Load any built-in or custom font to satisfy WebGL text
        testFont = p.loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Regular.otf');
    };

    p.setup = () => {
        p.createCanvas(window.innerWidth, window.innerHeight, p.WEBGL);
        p.textFont(testFont);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(42);
        p.shared = {};
        p.shared.renderer = createRenderer(p);
        registerSystemEvents(p);
        registerControls(p);
        loadMenu(p);
    };

    p.draw = () => {
        p.background(0);
        const { renderer } = p.shared;
        renderer.drawScene(() => {
            if (p.activeScene?.draw) p.activeScene.draw(p);
        });
    };
};

new p5(mainSketch);