import { VESSELS, COLORS } from './constants.js';
import { getState, getPerson } from './state.js';

let vesselPositions = [];
let hoveredVessel = null;
let selectedVessel = null;
let onVesselSelect = null;
let time = 0;

export function initVessels(w, h, callback) {
    onVesselSelect = callback;
    layoutVessels(w, h);
}

export function layoutVessels(w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) * 0.58;

    vesselPositions = VESSELS.map((v, i) => {
        const angle = (i / VESSELS.length) * Math.PI * 2 - Math.PI / 2;
        const wobble = Math.sin(i * 2.7) * 6;
        return {
            ...v,
            x: cx + Math.cos(angle) * (radius + wobble),
            y: cy + Math.sin(angle) * (radius + wobble),
            baseSize: 32,
            angle,
        };
    });
}

export function updateVessels(dt) {
    time += dt;
}

function drawFlaskShape(ctx, x, y, size, variant) {
    // Each vessel has a slightly different flask shape based on its index
    ctx.beginPath();
    const neckW = size * 0.22;
    const neckH = size * 0.35;
    const bodyW = size * 0.5;
    const bodyH = size * 0.45;

    switch (variant % 4) {
        case 0: // Round-bottom flask
            ctx.moveTo(-neckW, -size * 0.5);
            ctx.lineTo(-neckW, -neckH);
            ctx.quadraticCurveTo(-bodyW, -bodyH * 0.3, -bodyW, bodyH * 0.2);
            ctx.quadraticCurveTo(-bodyW, bodyH, 0, bodyH * 1.1);
            ctx.quadraticCurveTo(bodyW, bodyH, bodyW, bodyH * 0.2);
            ctx.quadraticCurveTo(bodyW, -bodyH * 0.3, neckW, -neckH);
            ctx.lineTo(neckW, -size * 0.5);
            break;
        case 1: // Erlenmeyer / triangular
            ctx.moveTo(-neckW, -size * 0.5);
            ctx.lineTo(-neckW, -neckH);
            ctx.lineTo(-bodyW * 0.9, bodyH * 0.8);
            ctx.quadraticCurveTo(-bodyW * 0.9, bodyH * 1.1, 0, bodyH * 1.1);
            ctx.quadraticCurveTo(bodyW * 0.9, bodyH * 1.1, bodyW * 0.9, bodyH * 0.8);
            ctx.lineTo(neckW, -neckH);
            ctx.lineTo(neckW, -size * 0.5);
            break;
        case 2: // Retort / bulbous
            ctx.moveTo(-neckW, -size * 0.5);
            ctx.lineTo(-neckW, -neckH * 0.8);
            ctx.quadraticCurveTo(-bodyW * 1.1, -bodyH * 0.5, -bodyW * 0.8, bodyH * 0.3);
            ctx.quadraticCurveTo(-bodyW * 0.5, bodyH * 1.2, 0, bodyH * 1.1);
            ctx.quadraticCurveTo(bodyW * 0.5, bodyH * 1.2, bodyW * 0.8, bodyH * 0.3);
            ctx.quadraticCurveTo(bodyW * 1.1, -bodyH * 0.5, neckW, -neckH * 0.8);
            ctx.lineTo(neckW, -size * 0.5);
            break;
        case 3: // Tall narrow
            ctx.moveTo(-neckW, -size * 0.5);
            ctx.lineTo(-neckW, -neckH);
            ctx.quadraticCurveTo(-bodyW * 0.7, -bodyH * 0.2, -bodyW * 0.65, bodyH * 0.4);
            ctx.quadraticCurveTo(-bodyW * 0.65, bodyH * 1.0, 0, bodyH * 1.1);
            ctx.quadraticCurveTo(bodyW * 0.65, bodyH * 1.0, bodyW * 0.65, bodyH * 0.4);
            ctx.quadraticCurveTo(bodyW * 0.7, -bodyH * 0.2, neckW, -neckH);
            ctx.lineTo(neckW, -size * 0.5);
            break;
    }
    ctx.closePath();
}

export function drawVessels(ctx, w, h) {
    const state = getState();
    const person = getPerson();
    const other = person === 'wes' ? 'amelia' : 'wes';

    for (let i = 0; i < vesselPositions.length; i++) {
        const v = vesselPositions[i];
        const myLevel = state[person]?.[v.id] || 0;
        const theirLevel = state[other]?.[v.id] || 0;
        const isHovered = hoveredVessel === v.id;
        const isSelected = selectedVessel === v.id;
        const size = v.baseSize * (isHovered || isSelected ? 1.12 : 1.0);

        // Breathing pulse
        const breathe = 1 + Math.sin(time * 0.8 + i * 0.7) * 0.02;
        const finalSize = size * breathe;

        ctx.save();
        ctx.translate(v.x, v.y);

        // Glow
        const maxLevel = Math.max(myLevel, theirLevel);
        const glowIntensity = maxLevel / 5;
        if (glowIntensity > 0 || isHovered) {
            ctx.shadowColor = `hsla(${v.hue}, 60%, 60%, ${0.2 + glowIntensity * 0.3})`;
            ctx.shadowBlur = 10 + glowIntensity * 15 + (isHovered ? 10 : 0);
        }

        // Draw flask shape
        drawFlaskShape(ctx, 0, 0, finalSize, i);

        // Fill with liquid
        if (myLevel > 0 || theirLevel > 0) {
            ctx.save();
            ctx.clip();

            const flaskBottom = finalSize * 0.45 * 1.1;
            const flaskTop = -finalSize * 0.35;
            const flaskRange = flaskBottom - flaskTop;

            // My liquid
            if (myLevel > 0) {
                const myH = (myLevel / 5) * flaskRange;
                const myColor = person === 'wes' ? COLORS.sol.primary : COLORS.luna.primary;
                ctx.fillStyle = myColor;
                ctx.globalAlpha = 0.35 + (myLevel / 5) * 0.2;
                ctx.fillRect(-finalSize * 0.6, flaskBottom - myH, finalSize * 1.2, myH + 5);
            }

            // Their liquid (slightly offset for visual separation)
            if (theirLevel > 0) {
                const theirH = (theirLevel / 5) * flaskRange;
                const theirColor = person === 'wes' ? COLORS.luna.primary : COLORS.sol.primary;
                ctx.fillStyle = theirColor;
                ctx.globalAlpha = 0.25 + (theirLevel / 5) * 0.15;
                ctx.fillRect(-finalSize * 0.6, flaskBottom - theirH, finalSize * 1.2, theirH + 5);
            }

            ctx.globalAlpha = 1;
            ctx.restore();

            // Re-draw path for stroke (clip consumed it)
            drawFlaskShape(ctx, 0, 0, finalSize, i);
        }

        // Stroke outline
        const strokeAlpha = isHovered || isSelected ? 0.9 : 0.45 + glowIntensity * 0.3;
        ctx.strokeStyle = `hsla(${v.hue}, 40%, 55%, ${strokeAlpha})`;
        ctx.lineWidth = isSelected ? 2 : 1.2;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        ctx.restore();

        // Label below vessel
        ctx.save();
        const labelAlpha = isHovered || isSelected ? 1.0 : 0.6;
        ctx.globalAlpha = labelAlpha;
        ctx.font = `${isHovered || isSelected ? '13px' : '11px'} Georgia, "Cormorant Garamond", serif`;
        ctx.fillStyle = `hsla(${v.hue}, 30%, 70%, 1)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(v.name, v.x, v.y + finalSize * 0.5 + 12);

        // Essence on hover
        if (isHovered || isSelected) {
            ctx.font = 'italic 10px Georgia, "Cormorant Garamond", serif';
            ctx.fillStyle = `hsla(${v.hue}, 25%, 60%, 0.7)`;
            ctx.fillText(v.essence, v.x, v.y + finalSize * 0.5 + 28);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

export function handleVesselMouseMove(x, y) {
    hoveredVessel = null;
    for (const v of vesselPositions) {
        const dx = x - v.x;
        const dy = y - v.y;
        if (Math.sqrt(dx * dx + dy * dy) < v.baseSize + 15) {
            hoveredVessel = v.id;
            return v.id;
        }
    }
    return null;
}

export function handleVesselClick(x, y) {
    const hit = handleVesselMouseMove(x, y);
    if (hit) {
        selectedVessel = hit;
        if (onVesselSelect) onVesselSelect(hit);
    } else {
        selectedVessel = null;
    }
    return hit;
}

export function getSelectedVessel() { return selectedVessel; }
export function clearSelectedVessel() { selectedVessel = null; }
export function getVesselPosition(id) {
    return vesselPositions.find(v => v.id === id);
}
