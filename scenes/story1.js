import { BaseScene } from '../core/BaseScene.js';
import { WobbleText } from '../components/WobbleText.js';
import { MyButton } from '../components/myButton.js';

export class ArtSceneOne extends BaseScene {
    constructor(p) {
        super(p);
        this.counter = 0;
        this.title = null;
        this.fullScreenArt = {};
        this.fullScreenArt['scene1'] = [p.shared.assets.storyAssets['bg1'], p.shared.assets.storyAssets['bg2'], p.shared.assets.storyAssets['bg3']];
        // i want the transparent one to zoom in and out over the solid one
        this.fullScreenArt['scene2'] = [p.shared.assets.storyAssets['bgStorm'], p.shared.assets.storyAssets['bgStormTrans']];
        this.sprites = {};
        this.sprites['scene1'] = {
            pink: p.shared.assets.storyAssets['ssheetPink'],
            yellow: p.shared.assets.storyAssets['ssheetYellow'],
            pinkPosition: { x: 0.8, y: 0.8 },
            yellowPosition: { x: 0.6, y: 0.8 }
        };
        // these sprites are different drawing variants in each frame, rather than a continuous animation

        this.sprites['scene2'] = {
            lightening: p.shared.assets.storyAssets['ssheetLightening'], // 2 rows, 3 pre row
            waves: p.shared.assets.storyAssets['ssheetWaves'], // 2 rows of 2
        };
        this.lightningInstances = [];
        this.waveInstances = [];
        this.yellowExit = null;
        this.waveInstances3 = [];
    }

    init() {
        
        super.init();
        this.p.shared.ui.hide();
        const r = this.renderer;
        const player = this.p.shared.player;
        player.deactivate();
        r.reset();
        this.startFrame = this.p.frameCount;
        this.counter = 0;
        const Lcount = 3;
        this.lightningInstances = Array.from({ length: Lcount }, (_, i) => {
            const baseX = ((i + 0.5) / Lcount) * this.p.width;
            const jitterX = (Math.random() - 0.5) * (this.p.width * 0.1);
            return {
                x: baseX + jitterX,
                y: this.p.height * 0.1 + Math.random() * (this.p.height * 0.3),
                frameOffset: Math.floor(Math.random() * 60)
            };
        });
        const Wcount = 5;
        this.waveInstances = Array.from({ length: Wcount }, (_, i) => {
            const baseX = ((i + 0.5) / Wcount) * this.p.width;
            const jitterX = (Math.random() - 0.5) * (this.p.width * 0.1);
            return {
                x: baseX + jitterX,
                y: this.p.height * 0.6 + Math.random() * (this.p.height * 0.25),
                speed: -0.2 + Math.random() * 0.4,
                frameOffset: Math.floor(Math.random() * 40)
            };
        });
        this.yellowExit = {
            x: this.p.width * this.sprites['scene1'].yellowPosition.x,
            y: this.p.height * this.sprites['scene1'].yellowPosition.y,
            vx: -this.p.width * 0.003,
            vy: -this.p.height * 0.003,
            rotation: 0
        };
        const W3count = 6;
        this.waveInstances3 = Array.from({ length: W3count }, () => ({
            x: Math.random() * this.p.width,
            y: Math.random() * this.p.height,
            vx: -1.0 - Math.random() * 0.5,
            vy: -0.5 - Math.random() * 0.3,
            frameOffset: Math.floor(Math.random() * 40)
        }));
    }


    // onKeyPressed(key, keyCode) {
    //     super.onKeyPressed(key, keyCode);
    //     this.p.shared.sceneManager.change('test');
    // }

    update() {
        const r = this.renderer;
        if (this.recentlyLaunchedScene || this.recentlyChangedScene) {
            r.markDirty('backgroundLayer');
            r.markDirty('uiLayer');
        }
        r.markDirty('entitiesLayer');
    }

    draw() {
        const r = this.renderer;
        const layers = r.layers;
        const entitiesLayer = layers.entitiesLayer;
        const textureLayer = layers.ambientTexture;
        const localFrame = this.p.frameCount - this.startFrame;
        this.counter = Math.floor(localFrame / 30);
        r.drawScene(() => {
            super.draw();
            if (this.counter < 3) {
                this.sceneOne(entitiesLayer, textureLayer);
            } else if (this.counter < 5) {
                this.sceneTwo(entitiesLayer, textureLayer);
            } else if (this.counter < 10) {
                this.sceneThree(entitiesLayer, textureLayer);
            } else {
                this.p.shared.sceneManager.change('level1level');
            }
        });
    }

    sceneTwo(entitiesLayer, textureLayer) {
        entitiesLayer.background(this.p.shared.chroma.ambient);
        textureLayer.imageMode(this.p.CENTER);
        const bgImages = this.fullScreenArt['scene2'];
        const solidBg = bgImages[0];
        const transBg = bgImages[1];
        textureLayer.image(solidBg, this.p.width / 2, this.p.height / 2, this.p.width, this.p.height);

        // zooming transparent layer
        const scaleFactor = 1 + 0.05 * Math.sin(this.p.frameCount * 0.05);
        textureLayer.push();
        textureLayer.translate(this.p.width / 2, this.p.height / 2);
        textureLayer.scale(scaleFactor);
        textureLayer.imageMode(this.p.CENTER);
        textureLayer.image(transBg, 0, 0, this.p.width, this.p.height);
        textureLayer.pop();

        const lighteningSheet = this.sprites['scene2'].lightening;
        const lFrameWidth = lighteningSheet.width / 3;
        const lFrameHeight = lighteningSheet.height / 2;
        for (const L of this.lightningInstances) {
            const lCycle = Math.floor((this.p.frameCount + L.frameOffset) / 5);
            const lFrameIdx = lCycle % 6;
            const lRow = Math.floor(lFrameIdx / 3);
            const lCol = lFrameIdx % 3;
            textureLayer.imageMode(this.p.CENTER);
            textureLayer.image(
                lighteningSheet,
                L.x,
                L.y,
                lFrameWidth,
                lFrameHeight,
                lCol * lFrameWidth,
                lRow * lFrameHeight,
                lFrameWidth,
                lFrameHeight
            );
        }

        const wavesSheet = this.sprites['scene2'].waves;
        const wFrameWidth = wavesSheet.width / 2;
        const wFrameHeight = wavesSheet.height / 2;
        for (const W of this.waveInstances) {
            const wCycle = Math.floor((this.p.frameCount + W.frameOffset) / 10);
            const wFrameIdx = wCycle % 4;
            const wRow = Math.floor(wFrameIdx / 2);
            const wCol = wFrameIdx % 2;
            textureLayer.imageMode(this.p.CENTER);
            textureLayer.image(
                wavesSheet,
                W.x,
                W.y,
                wFrameWidth,
                wFrameHeight,
                wCol * wFrameWidth,
                wRow * wFrameHeight,
                wFrameWidth,
                wFrameHeight
            );
            W.x += W.speed;
            if (W.x > this.p.width + 50) W.x = -50;
        }
    }

    sceneOne(entitiesLayer, textureLayer) {
        entitiesLayer.background(this.p.shared.chroma.ambient);
        textureLayer.imageMode(this.p.CENTER);
        const bgImages = this.fullScreenArt['scene1'];
        const N = bgImages.length;
        const cycle = Math.floor(this.p.frameCount / 30);
        const idx = cycle % (2 * (N - 1));
        const pingPong = idx < N ? idx : (2 * (N - 1) - idx);
        const bgImage = bgImages[pingPong];
        textureLayer.image(bgImage, this.p.width / 2, this.p.height / 2, this.p.width, this.p.height);

        // on top of texture
        const spriteSheet = this.sprites['scene1'].pink;
        const frameWidth = spriteSheet.width / 3;
        const frameHeight = spriteSheet.height;
        const animCycle = Math.floor(this.p.frameCount / 10);
        const pingIdx = animCycle % (2 * (3 - 1));
        const frameIdx = pingIdx < 3 ? pingIdx : (2 * (3 - 1) - pingIdx);
        textureLayer.imageMode(this.p.CENTER);
        textureLayer.image(spriteSheet, this.p.width * this.sprites['scene1'].pinkPosition.x, this.p.height * this.sprites['scene1'].pinkPosition.y, frameWidth, frameHeight, frameIdx * frameWidth, 0, frameWidth, frameHeight);

        const yellowSheet = this.sprites['scene1'].yellow;
        const yFrameWidth = yellowSheet.width / 3;
        const yFrameHeight = yellowSheet.height;
        const yCycle = Math.floor(this.p.frameCount / 10);
        const yPing = yCycle % (2 * (3 - 1));
        const yAnim = yPing < 3 ? yPing : (2 * (3 - 1) - yPing);
        textureLayer.imageMode(this.p.CENTER);
        textureLayer.image(
            yellowSheet,
            this.p.width * this.sprites['scene1'].yellowPosition.x,
            this.p.height * this.sprites['scene1'].yellowPosition.y,
            yFrameWidth,
            yFrameHeight,
            yAnim * yFrameWidth,
            0,
            yFrameWidth,
            yFrameHeight
        );
    }

    sceneThree(entitiesLayer, textureLayer) {
        entitiesLayer.background(this.p.shared.chroma.ambient);
        textureLayer.imageMode(this.p.CENTER);

        const bgImages = this.fullScreenArt['scene1'];
        const N = bgImages.length;
        const cycle = Math.floor(this.p.frameCount / 30);
        const idx = cycle % (2 * (N - 1));
        const pingPong = idx < N ? idx : (2 * (N - 1) - idx);
        const bgImage = bgImages[pingPong];
        textureLayer.image(bgImage, this.p.width / 2, this.p.height / 2, this.p.width, this.p.height);

        const pinkSheet = this.sprites['scene1'].pink;
        const pw = pinkSheet.width / 3;
        const ph = pinkSheet.height;
        const animCycle = Math.floor(this.p.frameCount / 10);
        const pingIdx = animCycle % (2 * (3 - 1));
        const frameIdx = pingIdx < 3 ? pingIdx : (2 * (3 - 1) - pingIdx);
        textureLayer.image(
            pinkSheet,
            this.p.width * this.sprites['scene1'].pinkPosition.x,
            this.p.height * this.sprites['scene1'].pinkPosition.y,
            pw,
            ph,
            frameIdx * pw,
            0,
            pw,
            ph
        );

        this.yellowExit.x += this.yellowExit.vx;
        this.yellowExit.y += this.yellowExit.vy;
        this.yellowExit.rotation += 0.02;

        textureLayer.push();
        textureLayer.translate(this.yellowExit.x, this.yellowExit.y);
        textureLayer.rotate(this.yellowExit.rotation);

        const yellowSheet = this.sprites['scene1'].yellow;
        const yw = yellowSheet.width / 3;
        const yh = yellowSheet.height;
        textureLayer.image(
            yellowSheet,
            0, 0,
            yw, yh,
            0, 0, yw, yh
        );
        textureLayer.pop();

        const wavesSheet = this.sprites['scene2'].waves;
        const ww = wavesSheet.width / 2;
        const wh = wavesSheet.height / 2;

        for (const W of this.waveInstances3) {
            const wCycle = Math.floor((this.p.frameCount + W.frameOffset) / 10);
            const wFrameIdx = wCycle % 4;
            const wRow = Math.floor(wFrameIdx / 2);
            const wCol = wFrameIdx % 2;

            textureLayer.image(
                wavesSheet,
                W.x,
                W.y,
                ww,
                wh,
                wCol * ww,
                wRow * wh,
                ww,
                wh
            );

            W.x += W.vx;
            W.y += W.vy;
        }
    }

    sceneFour(entitiesLayer, textureLayer) {
        entitiesLayer.background(this.p.shared.chroma.ambient);
        textureLayer.imageMode(this.p.CENTER);
        const bgImages = this.fullScreenArt['scene1'];
        const N = bgImages.length;
        const cycle = Math.floor(this.p.frameCount / 30);
        const idx = cycle % (2 * (N - 1));
        const pingPong = idx < N ? idx : (2 * (N - 1) - idx);
        const bgImage = bgImages[pingPong];
        textureLayer.image(bgImage, this.p.width / 2, this.p.height / 2, this.p.width, this.p.height);

        // on top of texture
        const spriteSheet = this.sprites['scene1'].pink;
        const frameWidth = spriteSheet.width / 3;
        const frameHeight = spriteSheet.height;
        const animCycle = Math.floor(this.p.frameCount / 10);
        const pingIdx = animCycle % (2 * (3 - 1));
        const frameIdx = pingIdx < 3 ? pingIdx : (2 * (3 - 1) - pingIdx);
        textureLayer.imageMode(this.p.CENTER);
        textureLayer.image(spriteSheet, this.p.width * this.sprites['scene1'].pinkPosition.x, this.p.height * this.sprites['scene1'].pinkPosition.y, frameWidth, frameHeight, frameIdx * frameWidth, 0, frameWidth, frameHeight);
    }

    cleanup() {
        this.Debug.log('level', "🧹 Story cleanup");
        this.p.shared.ui.show();
        super.cleanup();
        this.renderer.layers.entitiesLayer.clear();
        this.counter = 0;
    }
}