export class ParticleSystem {
    constructor(options = {}) {
        this.particles = [];
        this.count = options.count || 80;
        this.color = options.color || '#c8b07a';
        this.maxAlpha = options.maxAlpha || 0.3;
        this.speed = options.speed || 0.3;
        this.width = 0;
        this.height = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        if (this.particles.length === 0) {
            for (let i = 0; i < this.count; i++) {
                this.particles.push(this.createParticle());
            }
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * 2.5 + 0.8,
            alpha: Math.random() * this.maxAlpha,
            alphaDir: (Math.random() - 0.5) * 0.005,
            vx: (Math.random() - 0.5) * this.speed,
            vy: (Math.random() - 0.5) * this.speed - 0.1,
        };
    }

    update() {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha += p.alphaDir;

            if (p.alpha <= 0 || p.alpha >= this.maxAlpha) p.alphaDir *= -1;
            p.alpha = Math.max(0, Math.min(this.maxAlpha, p.alpha));

            if (p.x < -10 || p.x > this.width + 10 || p.y < -10 || p.y > this.height + 10) {
                Object.assign(p, this.createParticle());
                if (p.vy < 0) p.y = this.height + 5;
                else p.y = -5;
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
