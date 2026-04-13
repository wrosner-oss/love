import { VESSELS, COLORS } from './constants.js';

let visible = false;
let fadeAlpha = 0;
let currentIndex = 0;
let loadedImages = {};
let iconX = 0;
let iconY = 0;
let iconHover = false;
let navHover = null; // 'prev' | 'next' | 'close' | null

// Preload all vessel PNGs
function ensureImageLoaded(index) {
    const vessel = VESSELS[index];
    if (!vessel) return null;
    if (loadedImages[vessel.id]) return loadedImages[vessel.id];

    const img = new Image();
    img.src = `/static/images/${vessel.id}.png`;
    loadedImages[vessel.id] = img;
    return img;
}

export function layoutGallery(w, h) {
    iconX = w - 64;
    iconY = h - 28;
}

export function showGallery(startIndex = 0) {
    currentIndex = Math.max(0, Math.min(VESSELS.length - 1, startIndex));
    visible = true;
    // Preload current + neighbors
    ensureImageLoaded(currentIndex);
    ensureImageLoaded((currentIndex + 1) % VESSELS.length);
    ensureImageLoaded((currentIndex - 1 + VESSELS.length) % VESSELS.length);
}

export function hideGallery() {
    visible = false;
}

export function isGalleryVisible() { return visible; }

export function nextVessel() {
    currentIndex = (currentIndex + 1) % VESSELS.length;
    ensureImageLoaded(currentIndex);
    ensureImageLoaded((currentIndex + 1) % VESSELS.length);
}

export function prevVessel() {
    currentIndex = (currentIndex - 1 + VESSELS.length) % VESSELS.length;
    ensureImageLoaded(currentIndex);
    ensureImageLoaded((currentIndex - 1 + VESSELS.length) % VESSELS.length);
}

export function updateGallery(dt) {
    if (visible) {
        fadeAlpha = Math.min(1, fadeAlpha + dt * 2.5);
    } else {
        fadeAlpha = Math.max(0, fadeAlpha - dt * 3);
    }
}

export function drawGallery(ctx, w, h) {
    // Draw the small icon (always on athanor screen)
    drawIcon(ctx);

    if (fadeAlpha <= 0) return;

    const vessel = VESSELS[currentIndex];
    if (!vessel) return;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    // Deep dark overlay
    ctx.fillStyle = 'rgba(2, 2, 8, 0.96)';
    ctx.fillRect(0, 0, w, h);

    // Vessel image — large, centered
    const img = ensureImageLoaded(currentIndex);
    if (img && img.complete && img.naturalWidth > 0) {
        // Fit image to most of the screen while preserving aspect ratio
        const maxW = w * 0.7;
        const maxH = h * 0.78;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = Math.min(maxW / iw, maxH / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2 - 20;

        // Subtle glow halo behind the image
        const halo = ctx.createRadialGradient(w / 2, h / 2 - 20, Math.min(dw, dh) * 0.4, w / 2, h / 2 - 20, Math.max(dw, dh) * 0.75);
        halo.addColorStop(0, `hsla(${vessel.hue}, 60%, 40%, 0.15)`);
        halo.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, w, h);

        ctx.drawImage(img, dx, dy, dw, dh);
    } else {
        // Loading state
        ctx.font = 'italic 14px Georgia, serif';
        ctx.fillStyle = COLORS.gold;
        ctx.textAlign = 'center';
        ctx.fillText('loading...', w / 2, h / 2);
    }

    // Title at bottom
    const titleY = h - 80;
    ctx.font = 'italic 26px Georgia, "Cormorant Garamond", serif';
    ctx.fillStyle = `hsla(${vessel.hue}, 40%, 75%, 1)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(vessel.name, w / 2, titleY);

    ctx.font = 'italic 13px Georgia, serif';
    ctx.fillStyle = `hsla(${vessel.hue}, 30%, 60%, 0.85)`;
    ctx.fillText(vessel.essence, w / 2, titleY + 26);
    ctx.shadowBlur = 0;

    // Position indicator (e.g. "3 / 9")
    ctx.font = '11px -apple-system, "Raleway", sans-serif';
    ctx.fillStyle = 'rgba(200, 176, 122, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentIndex + 1} / ${VESSELS.length}`, w / 2, h - 24);

    // Navigation arrows
    drawNavArrow(ctx, 40, h / 2, 'prev');
    drawNavArrow(ctx, w - 40, h / 2, 'next');

    // Close hint (top right)
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillStyle = navHover === 'close' ? 'rgba(232, 208, 144, 0.9)' : 'rgba(200, 176, 122, 0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('close', w - 30, 24);

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawNavArrow(ctx, x, y, direction) {
    const isHovered = navHover === direction;
    const alpha = isHovered ? 0.9 : 0.35;
    const size = 14;

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (direction === 'prev') {
        ctx.moveTo(x + size / 2, y - size);
        ctx.lineTo(x - size / 2, y);
        ctx.lineTo(x + size / 2, y + size);
    } else {
        ctx.moveTo(x - size / 2, y - size);
        ctx.lineTo(x + size / 2, y);
        ctx.lineTo(x - size / 2, y + size);
    }
    ctx.stroke();

    ctx.restore();
}

function drawIcon(ctx) {
    ctx.save();
    ctx.translate(iconX, iconY);
    const alpha = iconHover ? 0.55 : 0.2;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLORS.gold;
    ctx.fillStyle = COLORS.gold;
    ctx.lineWidth = 1;

    // A small stack of rectangles — gallery icon
    const s = 5;
    ctx.strokeRect(-s, -s - 2, s * 2, s * 2);
    ctx.strokeRect(-s + 2, -s, s * 2, s * 2);
    ctx.strokeRect(-s + 4, -s + 2, s * 2, s * 2);

    ctx.restore();
}

const ICON_HIT_RADIUS = 16;

export function handleGalleryClick(x, y, w, h) {
    if (visible) {
        // Check close hint (top right)
        if (x > w - 80 && y < 50) {
            hideGallery();
            return true;
        }
        // Check nav arrows
        if (x < 80 && Math.abs(y - h / 2) < 40) {
            prevVessel();
            return true;
        }
        if (x > w - 80 && Math.abs(y - h / 2) < 40) {
            nextVessel();
            return true;
        }
        // Click anywhere else closes
        hideGallery();
        return true;
    }

    // Check if gallery icon clicked
    const dx = x - iconX;
    const dy = y - iconY;
    if (Math.sqrt(dx * dx + dy * dy) < ICON_HIT_RADIUS) {
        showGallery(0);
        return true;
    }

    return false;
}

export function handleGalleryMouseMove(x, y, w, h) {
    if (visible) {
        navHover = null;
        if (x > w - 80 && y < 50) navHover = 'close';
        else if (x < 80 && Math.abs(y - h / 2) < 40) navHover = 'prev';
        else if (x > w - 80 && Math.abs(y - h / 2) < 40) navHover = 'next';
        return navHover !== null;
    }

    // Icon hover
    const dx = x - iconX;
    const dy = y - iconY;
    iconHover = Math.sqrt(dx * dx + dy * dy) < ICON_HIT_RADIUS;
    return iconHover;
}

export function handleGalleryKey(key) {
    if (!visible) return false;
    if (key === 'ArrowRight' || key === ' ') { nextVessel(); return true; }
    if (key === 'ArrowLeft') { prevVessel(); return true; }
    if (key === 'Escape') { hideGallery(); return true; }
    return false;
}
