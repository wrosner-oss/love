import { COLORS, VESSELS } from './constants.js';
import { getState } from './state.js';

const SOL_COUNT = 100;
const LUNA_COUNT = 100;
let solParticles = [];
let lunaParticles = [];
let time = 0;
let cx = 0;
let cy = 0;
let radius = 60;
let smoothAlignment = 0.5;
let smoothIntensity = 0.2;

export function initConiunctio(w, h) {
    cx = w / 2;
    cy = h / 2;
    radius = Math.min(w, h) * 0.14;

    solParticles = [];
    lunaParticles = [];
    for (let i = 0; i < SOL_COUNT; i++) {
        solParticles.push(createParticle(1));
    }
    for (let i = 0; i < LUNA_COUNT; i++) {
        lunaParticles.push(createParticle(-1));
    }
}

export function layoutConiunctio(w, h) {
    cx = w / 2;
    cy = h / 2;
    radius = Math.min(w, h) * 0.14;
}

function createParticle(direction) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    return {
        angle,
        dist,
        baseSpeed: 0.15 + Math.random() * 0.4,
        size: 0.8 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        orbitEcc: 0.3 + Math.random() * 0.5, // how elliptical the orbit is
        direction,
        life: Math.random(), // for pulsing
        lifeSpeed: 0.3 + Math.random() * 0.5,
    };
}

function computeAlignment() {
    const state = getState();
    let totalDiff = 0;
    let count = 0;

    for (const v of VESSELS) {
        const wes = state.wes?.[v.id] || 0;
        const amelia = state.amelia?.[v.id] || 0;
        if (wes > 0 && amelia > 0) {
            totalDiff += Math.abs(wes - amelia);
            count++;
        }
    }

    if (count === 0) return 0.5;
    const maxDiff = count * 4;
    return 1 - (totalDiff / maxDiff);
}

function computeIntensity() {
    const state = getState();
    let total = 0;
    let count = 0;
    for (const v of VESSELS) {
        const wes = state.wes?.[v.id] || 0;
        const amelia = state.amelia?.[v.id] || 0;
        total += wes + amelia;
        if (wes > 0) count++;
        if (amelia > 0) count++;
    }
    if (count === 0) return 0.15;
    return 0.15 + (total / (count * 5)) * 0.85;
}

export function updateConiunctio(dt) {
    time += dt;

    // Smooth the alignment and intensity values
    const targetAlign = computeAlignment();
    const targetIntensity = computeIntensity();
    smoothAlignment += (targetAlign - smoothAlignment) * 0.03;
    smoothIntensity += (targetIntensity - smoothIntensity) * 0.03;

    const alignment = smoothAlignment;
    const intensity = smoothIntensity;
    const baseSpeed = 0.2 + intensity * 0.5;

    for (const p of solParticles) updateParticle(p, baseSpeed, alignment, intensity);
    for (const p of lunaParticles) updateParticle(p, baseSpeed, alignment, intensity);
}

function updateParticle(p, baseSpeed, alignment, intensity) {
    // Orbital speed — direction determines clockwise vs counter
    const speed = baseSpeed * p.baseSpeed * p.direction;

    // Chaos increases as alignment drops
    const chaos = (1 - alignment) * 0.6;

    p.angle += speed * 0.018;
    p.life += p.lifeSpeed * 0.02;

    // Wobble — higher when dissonant
    const wobbleX = Math.sin(time * 1.3 + p.phase) * chaos * radius * 0.5;
    const wobbleY = Math.cos(time * 0.9 + p.phase * 1.3) * chaos * radius * 0.4;

    // Orbit distance pulses
    const breathe = Math.sin(time * 0.6 + p.phase) * radius * 0.2 * intensity;
    const targetDist = p.dist + breathe;

    // Elliptical orbit
    const ex = Math.cos(p.angle) * targetDist;
    const ey = Math.sin(p.angle) * targetDist * p.orbitEcc;

    // When alignment is high, orbits converge to similar paths
    // When low, they spread out with independent wobble
    const convergeFactor = alignment * 0.4;
    p._x = cx + ex * (1 - convergeFactor) + wobbleX;
    p._y = cy + ey * (1 - convergeFactor) + wobbleY;

    // Size pulses with life
    p._alpha = (0.2 + intensity * 0.6) * (0.5 + Math.sin(p.life) * 0.5);
    p._size = p.size * (0.7 + intensity * 0.5);
}

export function drawConiunctio(ctx) {
    const alignment = smoothAlignment;
    const intensity = smoothIntensity;

    // Central glow — brighter when aligned and intense
    const glowR = radius * (0.6 + alignment * 0.6);
    const glowAlpha = 0.03 + alignment * intensity * 0.1;
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    centerGrad.addColorStop(0, `rgba(200, 176, 122, ${glowAlpha})`);
    centerGrad.addColorStop(0.5, `rgba(180, 160, 130, ${glowAlpha * 0.4})`);
    centerGrad.addColorStop(1, 'rgba(180, 160, 130, 0)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Draw connecting threads when aligned
    if (alignment > 0.3 && intensity > 0.2) {
        drawThreads(ctx, alignment, intensity);
    }

    // Solar particles
    drawParticleSet(ctx, solParticles, COLORS.sol, intensity);
    // Lunar particles
    drawParticleSet(ctx, lunaParticles, COLORS.luna, intensity);
}

function drawThreads(ctx, alignment, intensity) {
    // Faint lines connecting some sol and luna particles — visible when aligned
    const threadAlpha = (alignment - 0.3) * 0.15 * intensity;
    if (threadAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = threadAlpha;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 0.5;

    const step = Math.max(8, Math.floor(SOL_COUNT / 12));
    for (let i = 0; i < SOL_COUNT; i += step) {
        const s = solParticles[i];
        const l = lunaParticles[i % LUNA_COUNT];
        if (!s._x || !l._x) continue;

        ctx.beginPath();
        ctx.moveTo(s._x, s._y);
        // Curved thread through center
        const midX = cx + (Math.sin(time * 0.5 + i) * radius * 0.15);
        const midY = cy + (Math.cos(time * 0.7 + i) * radius * 0.1);
        ctx.quadraticCurveTo(midX, midY, l._x, l._y);
        ctx.stroke();
    }

    ctx.restore();
}

function drawParticleSet(ctx, particles, colors, intensity) {
    for (const p of particles) {
        if (!p._x) continue;

        const dist = Math.sqrt((p._x - cx) ** 2 + (p._y - cy) ** 2);
        const falloff = Math.max(0, 1 - dist / (radius * 2.5));
        const alpha = p._alpha * falloff;

        if (alpha < 0.01) continue;

        // Core particle
        ctx.beginPath();
        ctx.arc(p._x, p._y, p._size, 0, Math.PI * 2);
        ctx.fillStyle = colors.primary;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Soft glow on larger particles
        if (p._size > 1.5 && alpha > 0.1) {
            ctx.beginPath();
            ctx.arc(p._x, p._y, p._size * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = colors.glow;
            ctx.globalAlpha = alpha * 0.2;
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}
