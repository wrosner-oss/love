import { COLORS, VESSELS } from './constants.js';
import { getState } from './state.js';

// --- Simplex-like noise (lightweight 2D) ---
// Based on a simple hash-and-interpolate approach

const PERM = new Uint8Array(512);
for (let i = 0; i < 256; i++) PERM[i] = i;
for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [PERM[i], PERM[j]] = [PERM[j], PERM[i]];
}
for (let i = 0; i < 256; i++) PERM[i + 256] = PERM[i];

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function noise2D(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = PERM[PERM[xi] + yi];
    const ab = PERM[PERM[xi] + yi + 1];
    const ba = PERM[PERM[xi + 1] + yi];
    const bb = PERM[PERM[xi + 1] + yi + 1];

    return lerp(
        lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
        lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
        v
    );
}

function fbm(x, y, octaves = 3) {
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        val += amp * noise2D(x * freq, y * freq);
        amp *= 0.5;
        freq *= 2;
    }
    return val;
}

// --- Atmosphere ---

let time = 0;
let cx = 0;
let cy = 0;
let vesselRadius = 0;
let smoothAlignment = 0.5;

// Stream particles that flow between vessels
let streams = [];
const STREAM_COUNT = 30;

export function initAtmosphere(w, h) {
    cx = w / 2;
    cy = h / 2;
    vesselRadius = Math.min(w * 0.72, h * 0.68) * 0.5; // match elliptical vessel layout

    streams = [];
    for (let i = 0; i < STREAM_COUNT; i++) {
        streams.push(createStream(w, h));
    }
}

export function layoutAtmosphere(w, h) {
    cx = w / 2;
    cy = h / 2;
    vesselRadius = Math.min(w * 0.72, h * 0.68) * 0.5;
}

function createStream(w, h) {
    const angle = Math.random() * Math.PI * 2;
    const dist = vesselRadius * (0.7 + Math.random() * 0.8);
    return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        angle,
        speed: 0.2 + Math.random() * 0.4,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0,
        maxAlpha: 0.08 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        orbitDist: dist,
    };
}

function computeAlignment() {
    const state = getState();
    let totalDiff = 0, count = 0;
    for (const v of VESSELS) {
        const wes = state.wes?.[v.id] || 0;
        const amelia = state.amelia?.[v.id] || 0;
        if (wes > 0 && amelia > 0) {
            totalDiff += Math.abs(wes - amelia);
            count++;
        }
    }
    if (count === 0) return 0.5;
    return 1 - (totalDiff / (count * 4));
}

function computeAggregateIntensity() {
    const state = getState();
    let total = 0, count = 0;
    for (const v of VESSELS) {
        total += (state.wes?.[v.id] || 0) + (state.amelia?.[v.id] || 0);
        count += 2;
    }
    return total / (count * 5);
}

export function updateAtmosphere(dt) {
    time += dt;

    const targetAlign = computeAlignment();
    smoothAlignment += (targetAlign - smoothAlignment) * 0.02;

    // Update streams
    for (const s of streams) {
        s.angle += s.speed * 0.008;
        const wobble = fbm(s.angle * 0.5 + time * 0.1, s.phase, 2) * 30;
        s.x = cx + Math.cos(s.angle) * (s.orbitDist + wobble);
        s.y = cy + Math.sin(s.angle) * (s.orbitDist + wobble * 0.7);

        // Fade alpha with noise
        const nAlpha = (fbm(s.x * 0.005 + time * 0.05, s.y * 0.005, 2) + 1) * 0.5;
        s.alpha = s.maxAlpha * nAlpha;
    }
}

export function drawAtmosphere(ctx, w, h) {
    const alignment = smoothAlignment;
    const intensity = computeAggregateIntensity();

    // Flowing noise bands
    drawNoiseBands(ctx, w, h, alignment, intensity);

    // Stream particles
    drawStreams(ctx, alignment);
}

function drawNoiseBands(ctx, w, h, alignment, intensity) {
    // Very subtle flowing color bands in the outer region
    // Only draw if there's enough intensity to matter
    if (intensity < 0.05) return;

    const bandAlpha = 0.015 + intensity * 0.035;
    const step = 30; // pixel step for sampling

    for (let x = 0; x < w; x += step) {
        for (let y = 0; y < h; y += step) {
            // Skip the center area (where vessels live)
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const innerRadius = vesselRadius * 0.5;
            const outerRadius = Math.max(w, h) * 0.55;

            if (dist < innerRadius || dist > outerRadius) continue;

            // Noise value drives color and visibility
            const n = fbm(x * 0.003 + time * 0.03, y * 0.003 + time * 0.02, 3);

            if (n < -0.1) continue; // only draw positive noise regions

            const normalizedN = (n + 1) * 0.5; // 0-1

            // Color: gold when aligned, cool blue when dissonant
            const r = Math.round(lerp(100, 200, alignment) * normalizedN);
            const g = Math.round(lerp(120, 170, alignment) * normalizedN);
            const b = Math.round(lerp(180, 120, alignment) * normalizedN);

            // Fade out toward center and edges
            const edgeFade = 1 - Math.max(0, (dist - outerRadius * 0.7) / (outerRadius * 0.3));
            const centerFade = Math.min(1, (dist - innerRadius) / (vesselRadius * 0.4));
            const fade = edgeFade * centerFade;

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.globalAlpha = bandAlpha * normalizedN * fade;
            ctx.fillRect(x, y, step, step);
        }
    }
    ctx.globalAlpha = 1;
}

function drawStreams(ctx, alignment) {
    // Subtle energy motes orbiting in the space between vessels and screen edge
    const baseColor = alignment > 0.5 ? COLORS.gold : COLORS.luna.particle;

    for (const s of streams) {
        if (s.alpha < 0.01) continue;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = s.alpha;
        ctx.fill();

        // Faint glow
        if (s.size > 1) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
            ctx.globalAlpha = s.alpha * 0.15;
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}
