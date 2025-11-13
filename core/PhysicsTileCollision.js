export class PhysicsTileCollision {
    constructor(scene) {
        this.scene = scene;
    }

    checkCollisions() {
        for (const e of this.entities) {
            for (const particle of e.physicsParticles) {
                this.resolveTileCollisions(particle);
            }
            // TODO: this.resolveEntityCollisions(e);
        }
    }

    resolveTileCollisions(particle) {
        const r = particle.worldUnitRadius;
        const { x, y } = particle.pos;

        // Look up tile indices near the particle
        const tx = Math.floor(x);
        const ty = Math.floor(y);

        // Check 4 neighboring tiles for solidity
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const tile = this.getTile(tx + dx, ty + dy);
                if (tile && tile.solid) {
                    this.resolveParticleTileOverlap(particle, tx + dx, ty + dy, r);
                }
            }
        }
    }

    resolveParticleTileOverlap(particle, tileX, tileY, radius) {
        const tileCenterX = tileX + 0.5;
        const tileCenterY = tileY + 0.5;
        const halfSize = 0.5; // assuming tiles are 1×1 world units

        // Simple AABB overlap test
        const dx = particle.pos.x - tileCenterX;
        const px = (halfSize + radius) - Math.abs(dx);
        if (px <= 0) return; // no overlap

        const dy = particle.pos.y - tileCenterY;
        const py = (halfSize + radius) - Math.abs(dy);
        if (py <= 0) return; // no overlap

        // Smallest overlap wins
        if (px < py) {
            // particle.pos.x += dx < 0 ? -px : px;
            // particle.vel.x = 0;

            const push = dx < 0 ? -px : px;
            particle.pos.x += push;
            // particle.vel.x = -particle.vel.x * this.restitution;

            const sign = dx < 0 ? -1 : 1;
            particle.addForce(sign * px * this.restitution, 0);
            particle.contactAxes.x = true;

        } else {
            // particle.pos.y += dy < 0 ? -py : py;
            // particle.vel.y = 0;

            const push = dy < 0 ? -py : py;
            particle.pos.y += push;
            // particle.vel.y = -particle.vel.y * this.restitution;

            const sign = dy < 0 ? -1 : 1;
            particle.addForce(0, sign * py * this.restitution);
            particle.contactAxes.y = true;
        }
    }
}