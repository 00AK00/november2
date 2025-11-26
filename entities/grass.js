import { BaseEntity } from '../core/BaseEntity.js';

const ROOT_RADIUS = 0.4;
const ROOT_MASS = 2;
const STEM_SEG_LENGTH = 1.5;
const SPRING_K = .15;
const SPRING_DAMP = 100.29;
const STEM_MASS = 20;
const SOFT_FACTOR = 0.15;

// grass is a type of vegetation that grows in shallow water

export class Grass extends BaseEntity {
    constructor(p, config) {
        super(p);

        this.size = 0.1;
        this.speed = p.shared.settings.ambientSpeed;
        this.sinkancy = p.shared.settings.ambientSinkancy;
        this.baseBuoyancy = p.shared.settings.ambientBuoyancy;
        this.color = p.shared.chroma.ambient;
        this.x = config.x + Math.random() * 0.5;
        this.y = config.y + 1;
        this.worldPos.x = this.x;
        this.worldPos.y = this.y;
        this.visible = true;
        this.direction = config.direction || "up";
        this.bladeWidth = 0.002 + p.random() * 0.002;
        this.bladeHeight = 0.75 + p.random() * 0.5;
        this.left = Math.random() < 0.5;
        this.curve = 0.2 + 0.2 * Math.random();

        this.mainPhysicsParticle = this.createPhysicsParticle(
            this.x, this.y,      // x,y
            1,         // mass
            true,      // main
            false      // fixed
        );

        this.mainPhysicsParticle.updateRadii(ROOT_RADIUS, this.size);
        this.mainPhysicsParticle.addForce(this.p.random(-1, 1) * this.speed, this.p.random(-1, 1) * this.speed);

        const root = this.mainPhysicsParticle;
        root.mass = ROOT_MASS;
        root.collider = false;
        // root.springRestoringForce = true;

        switch (this.direction) {
            case "up":
                let dx = STEM_SEG_LENGTH * (0.5 + Math.random() * 0.5);
                if (this.left) {
                    dx = -dx;
                }
                const stemHeightratio = 0.25 + Math.random() * 0.125;
                const stem1 = root.createChild(dx, this.bladeHeight * -STEM_SEG_LENGTH * stemHeightratio);
                stem1.springK = 0.4;
                stem1.springDamping = 15;
                stem1.mass = 2;
                stem1.updateRadii(ROOT_RADIUS, this.size);
                stem1.softFactor = SOFT_FACTOR;
                stem1.maxStretch = STEM_SEG_LENGTH;
                stem1.collider = false;
                stem1.forceScale = 0.5;
                this.physicsParticles.push(stem1);

                const stem2 = stem1.createChild(-dx, this.bladeHeight * -STEM_SEG_LENGTH * stemHeightratio * 2);
                stem2.springK = 0.2;
                stem2.springDamping = 8;
                stem2.mass = 1.5;
                stem2.updateRadii(ROOT_RADIUS, this.size);
                stem2.softFactor = SOFT_FACTOR;
                stem2.maxStretch = STEM_SEG_LENGTH;
                stem2.collider = false;
                stem2.forceScale = 0.9;
                this.physicsParticles.push(stem2);


                const tip = stem2.createChild(0, this.bladeHeight * -STEM_SEG_LENGTH);
                tip.springK = 0.08;
                tip.springDamping = 4;
                tip.mass = 0.3;
                tip.updateRadii(ROOT_RADIUS, this.size);
                tip.softFactor = 0.01;
                tip.collider = false;
                // tip.springRestoringForce = true;
                tip.maxStretch = STEM_SEG_LENGTH * 1.1;
                tip.forceScale = 1.3;
                this.physicsParticles.push(tip);
                break;
        }

    }

    cleanup() {
        super.cleanup();
    }

    applyForces(dt) {
        super.applyForces(dt);

        const mp = this.mainPhysicsParticle;
        if (!mp) return;

        const idleYOsc = this.p.shared.timing.getOsc(0, 5, 1000);
        const idleXOsc = this.p.shared.timing.getOsc(0, 5, 1200);
        // mp.addForce(0, idleYOsc);
        for (const c of mp.children) {
            c.cascadeForce(idleXOsc, idleYOsc, .1);
        }
    }

    onCurrent(particle, current) {
        if (current.levelDefinitionCurrent) {
            const mult = 0.1;//= this.p.shared.timing.getOsc(0.5, 0.5, 1000);
            particle.addForce(current.dx * mult, current.dy * mult);
            for (const c of particle.children) {
                const fs = c.forceScale || 1.0;
                c.cascadeForce(current.dx * fs, current.dy * fs, fs);
            }
        }
    }

    postPhysics() {
        const mp = this.mainPhysicsParticle;
        if (!mp) return;
        // this.worldPos.x = mp.pos.x;
        // this.worldPos.y = mp.pos.y;
        mp.pos.x = this.worldPos.x;
        mp.pos.y = this.worldPos.y;
        this.pxSize = this.size * this.scene.mapTransform.tileSizePx;
    }

    draw(layer, texture) {
        if (!this.visible || !this.scene) return;

        const strokeW = this.bladeWidth * layer.width || 4;

        // base colors
        layer.noFill();
        layer.stroke(this.color);
        layer.strokeWeight(strokeW);

        texture.noFill();
        texture.stroke(25, 100, 25);
        texture.strokeWeight(strokeW * 4);

        // bezier helpers
        function bezierPoint(p0, p1, p2, p3, t) {
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;
            return {
                x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
                y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
            };
        }

        function bezierTangent(p0, p1, p2, p3, t) {
            const u = 1 - t;
            return {
                x: -3*u*u*p0.x + 3*(u*u - 2*u*t)*p1.x + 3*(2*u*t - t*t)*p2.x + 3*t*t*p3.x,
                y: -3*u*u*p0.y + 3*(u*u - 2*u*t)*p1.y + 3*(2*u*t - t*t)*p2.y + 3*t*t*p3.y
            };
        }

        // worldToScreen mapping for control points
        let root = this.scene.worldToScreen(this.physicsParticles[0].pos);
        let m1   = this.scene.worldToScreen(this.physicsParticles[1].pos);
        let m2   = this.scene.worldToScreen(this.physicsParticles[2].pos);
        let tip  = this.scene.worldToScreen(this.physicsParticles[3].pos);

        // oscillation parameters
        const N = 20;
        const wiggleAmp = 4;       // px displacement
        const wiggleFreq = 1;      // Hz
        const time = this.p.millis() * 0.001;

        // primary layer
        layer.beginShape();
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const pos = bezierPoint(root, m1, m2, tip, t);
            const tan = bezierTangent(root, m1, m2, tip, t);

            const mag = Math.hypot(tan.x, tan.y) || 1;
            const nx = -tan.y / mag;
            const ny = tan.x / mag;
            const spatialFreq = 24.0;

            const phase = (t * spatialFreq) + (time * wiggleFreq * Math.PI * 2);
            const disp = Math.sin(phase) * wiggleAmp;

            layer.vertex(pos.x + nx * disp, pos.y + ny * disp);
        }
        layer.endShape();

        // texture layer (matching shape)
        texture.beginShape();
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const pos = bezierPoint(root, m1, m2, tip, t);
            const tan = bezierTangent(root, m1, m2, tip, t);

            const mag = Math.hypot(tan.x, tan.y) || 1;
            const nx = -tan.y / mag;
            const ny = tan.x / mag;

            const phase = (t * 6.0) + (time * wiggleFreq * Math.PI * 2);
            const disp = Math.sin(phase) * wiggleAmp * 1.5;

            texture.vertex(pos.x + nx * disp, pos.y + ny * disp);
        }
        texture.endShape();

        // texture.fill(255, 0, 255);
        // texture.noStroke();

        // texture.circle(root.x, root.y,10);
        // texture.circle(m1.x, m1.y, 10);
        // texture.circle(m2.x, m2.y, 10);
        // texture.circle(tip.x, tip.y, 10);

        // layer.fill(this.color);

        // layer.circle(root.x, root.y, 10);
        // layer.circle(m1.x, m1.y, 10);
        // layer.circle(m2.x, m2.y, 10);
        // layer.circle(tip.x, tip.y, 10);

    }
}