import { COLORS } from './constants.js';
import { getPerson, postAdjustment, getState } from './state.js';
import { playFlameLevel } from './sound.js';

let active = false;
let vesselId = null;
let vesselX = 0;
let vesselY = 0;
let currentLevel = 0;
let displayLevel = 0;
let dragging = false;
let dragStartY = 0;
let dragLevel = 0;
let time = 0;

export function showFlame(id, x, y) {
    vesselId = id;
    vesselX = x;
    vesselY = y;
    const state = getState();
    const person = getPerson();
    currentLevel = state[person]?.[id] || 0;
    displayLevel = currentLevel;
    active = true;
    dragging = false;
}

export function hideFlame() {
    active = false;
    vesselId = null;
    dragging = false;
}

export function isFlameActive() { return active; }
export function getFlameVesselId() { return vesselId; }

export function updateFlame(dt) {
    if (!active) return;
    time += dt;
    const target = dragging ? dragLevel : currentLevel;
    displayLevel += (target - displayLevel) * 0.15;
}

export function drawFlame(ctx) {
    if (!active) return;

    const x = vesselX;
    const baseY = vesselY + 48;
    const intensity = Math.max(displayLevel, 0.3) / 5; // minimum ember glow
    const height = 8 + intensity * 40;
    const width = 5 + intensity * 16;
    const person = getPerson();
    const color = person === 'wes' ? COLORS.sol : COLORS.luna;

    ctx.save();
    ctx.translate(x, baseY);

    // Draw flame layers
    for (let layer = 0; layer < 3; layer++) {
        const flicker = Math.sin(time * (5 + layer * 1.5) + layer * 2) * (2 + intensity * 4);
        const sway = Math.sin(time * (1.8 + layer * 0.4)) * (1 + intensity * 3);

        const h = height * (1 - layer * 0.22);
        const w = width * (1 - layer * 0.25);

        ctx.beginPath();
        ctx.moveTo(-w / 2 + sway, 0);
        ctx.quadraticCurveTo(
            -w / 3 + flicker + sway, -h * 0.5,
            sway * 0.7, -h + flicker * 0.3
        );
        ctx.quadraticCurveTo(
            w / 3 - flicker + sway, -h * 0.5,
            w / 2 + sway, 0
        );
        ctx.closePath();

        const alpha = (0.35 - layer * 0.08) * (0.4 + intensity * 0.6);
        ctx.fillStyle = layer === 0 ? color.primary :
                       layer === 1 ? color.glow : '#fffbe6';
        ctx.globalAlpha = alpha;
        ctx.fill();
    }

    // Glow beneath
    ctx.globalAlpha = intensity * 0.25;
    const glowGrad = ctx.createRadialGradient(0, -height * 0.3, 0, 0, -height * 0.3, width * 1.5);
    glowGrad.addColorStop(0, color.glow);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, -height * 0.3, width * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Level dots (right side)
    for (let i = 1; i <= 5; i++) {
        const dotY = 5 - i * 11;
        const dotActive = i <= Math.round(displayLevel);
        ctx.beginPath();
        ctx.arc(width / 2 + 16, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = dotActive ? color.primary : 'rgba(255,255,255,0.12)';
        ctx.globalAlpha = dotActive ? 0.9 : 0.3;
        ctx.fill();
    }

    // Drag hint text
    if (!dragging && currentLevel === 0) {
        ctx.globalAlpha = 0.4 + Math.sin(time * 2) * 0.15;
        ctx.font = 'italic 10px Georgia, serif';
        ctx.fillStyle = color.primary;
        ctx.textAlign = 'center';
        ctx.fillText('drag to kindle', 0, 18);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

export function handleFlameMouseDown(x, y) {
    if (!active) return false;
    const fx = vesselX;
    const fy = vesselY + 55;
    const dx = x - fx;
    const dy = y - fy;
    if (Math.abs(dx) < 35 && dy > -70 && dy < 25) {
        dragging = true;
        dragStartY = y;
        dragLevel = currentLevel || 1;
        return true;
    }
    return false;
}

let lastSoundLevel = 0;

export function handleFlameDrag(x, y) {
    if (!dragging) return;
    const fy = vesselY + 55;
    const dy = fy - y;
    dragLevel = Math.max(1, Math.min(5, 1 + (dy / 45) * 4));

    // Play tone when crossing a level threshold
    const roundedLevel = Math.round(dragLevel);
    if (roundedLevel !== lastSoundLevel && roundedLevel >= 1 && roundedLevel <= 5) {
        lastSoundLevel = roundedLevel;
        playFlameLevel(roundedLevel);
    }
}

export async function handleFlameMouseUp() {
    if (!dragging) return;
    dragging = false;
    const newLevel = Math.max(1, Math.min(5, Math.round(dragLevel)));
    currentLevel = newLevel;
    displayLevel = newLevel;
    await postAdjustment(vesselId, newLevel);
}

export function isDragging() { return dragging; }
