export class PhysicsParticle {
    constructor(x, y, mass = 1, main = false, fixed = false) {
        this.pos = { x, y };
        this.vel = { x: 0, y: 0 };
        this.mass = mass;
        this.main = main;
        this.fixed = fixed;
        this.offsets = { x: 0, y: 0 };
        this.worldUnitRadius = 0;
        this.radius = 1;
        this.force = { x: 0, y: 0 };
        this.damping = 0.95;
        this.children = [];
        this.springK = 0.2;
        this.springDamping = 0.85;
        this.contactAxes = { x: false, y: false };
        this.forceDamping = 0.0; // how much force leaks through blocked axes
        this.label = 0;
    }

    // --- NEW ---
    clearContacts() {
        this.contactAxes.x = false;
        this.contactAxes.y = false;
    }

    addForce(fx, fy) {
        if (this.fixed) return;

        // Respect contact constraints — block or dampen along contact axes
        const damp = this.forceDamping;
        if (this.contactAxes.x) fx *= damp;
        if (this.contactAxes.y) fy *= damp;

        this.force.x += fx;
        this.force.y += fy;
    }

    cascadeForce(fx, fy, decay = 0.5) {
        this.addForce(fx, fy);
        for (const child of this.children) {
            child.cascadeForce(fx * decay, fy * decay, decay);
        }
    }

    integrateWithoutChildren(dt) {
        this.integrate(dt, false);
    }

    integrate(dt, withChildren = true) {
        if (this.fixed) return;

        // --- apply Newtonian integration ---
        this.vel.x += (this.force.x / this.mass) * dt;
        this.vel.y += (this.force.y / this.mass) * dt;

        this.vel.x *= this.damping;
        this.vel.y *= this.damping;

        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;

        if (withChildren) {
            for (const child of this.children) {
                this.applySpringToChild(child, dt);
                child.integrate(dt);
            }
        }

        // Reset force after integration
        this.force.x = 0;
        this.force.y = 0;
    }

    applySpringToChild(child, dt) {
        const dx = child.pos.x - this.pos.x;
        const dy = child.pos.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const rest = child.restLength || Math.hypot(child.offsets.x, child.offsets.y);
        child.restLength = rest;

        const stretch = dist - rest;
        const k = this.springK;
        const forceMag = -k * stretch;

        const nx = dx / dist;
        const ny = dy / dist;

        // Spring + damping as before
        const dvx = child.vel.x - this.vel.x;
        const dvy = child.vel.y - this.vel.y;
        const relVel = dvx * nx + dvy * ny;
        const c = this.springDamping;
        const dampingForce = -c * relVel;

        let fx = (forceMag + dampingForce) * nx;
        let fy = (forceMag + dampingForce) * ny;

        // Respect contact axes
        const damp = this.forceDamping;
        fx = this.contactAxes.x ? fx * damp : fx;
        fy = this.contactAxes.y ? fy * damp : fy;

        child.addForce(fx, fy);
        this.addForce(-fx, -fy);

        // --- Positional correction / snapback ---
        const targetX = this.pos.x + child.offsets.x;
        const targetY = this.pos.y + child.offsets.y;
        const memDX = targetX - child.pos.x;
        const memDY = targetY - child.pos.y;

        const distFromTarget = Math.sqrt(memDX * memDX + memDY * memDY);

        if (distFromTarget > rest * 1.3) {
            // Hard correction if too far (25% tolerance)
            const snapK = 0.8; // strong tether
            child.pos.x += memDX * snapK * dt;
            child.pos.y += memDY * snapK * dt;
            child.vel.x *= 0.8;
            child.vel.y *= 0.8;
        } else {
            // Gentle memory tether when close
            const memK = 0.15;
            child.addForce(memDX * memK, memDY * memK);
        }
    }

    createChild(offsetX, offsetY, scale = 0.5) {
        const child = new PhysicsParticle(
            this.pos.x + offsetX,
            this.pos.y + offsetY,
            this.mass * scale
        );

        child.offsets = { x: offsetX, y: offsetY };  // NOT divided
        child.restLength = Math.hypot(offsetX, offsetY);
        child.radius = this.radius * scale;

        this.children.push(child);
        return child;
    }

    updateRadii(circumference, parent_size, decay = 0.8) {
        this.radius = circumference / 2;
        this.worldUnitRadius = this.radius * parent_size;
        for (const child of this.children) {
            child.updateRadii(circumference * decay, parent_size);
        }
    }
}