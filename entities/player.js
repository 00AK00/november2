import { BaseEntity } from '../core/BaseEntity.js';

export class Player extends BaseEntity {
    constructor(p) {
        super(p);
        this.speed = 3; // tiles per second
        // this.buoyancy = -0.04;
        // this.sinkancy = 0.1;
        this.buoyancy = -1;
        this.ambient_buoyancy = -0.05;
        this.sinkancy = 3;
        this.health = 100;
        this.moving = { moveLeft: false, moveRight: false, moveUp: false, moveDown: false, sink: false };
        this.size = 0.5; // in world units (tiles)
        this.pxSize = -1;
        this.mainPhysicsParticle = this.createPhysicsParticle(0, 0, 1, true, false);
        this.physicsParticles.push(this.mainPhysicsParticle);

        this.frond_particle_indexes = [];

        this.mainChild = this.mainPhysicsParticle.createChild(0, -0.4, 0.3);
        this.mainChild.springK = 0.6;
        this.mainChild.springDamping = 0.95;
        this.physicsParticles.push(this.mainChild);

        // 🌿 arrange fronds along an arc with child + grandchild chains
        const spread = 2.0;   // horizontal spacing
        const height = 0.6;   // how tall the arc is
        const fronds = [-spread, -spread / 2, 0, spread / 2, spread]; // five fronds
        // const fronds = [-spread, 0, spread]; // three fronds

        for (let i = 0; i < fronds.length; i++) {
            const x = fronds[i];
            const y = -0.5 - Math.sin((i / (fronds.length - 1)) * Math.PI) * height;
            const child = this.mainChild.createChild(x, y, 0.1);
            child.springK = 0.4;
            child.springDamping = 0.8;
            this.physicsParticles.push(child);
            this.frond_particle_indexes.push([0, 1, this.physicsParticles.length - 1]); // main, child, grandchild
        }
        this.mainPhysicsParticle.updateRadii(1, this.size);

        let i = 0;
        for (let particle of this.physicsParticles) {
            particle.label = `player_${i++}`;
        }
    }

    onActionStart(action) {
        if (this.moving[action] !== undefined) this.moving[action] = true;
        this.Debug?.log('player', `Started ${action}`);
    }

    onActionEnd(action) {
        if (this.moving[action] !== undefined) this.moving[action] = false;
        this.Debug?.log('player', `Ended ${action}`);
    }

    update(dt) {
        super.update(dt);

        const mp = this.mainPhysicsParticle;

        // horizontal
        if (this.moving.moveLeft && !this.moving.moveRight) mp.addForce(-this.speed, 0);
        else if (this.moving.moveRight && !this.moving.moveLeft) mp.addForce(this.speed, 0);

        // vertical buoyancy / sinking
        if (this.moving.sink) {
            mp.addForce(0, this.sinkancy);
        } else {
            mp.cascadeForce(0, this.buoyancy, 0.8);
        }

        for (const particle of this.physicsParticles) {
            if (!particle.main) {
                particle.addForce(0, this.ambient_buoyancy);
            }

        }

        this.worldPos.x = mp.pos.x;
        this.worldPos.y = mp.pos.y;
        this.pxSize = this.size * this.scene.mapTransform.tileSizePx;
    }
    draw(layer) {
        if (!this.visible || !this.scene) return;
        const { x, y } = this.scene.worldToScreen(this.worldPos);

        layer.noFill();
        const chroma = this.p.shared.chroma;
        const pc = chroma.player;
        layer.stroke(pc[0], pc[1], pc[2], pc[3]);
        layer.strokeWeight(4);

        for (const indexes of this.frond_particle_indexes) {
            const sp = this.scene.worldToScreen(this.physicsParticles[indexes[0]].pos); // start
            const mp = this.scene.worldToScreen(this.physicsParticles[indexes[1]].pos); // mid
            const ep = this.scene.worldToScreen(this.physicsParticles[indexes[2]].pos); // end

            // Direction from start to end
            const dx = ep.x - sp.x;
            const dy = ep.y - sp.y;

            // Length of frond (for curvature scaling)
            const len = Math.sqrt(dx * dx + dy * dy);

            // Perpendicular normal (dx,dy) rotated 90deg
            const nx = -dy / len;
            const ny = dx / len;

            // Bend amount — tune this for more/less curve
            const curvature = len * 0.25;  // 0.2–0.35 works well

            // Control points: mid ± perpendicular offset
            const c1 = { x: mp.x + nx * curvature, y: mp.y + ny * curvature };
            const c2 = { x: mp.x - nx * curvature, y: mp.y - ny * curvature };

            // Final Bézier draw
            layer.bezier(
                sp.x, sp.y,       // start
                c1.x, c1.y,       // control 1
                c2.x, c2.y,       // control 2
                ep.x, ep.y        // end
            );
        }


    }
}