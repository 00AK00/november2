import { BaseEntity } from '../core/BaseEntity.js';

const BODY_RADIUS = 0.4;
const BODY_MASS = 0.5;

// planktons are single particle animals that float in open water

export class Plankton extends BaseEntity {
    constructor(p) {
        super(p);

        this.size = 0.1;
        this.speed = p.shared.settings.ambientSpeed;
        this.sinkancy = p.shared.settings.ambientSinkancy;
        this.baseBuoyancy = p.shared.settings.ambientBuoyancy;
        this.restlessness = p.random() * 3 + 1;

        this.mainPhysicsParticle = this.createPhysicsParticle(
            0, 0,      // x,y
            1,         // mass
            true,      // main
            false      // fixed
        );

        this.mainPhysicsParticle.updateRadii(BODY_RADIUS, this.size);
        this.mainPhysicsParticle.addForce(this.p.random(-1, 1) * this.speed, this.p.random(-1, 1) * this.speed);

        const root = this.mainPhysicsParticle;
        root.mass = BODY_MASS;
    }

    initAmbientEntity() {
        if (!this.scene || !this.scene.levelData) return;

        const { cols, rows } = this.scene.levelData;

        let tries = 0;
        const maxTries = 200;

        while (tries++ < maxTries) {
            const x = Math.floor(Math.random() * cols);
            const y = Math.floor(Math.random() * rows);

            const tile = this.scene.getTile(x, y);

            // open water: NOT solid, NOT boundary
            if (!tile || !tile.solid) {
                // use center of tile
                this.worldPos.x = x + 0.5;
                this.worldPos.y = y + 0.5;
                this.visible = true;

                // set physics particle position
                if (this.mainPhysicsParticle) {
                    const mp = this.mainPhysicsParticle;
                    mp.pos.x = this.worldPos.x;
                    mp.pos.y = this.worldPos.y;
                    mp.prevPos.x = this.worldPos.x;
                    mp.prevPos.y = this.worldPos.y;
                }

                return;
            }
        }

        console.warn("⚠️ Plankton could not find valid spawn after many tries");
    }

    onActionStart(action) {
        if (this.moving[action] !== undefined) this.moving[action] = true;
        this.Debug?.log('player', `Started ${action}`);
    }

    onActionEnd(action) {
        if (this.moving[action] !== undefined) this.moving[action] = false;
        this.Debug?.log('player', `Ended ${action}`);
    }

    applyForces(dt) {
        super.applyForces(dt);
        const mp = this.mainPhysicsParticle;

        if (this.p.shared.timing.every(this.restlessness)) {
            mp.addForce(this.p.random(-this.speed, this.speed), this.p.random(-this.speed, this.speed));

            this.baseBuoyancy = -1 * this.baseBuoyancy;
        }

        // wall escape
        const tile = this.scene.getTile(
            Math.floor(mp.pos.x),
            Math.floor(mp.pos.y)
        );

        if (tile && tile.solid) {
            const awayX = mp.pos.x - (Math.floor(mp.pos.x) + 0.5);
            const awayY = mp.pos.y - (Math.floor(mp.pos.y) + 0.5);

            const mag = 0.5; // extremely gentle push-off
            mp.addForce(awayX * mag, awayY * mag);
        }

        // Brownian drift (tiny turbulence always)
        mp.addForce(
            this.p.random(-0.2, 0.2),
            this.p.random(-0.2, 0.2)
        );

        if (!mp) return;
    }

    postPhysics() {
        const mp = this.mainPhysicsParticle;
        if (!mp) return;
        this.worldPos.x = mp.pos.x;
        this.worldPos.y = mp.pos.y;
        this.pxSize = this.size * this.scene.mapTransform.tileSizePx;
    }

    draw(layer) {
        if (!this.visible || !this.scene) return;
        const { x, y } = this.scene.worldToScreen(this.worldPos);
        layer.fill(this.p.shared.chroma.ambient);
        layer.noStroke();
        layer.circle(x, y, this.pxSize);
    }
}