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

// Art assets
let bgImage = null;
let bgReady = false;
let solImg = null;
let lunaImg = null;
let solReady = false;
let lunaReady = false;

const SYMBOL_SIZE = 90;

const symbols = [
    { id: 'wes', name: 'Wes', color: COLORS.sol.primary, glowColor: COLORS.sol.glow, x: 0, y: 0 },
    { id: 'amelia', name: 'Amelia', color: COLORS.luna.primary, glowColor: COLORS.luna.glow, x: 0, y: 0 },
];

export function initEntry(w, h, callback) {
    onSelect = callback;
    particles = new ParticleSystem({
        count: 60,
        color: '#d4b87a',
        maxAlpha: 0.35,
        speed: 0.15,
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
    loadAssets();
}

function loadAssets() {
    // Static background image
    bgImage = new Image();
    bgImage.onload = () => { bgReady = true; };
    bgImage.src = '/static/images/background.png';

    // Sol image
    solImg = new Image();
    solImg.onload = () => { solReady = true; };
    solImg.src = '/static/images/sol.png';

    // Luna image
    lunaImg = new Image();
    lunaImg.onload = () => { lunaReady = true; };
    lunaImg.src = '/static/images/luna.png';
}

function layoutSymbols(w, h) {
    const cx = w / 2;
    const cy = h * 0.50;
    const gap = Math.min(160, w * 0.13);
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

    for (const s of symbols) {
        const target = hoverSymbol === s.id ? 1.12 : 1.0;
        hoverScale[s.id] += (target - hoverScale[s.id]) * 0.1;
        clickFlash[s.id] *= 0.92;
    }
}

export function drawEntry(ctx, w, h) {
    // Background — static portal image or fallback
    if (bgReady && bgImage) {
        const iw = bgImage.naturalWidth;
        const ih = bgImage.naturalHeight;
        const scale = Math.max(w / iw, h / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(bgImage, (w - dw) / 2, (h - dh) / 2, dw, dh);

        // Slight darken so text/symbols pop
        ctx.fillStyle = 'rgba(6, 6, 18, 0.25)';
        ctx.fillRect(0, 0, w, h);
    } else {
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(0, 0, w, h);
        const grad = ctx.createRadialGradient(w / 2, h * 0.48, 0, w / 2, h * 0.48, h * 0.5);
        grad.addColorStop(0, 'rgba(30, 25, 40, 0.6)');
        grad.addColorStop(1, 'rgba(10, 10, 26, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    particles.draw(ctx);

    // Title text
    if (textAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.font = 'italic 300 34px Georgia, "Cormorant Garamond", serif';
        ctx.fillStyle = '#e8d090';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 12;
        ctx.fillText('Step Inside', w / 2, h * 0.35);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Symbols
    if (symbolsAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = symbolsAlpha;

        for (const s of symbols) {
            const scale = hoverScale[s.id];
            const flash = clickFlash[s.id];
            const isSol = s.id === 'wes';
            const img = isSol ? solImg : lunaImg;
            const imgReady = isSol ? solReady : lunaReady;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.scale(scale, scale);

            // Glow on hover/click
            if (hoverSymbol === s.id || flash > 0.01) {
                const glowIntensity = Math.max(hoverSymbol === s.id ? 0.2 : 0, flash * 0.5);
                const glowGrad = ctx.createRadialGradient(0, 0, SYMBOL_SIZE * 0.2, 0, 0, SYMBOL_SIZE * 0.7);
                glowGrad.addColorStop(0, s.glowColor);
                glowGrad.addColorStop(1, 'transparent');
                ctx.globalAlpha = symbolsAlpha * glowIntensity;
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(0, 0, SYMBOL_SIZE * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = symbolsAlpha;
            }

            // Draw image or fallback glyph
            if (imgReady && img) {
                const halfSize = SYMBOL_SIZE / 2;
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, halfSize * 0.92, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, -halfSize, -halfSize, SYMBOL_SIZE, SYMBOL_SIZE);
                ctx.restore();
                // Soft edge fade
                const fadeGrad = ctx.createRadialGradient(0, 0, halfSize * 0.7, 0, 0, halfSize);
                fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
                fadeGrad.addColorStop(1, 'rgba(6,6,18,0.8)');
                ctx.fillStyle = fadeGrad;
                ctx.beginPath();
                ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.font = '72px serif';
                ctx.fillStyle = s.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(isSol ? '\u2609' : '\u263D', 0, -5);
            }

            // Name below
            ctx.font = '200 13px -apple-system, "Raleway", sans-serif';
            ctx.fillStyle = s.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 6;
            ctx.fillText(s.name.toUpperCase(), 0, SYMBOL_SIZE / 2 + 8);
            ctx.shadowBlur = 0;

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
        if (Math.sqrt(dx * dx + dy * dy) < SYMBOL_SIZE * 0.6) {
            clickFlash[s.id] = 1;
            if (onSelect) {
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
        if (Math.sqrt(dx * dx + dy * dy) < SYMBOL_SIZE * 0.6) {
            hoverSymbol = s.id;
            canvas.style.cursor = 'pointer';
            return;
        }
    }
    canvas.style.cursor = 'default';
}
