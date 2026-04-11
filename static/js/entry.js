import { ParticleSystem } from './particles.js';
import { COLORS } from './constants.js';

let particles;
let fadeState = 'waiting'; // waiting -> text -> symbols -> ready
let fadeTimer = 0;
let onSelect = null;

let textAlpha = 0;
let symbolsAlpha = 0;
let hoverSymbol = null;
let hoverScale = { wes: 1, amelia: 1 };
let clickFlash = { wes: 0, amelia: 0 };

const symbols = [
    { id: 'wes', glyph: '\u2609', name: 'Wes', color: COLORS.sol.primary, glowColor: COLORS.sol.glow, x: 0, y: 0 },
    { id: 'amelia', glyph: '\u263D', name: 'Amelia', color: COLORS.luna.primary, glowColor: COLORS.luna.glow, x: 0, y: 0 },
];

export function initEntry(w, h, callback) {
    onSelect = callback;
    particles = new ParticleSystem({
        count: 80,
        color: '#d4b87a',
        maxAlpha: 0.5,
        speed: 0.2,
    });
    particles.resize(w, h);
    fadeState = 'waiting';
    fadeTimer = 0;
    textAlpha = 0;
    symbolsAlpha = 0;
    hoverSymbol = null;
    hoverScale = { wes: 1, amelia: 1 };
    clickFlash = { wes: 0, amelia: 0 };
    layoutSymbols(w, h);
}

function layoutSymbols(w, h) {
    const cx = w / 2;
    const cy = h * 0.58;
    const gap = Math.min(140, w * 0.12);
    symbols[0].x = cx - gap;
    symbols[0].y = cy;
    symbols[1].x = cx + gap;
    symbols[1].y = cy;
}

export function resizeEntry(w, h) {
    if (particles) particles.resize(w, h);
    layoutSymbols(w, h);
}

export function updateEntry(dt) {
    fadeTimer += dt;
    particles.update();

    if (fadeState === 'waiting' && fadeTimer > 1.0) {
        fadeState = 'text';
        fadeTimer = 0;
    }
    if (fadeState === 'text') {
        textAlpha = Math.min(1, textAlpha + dt * 0.5);
        if (fadeTimer > 3.5) {
            fadeState = 'symbols';
            fadeTimer = 0;
        }
    }
    if (fadeState === 'symbols' || fadeState === 'ready') {
        symbolsAlpha = Math.min(1, symbolsAlpha + dt * 0.7);
        if (symbolsAlpha >= 0.99) fadeState = 'ready';
    }

    // Smooth hover scale
    for (const s of symbols) {
        const target = hoverSymbol === s.id ? 1.15 : 1.0;
        hoverScale[s.id] += (target - hoverScale[s.id]) * 0.1;
        // Decay click flash
        clickFlash[s.id] *= 0.92;
    }
}

export function drawEntry(ctx, w, h) {
    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    // Subtle radial warmth in center
    const grad = ctx.createRadialGradient(w / 2, h * 0.48, 0, w / 2, h * 0.48, h * 0.5);
    grad.addColorStop(0, 'rgba(30, 25, 40, 0.6)');
    grad.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    particles.draw(ctx);

    // Title text
    if (textAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.font = 'italic 300 32px Georgia, "Cormorant Garamond", serif';
        ctx.fillStyle = '#e0c882';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('For the alchemy between us.', w / 2, h * 0.40);
        ctx.restore();
    }

    // Symbols
    if (symbolsAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = symbolsAlpha;

        for (const s of symbols) {
            const scale = hoverScale[s.id];
            const flash = clickFlash[s.id];

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.scale(scale, scale);

            // Glow on hover/click
            if (hoverSymbol === s.id || flash > 0.01) {
                const glowIntensity = Math.max(hoverSymbol === s.id ? 0.15 : 0, flash * 0.4);
                ctx.shadowColor = s.glowColor;
                ctx.shadowBlur = 30 + flash * 40;
                ctx.globalAlpha = symbolsAlpha * (0.5 + glowIntensity);
                ctx.beginPath();
                ctx.arc(0, 5, 35, 0, Math.PI * 2);
                ctx.fillStyle = s.glowColor;
                ctx.globalAlpha = glowIntensity * 0.15;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = symbolsAlpha;
            }

            // Glyph
            ctx.font = '72px serif';
            ctx.fillStyle = s.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.glyph, 0, -5);

            // Name
            ctx.font = '200 14px -apple-system, "Raleway", sans-serif';
            ctx.fillStyle = s.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(s.name.toUpperCase(), 0, 30);

            ctx.restore();
        }

        ctx.restore();
    }
}

export function handleEntryClick(x, y) {
    if (fadeState !== 'ready') return;
    for (const s of symbols) {
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < 55) {
            clickFlash[s.id] = 1;
            if (onSelect) {
                // Brief delay so the flash is visible
                setTimeout(() => onSelect(s.id), 300);
            }
            return;
        }
    }
}

export function handleEntryMouseMove(x, y, canvas) {
    if (fadeState !== 'ready') {
        canvas.style.cursor = 'default';
        hoverSymbol = null;
        return;
    }
    hoverSymbol = null;
    for (const s of symbols) {
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < 55) {
            hoverSymbol = s.id;
            canvas.style.cursor = 'pointer';
            return;
        }
    }
    canvas.style.cursor = 'default';
}
