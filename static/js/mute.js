import { COLORS } from './constants.js';
import { toggleMute, isMuted } from './sound.js';

let iconX = 0;
let iconY = 0;
let iconHover = false;
const ICON_HIT_RADIUS = 16;
const STORAGE_KEY = 'athanor-muted';

// Restore mute preference on load
export function initMute() {
    try {
        if (localStorage.getItem(STORAGE_KEY) === '1') {
            // If user previously muted, restore it after audio starts
            // toggleMute will flip from current state (unmuted) to muted
            // We defer until audio context exists
            window.__restoreMutePending = true;
        }
    } catch (e) { /* localStorage may be blocked */ }
}

// Called once the audio context is live (on first interaction)
export function restoreMuteIfPending() {
    if (window.__restoreMutePending && !isMuted()) {
        toggleMute();
        window.__restoreMutePending = false;
    }
}

export function layoutMute(w, h) {
    iconX = w - 96;
    iconY = h - 28;
}

export function drawMute(ctx) {
    ctx.save();
    ctx.translate(iconX, iconY);
    const alpha = iconHover ? 0.55 : 0.2;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLORS.gold;
    ctx.fillStyle = COLORS.gold;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Speaker icon
    // Speaker body (trapezoid)
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(-2, -3);
    ctx.lineTo(2, -6);
    ctx.lineTo(2, 6);
    ctx.lineTo(-2, 3);
    ctx.lineTo(-6, 3);
    ctx.closePath();
    ctx.stroke();

    if (isMuted()) {
        // Draw an X to the right — speaker off
        ctx.beginPath();
        ctx.moveTo(5, -4);
        ctx.lineTo(10, 4);
        ctx.moveTo(10, -4);
        ctx.lineTo(5, 4);
        ctx.stroke();
    } else {
        // Draw sound waves — speaker on
        ctx.beginPath();
        ctx.arc(2, 0, 6, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(2, 0, 9, -Math.PI * 0.25, Math.PI * 0.25);
        ctx.stroke();
    }

    ctx.restore();
}

export function handleMuteClick(x, y) {
    const dx = x - iconX;
    const dy = y - iconY;
    if (Math.sqrt(dx * dx + dy * dy) < ICON_HIT_RADIUS) {
        toggleMute();
        try {
            localStorage.setItem(STORAGE_KEY, isMuted() ? '1' : '0');
        } catch (e) { /* ignore */ }
        return true;
    }
    return false;
}

export function handleMuteMouseMove(x, y) {
    const dx = x - iconX;
    const dy = y - iconY;
    iconHover = Math.sqrt(dx * dx + dy * dy) < ICON_HIT_RADIUS;
    return iconHover;
}
