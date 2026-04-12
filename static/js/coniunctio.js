import { COLORS, VESSELS } from './constants.js';
import { getState, getPerson, onAdjustment } from './state.js';
import { playBurst } from './sound.js';

// --- Config ---
const SOL_COUNT = 150;
const LUNA_COUNT = 150;
const BURST_PARTICLE_MAX = 40;

// --- State ---
let solParticles = [];
let lunaParticles = [];
let burstParticles = [];
let ripples = [];
let time = 0;
let cx = 0;
let cy = 0;
let radius = 60;
let smoothAlignment = 0.5;
let smoothIntensity = 0.2;

// Event-driven drama state
let turbulence = 0;
let turbulenceDecay = 0;
let flashAlpha = 0;
let flashColor = COLORS.sol.glow;
let accelBoost = 0;

// Easter egg — the percentage
let percentageAlpha = 0;
let percentageValue = 0;

// --- Midjourney Video States ---
const STATE_NAMES = ['dormant', 'searching', 'balanced', 'harmonious'];
let stateVideos = {};
let videosLoaded = false;
// Smooth blend weights for each state (0-1)
let stateWeights = { dormant: 1, searching: 0, balanced: 0, harmonious: 0 };
let targetWeights = { dormant: 1, searching: 0, balanced: 0, harmonious: 0 };

function loadStateVideos() {
    let loaded = 0;
    for (const name of STATE_NAMES) {
        const video = document.createElement('video');
        video.src = `/static/images/coniunctio-${name}.mp4`;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.style.display = 'none';
        document.body.appendChild(video);
        video.addEventListener('canplaythrough', () => {
            loaded++;
            if (loaded >= STATE_NAMES.length) videosLoaded = true;
            video.play().catch(() => {});
        }, { once: true });
        video.load();
        stateVideos[name] = video;
    }
    setTimeout(() => {
        videosLoaded = true;
        for (const name of STATE_NAMES) {
            const v = stateVideos[name];
            if (v && v.paused) v.play().catch(() => {});
        }
    }, 3000);
}

export function initConiunctio(w, h) {
    cx = w / 2;
    cy = h / 2;
    radius = Math.min(w, h) * 0.22;

    solParticles = [];
    lunaParticles = [];
    burstParticles = [];
    ripples = [];
    for (let i = 0; i < SOL_COUNT; i++) solParticles.push(createParticle(1));
    for (let i = 0; i < LUNA_COUNT; i++) lunaParticles.push(createParticle(-1));

    loadStateVideos();

    onAdjustment((event) => {
        const color = event.person === 'wes' ? COLORS.sol.glow : COLORS.luna.glow;
        triggerEvent(event.magnitude, color);
        playBurst(event.magnitude);
    });
}

export function layoutConiunctio(w, h) {
    cx = w / 2;
    cy = h / 2;
    radius = Math.min(w, h) * 0.22;
}

function createParticle(direction) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    return {
        angle, dist, baseDist: dist,
        baseSpeed: 0.12 + Math.random() * 0.45,
        size: 0.6 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
        orbitEcc: 0.3 + Math.random() * 0.5,
        direction,
        life: Math.random(),
        lifeSpeed: 0.3 + Math.random() * 0.5,
        trail: [],
        scatterX: 0, scatterY: 0,
        _x: 0, _y: 0, _alpha: 0, _size: 0,
    };
}

function createBurstParticle(color) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 3,
        alpha: 0.6 + Math.random() * 0.4,
        color, life: 1.0, decay: 0.3 + Math.random() * 0.4,
    };
}

// --- Event System ---

// --- Easter Egg: The Percentage ---

function computePercentage() {
    const state = getState();
    let totalScore = 0;
    let maxScore = 0;

    for (const v of VESSELS) {
        const wes = state.wes?.[v.id] || 0;
        const amelia = state.amelia?.[v.id] || 0;
        if (wes > 0 || amelia > 0) {
            // Both contributing + alignment = higher score
            const avg = (wes + amelia) / 2;
            const alignment = wes > 0 && amelia > 0 ? 1 - Math.abs(wes - amelia) / 4 : 0;
            totalScore += (avg / 5) * 0.5 + alignment * 0.5;
            maxScore += 1;
        }
    }

    if (maxScore === 0) return 7; // ;) the starting point
    return Math.round((totalScore / maxScore) * 100);
}

export function handleConiunctioClick(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    if (Math.sqrt(dx * dx + dy * dy) < radius * 0.8) {
        percentageValue = computePercentage();
        percentageAlpha = 1.0;
        return true;
    }
    return false;
}

export function getConiunctioCenter() {
    return { x: cx, y: cy, radius };
}

// --- Event System ---

export function triggerEvent(magnitude, color) {
    if (magnitude <= 0) return;
    if (magnitude === 1) {
        accelBoost = Math.max(accelBoost, 0.5);
        flashAlpha = Math.max(flashAlpha, 0.08);
        flashColor = color;
        turbulence = Math.max(turbulence, 0.15);
        turbulenceDecay = 1.0;
        ripples.push({ x: cx, y: cy, radius: 0, maxRadius: radius * 0.8, alpha: 0.2, color, speed: 120 });
    } else if (magnitude === 2) {
        accelBoost = Math.max(accelBoost, 1.0);
        flashAlpha = Math.max(flashAlpha, 0.15);
        flashColor = color;
        turbulence = Math.max(turbulence, 0.4);
        turbulenceDecay = 0.6;
        scatterParticles(0.2);
        ripples.push({ x: cx, y: cy, radius: 0, maxRadius: radius * 1.3, alpha: 0.3, color, speed: 160 });
        for (let i = 0; i < 15; i++) burstParticles.push(createBurstParticle(color));
    } else {
        accelBoost = Math.max(accelBoost, 2.0);
        flashAlpha = Math.max(flashAlpha, 0.25);
        flashColor = color;
        turbulence = Math.max(turbulence, 0.8);
        turbulenceDecay = 0.35;
        scatterParticles(0.5);
        ripples.push({ x: cx, y: cy, radius: 0, maxRadius: radius * 1.8, alpha: 0.4, color, speed: 200 });
        ripples.push({ x: cx, y: cy, radius: 0, maxRadius: radius * 2.2, alpha: 0.2, color, speed: 140 });
        for (let i = 0; i < BURST_PARTICLE_MAX; i++) burstParticles.push(createBurstParticle(color));
    }
}

function scatterParticles(amount) {
    for (const p of [...solParticles, ...lunaParticles]) {
        const angle = Math.atan2(p._y - cy, p._x - cx);
        const force = radius * amount * (0.5 + Math.random() * 0.5);
        p.scatterX += Math.cos(angle) * force;
        p.scatterY += Math.sin(angle) * force;
    }
}

// --- Alignment & Intensity ---

function computeAlignment() {
    const state = getState();
    let totalDiff = 0, count = 0;
    for (const v of VESSELS) {
        const wes = state.wes?.[v.id] || 0;
        const amelia = state.amelia?.[v.id] || 0;
        if (wes > 0 && amelia > 0) { totalDiff += Math.abs(wes - amelia); count++; }
    }
    if (count === 0) return -1; // -1 means no data (dormant)
    return 1 - (totalDiff / (count * 4));
}

function computeIntensity() {
    const state = getState();
    let total = 0, count = 0;
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

function computeTargetWeights(alignment) {
    const w = { dormant: 0, searching: 0, balanced: 0, harmonious: 0 };

    if (alignment < 0) {
        // No data — dormant
        w.dormant = 1;
    } else if (alignment < 0.35) {
        // Searching zone, blend toward balanced at the top
        const t = alignment / 0.35;
        w.searching = 1 - t * 0.5;
        w.balanced = t * 0.5;
    } else if (alignment < 0.65) {
        // Balanced zone, blend between searching and harmonious at edges
        const t = (alignment - 0.35) / 0.3;
        w.searching = Math.max(0, 0.3 - t * 0.3);
        w.balanced = 0.7;
        w.harmonious = t * 0.3;
    } else {
        // Harmonious zone
        const t = (alignment - 0.65) / 0.35;
        w.balanced = 1 - t;
        w.harmonious = t;
    }

    return w;
}

// --- Update ---

export function updateConiunctio(dt) {
    time += dt;

    const rawAlignment = computeAlignment();
    const targetIntensity = computeIntensity();
    const targetAlign = rawAlignment < 0 ? 0.5 : rawAlignment;
    smoothAlignment += (targetAlign - smoothAlignment) * 0.03;
    smoothIntensity += (targetIntensity - smoothIntensity) * 0.03;

    // Update video blend weights
    targetWeights = computeTargetWeights(rawAlignment);
    const blendSpeed = 0.02; // Slow, smooth transitions
    for (const name of STATE_NAMES) {
        stateWeights[name] += (targetWeights[name] - stateWeights[name]) * blendSpeed;
        if (stateWeights[name] < 0.001) stateWeights[name] = 0;
    }

    const alignment = smoothAlignment;
    const intensity = smoothIntensity;
    const baseSpeed = (0.2 + intensity * 0.5) * (1 + accelBoost);

    // Decay percentage easter egg
    if (percentageAlpha > 0) {
        percentageAlpha -= dt * 0.25; // fades over ~4 seconds
        if (percentageAlpha < 0) percentageAlpha = 0;
    }

    // Decay event effects
    accelBoost *= 0.97;
    if (accelBoost < 0.01) accelBoost = 0;
    flashAlpha *= 0.94;
    if (flashAlpha < 0.005) flashAlpha = 0;
    turbulence *= (1 - turbulenceDecay * dt);
    if (turbulence < 0.005) turbulence = 0;

    for (const p of solParticles) updateParticle(p, baseSpeed, alignment, intensity, dt);
    for (const p of lunaParticles) updateParticle(p, baseSpeed, alignment, intensity, dt);

    for (let i = burstParticles.length - 1; i >= 0; i--) {
        const b = burstParticles[i];
        b.x += b.vx; b.y += b.vy;
        b.vx *= 0.97; b.vy *= 0.97;
        b.life -= b.decay * dt;
        b.alpha = b.life * 0.6;
        if (b.life <= 0) burstParticles.splice(i, 1);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed * dt;
        r.alpha *= 0.96;
        if (r.radius > r.maxRadius || r.alpha < 0.01) ripples.splice(i, 1);
    }
}

function updateParticle(p, baseSpeed, alignment, intensity, dt) {
    const speed = baseSpeed * p.baseSpeed * p.direction;
    const chaos = (1 - alignment) * 0.6 + turbulence * 1.5;
    p.angle += speed * 0.018;
    p.life += p.lifeSpeed * 0.02;

    const wobbleX = Math.sin(time * 1.3 + p.phase) * chaos * radius * 0.5;
    const wobbleY = Math.cos(time * 0.9 + p.phase * 1.3) * chaos * radius * 0.4;
    const breathe = Math.sin(time * 0.6 + p.phase) * radius * 0.2 * intensity;
    const targetDist = p.baseDist + breathe;
    const ex = Math.cos(p.angle) * targetDist;
    const ey = Math.sin(p.angle) * targetDist * p.orbitEcc;
    const convergeFactor = alignment * 0.4;

    p.scatterX *= 0.95;
    p.scatterY *= 0.95;

    const prevX = p._x;
    const prevY = p._y;
    p._x = cx + ex * (1 - convergeFactor) + wobbleX + p.scatterX;
    p._y = cy + ey * (1 - convergeFactor) + wobbleY + p.scatterY;

    p.trail.push({ x: prevX, y: prevY });
    if (p.trail.length > 3) p.trail.shift();

    p._alpha = (0.2 + intensity * 0.6) * (0.5 + Math.sin(p.life) * 0.5);
    p._size = p.size * (0.7 + intensity * 0.5);
}

// --- Draw ---

export function drawConiunctio(ctx) {
    const alignment = smoothAlignment;
    const intensity = smoothIntensity;

    // --- Layer 1: Midjourney video art (background of coniunctio) ---
    drawStateVideos(ctx);

    // --- Layer 2: Central glow ---
    const glowR = radius * (0.7 + alignment * 0.7);
    const glowAlpha = 0.04 + alignment * intensity * 0.1 + flashAlpha * 0.5;
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    centerGrad.addColorStop(0, `rgba(200, 176, 122, ${glowAlpha})`);
    centerGrad.addColorStop(0.4, `rgba(180, 160, 130, ${glowAlpha * 0.35})`);
    centerGrad.addColorStop(1, 'rgba(180, 160, 130, 0)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Flash overlay
    if (flashAlpha > 0.005) {
        const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.5);
        flashGrad.addColorStop(0, flashColor);
        flashGrad.addColorStop(1, 'transparent');
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Ripples
    for (const r of ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = r.alpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // --- Layer 3: Particles on top ---
    if (alignment > 0.3 && intensity > 0.2) drawThreads(ctx, alignment, intensity);
    drawTrails(ctx, solParticles, COLORS.sol, intensity);
    drawTrails(ctx, lunaParticles, COLORS.luna, intensity);
    drawParticleSet(ctx, solParticles, COLORS.sol, intensity);
    drawParticleSet(ctx, lunaParticles, COLORS.luna, intensity);

    // Burst particles
    for (const b of burstParticles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = b.alpha;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * 3, 0, Math.PI * 2);
        ctx.globalAlpha = b.alpha * 0.15;
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Easter egg — the percentage
    if (percentageAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = percentageAlpha * 0.7;
        ctx.font = 'italic 28px Georgia, "Cormorant Garamond", serif';
        ctx.fillStyle = COLORS.gold;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(percentageValue + '%', cx, cy);
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

function drawStateVideos(ctx) {
    if (!videosLoaded) return;

    const displaySize = radius * 2.8;
    const halfSize = displaySize / 2;
    const clipRadius = displaySize * 0.46;

    for (const name of STATE_NAMES) {
        const weight = stateWeights[name];
        if (weight < 0.01) continue;

        const video = stateVideos[name];
        if (!video || video.readyState < 2) continue;

        ctx.save();

        // Soft circular clip using radial gradient as alpha mask
        // Draw video first, then erase the edges with a destination-out gradient
        ctx.beginPath();
        ctx.arc(cx, cy, clipRadius * 1.15, 0, Math.PI * 2);
        ctx.clip();

        const alphaMultiplier = name === 'dormant' ? 0.35 : 0.6;
        ctx.globalAlpha = weight * alphaMultiplier;
        ctx.drawImage(video, cx - halfSize, cy - halfSize, displaySize, displaySize);

        ctx.restore();
    }

    // Very soft, wide edge fade — gradual blend into background
    const fadeGrad = ctx.createRadialGradient(cx, cy, clipRadius * 0.5, cx, cy, clipRadius * 1.3);
    fadeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fadeGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    fadeGrad.addColorStop(0.85, 'rgba(10, 10, 26, 0.6)');
    fadeGrad.addColorStop(1, 'rgba(10, 10, 26, 1)');
    ctx.fillStyle = fadeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, clipRadius * 1.1, 0, Math.PI * 2);
    ctx.fill();
}

function drawTrails(ctx, particles, colors, intensity) {
    if (intensity < 0.3) return;
    const trailAlpha = (intensity - 0.3) * 0.15 + turbulence * 0.2;
    if (trailAlpha < 0.01) return;
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 0.5;
    for (const p of particles) {
        if (p.trail.length < 2) continue;
        const dist = Math.sqrt((p._x - cx) ** 2 + (p._y - cy) ** 2);
        const falloff = Math.max(0, 1 - dist / (radius * 2.5));
        if (falloff < 0.1) continue;
        ctx.globalAlpha = trailAlpha * falloff * p._alpha;
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
        ctx.lineTo(p._x, p._y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function drawThreads(ctx, alignment, intensity) {
    const threadAlpha = (alignment - 0.3) * 0.18 * intensity;
    if (threadAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = threadAlpha;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 0.5;
    const step = Math.max(8, Math.floor(SOL_COUNT / 14));
    for (let i = 0; i < SOL_COUNT; i += step) {
        const s = solParticles[i];
        const l = lunaParticles[i % LUNA_COUNT];
        if (!s._x || !l._x) continue;
        ctx.beginPath();
        ctx.moveTo(s._x, s._y);
        ctx.quadraticCurveTo(
            cx + Math.sin(time * 0.5 + i) * radius * 0.15,
            cy + Math.cos(time * 0.7 + i) * radius * 0.1,
            l._x, l._y
        );
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
        ctx.beginPath();
        ctx.arc(p._x, p._y, p._size, 0, Math.PI * 2);
        ctx.fillStyle = colors.primary;
        ctx.globalAlpha = alpha;
        ctx.fill();
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
