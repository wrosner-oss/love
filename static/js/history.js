import { COLORS, VESSELS } from './constants.js';
import { fetchHistory } from './state.js';

let visible = false;
let historyData = [];
let vesselId = null;
let vesselInfo = null;
let fadeAlpha = 0;

export async function showHistory(id) {
    vesselId = id;
    vesselInfo = VESSELS.find(v => v.id === id);
    historyData = await fetchHistory(id);
    visible = true;
    fadeAlpha = 0;
}

export function hideHistory() {
    visible = false;
    fadeAlpha = 0;
}

export function isHistoryVisible() { return visible; }

export function updateHistory(dt) {
    if (!visible) {
        if (fadeAlpha > 0) fadeAlpha = Math.max(0, fadeAlpha - dt * 3);
        return;
    }
    fadeAlpha = Math.min(1, fadeAlpha + dt * 2.5);
}

export function drawHistory(ctx, w, h) {
    if (fadeAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    // Dark overlay
    ctx.fillStyle = 'rgba(8, 8, 20, 0.88)';
    ctx.fillRect(0, 0, w, h);

    const panelW = Math.min(w * 0.45, 400);
    const panelH = Math.min(h * 0.65, 450);
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    // Panel background
    ctx.fillStyle = 'rgba(18, 16, 30, 0.95)';
    ctx.strokeStyle = `hsla(${vesselInfo?.hue || 40}, 30%, 50%, 0.3)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, px, py, panelW, panelH, 10);
    ctx.fill();
    ctx.stroke();

    // Title
    const name = vesselInfo?.name || vesselId;
    ctx.font = 'italic 20px Georgia, "Cormorant Garamond", serif';
    ctx.fillStyle = `hsla(${vesselInfo?.hue || 40}, 40%, 70%, 0.9)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(name, px + panelW / 2, py + 18);

    // Essence subtitle
    if (vesselInfo?.essence) {
        ctx.font = 'italic 12px Georgia, serif';
        ctx.fillStyle = `hsla(${vesselInfo?.hue || 40}, 25%, 55%, 0.6)`;
        ctx.fillText(vesselInfo.essence, px + panelW / 2, py + 44);
    }

    // Sediment layers
    if (historyData.length === 0) {
        ctx.font = 'italic 14px Georgia, serif';
        ctx.fillStyle = 'rgba(200, 176, 122, 0.4)';
        ctx.fillText('No layers yet...', px + panelW / 2, py + panelH / 2);
    } else {
        const layerArea = {
            x: px + 24,
            y: py + 65,
            w: panelW - 48,
            h: panelH - 90,
        };

        // Draw layers from bottom up (oldest at bottom)
        const maxLayers = Math.min(historyData.length, 60);
        const layerH = Math.max(3, layerArea.h / maxLayers);
        const startIdx = Math.max(0, historyData.length - maxLayers);

        for (let i = startIdx; i < historyData.length; i++) {
            const entry = historyData[i];
            const layerIdx = i - startIdx;
            const by = layerArea.y + layerArea.h - (layerIdx + 1) * layerH;
            const isSol = entry.person === 'wes';
            const color = isSol ? COLORS.sol.primary : COLORS.luna.primary;
            const intensity = entry.level / 5;

            // Layer band
            ctx.fillStyle = color;
            ctx.globalAlpha = fadeAlpha * (0.12 + intensity * 0.45);

            // Slight wave effect for organic feel
            const wave1 = Math.sin(layerIdx * 0.4 + entry.level) * 3;
            const wave2 = Math.sin(layerIdx * 0.7) * 2;

            ctx.beginPath();
            ctx.moveTo(layerArea.x + wave1, by);
            ctx.lineTo(layerArea.x + layerArea.w + wave2, by);
            ctx.lineTo(layerArea.x + layerArea.w + wave2, by + layerH - 1);
            ctx.lineTo(layerArea.x + wave1, by + layerH - 1);
            ctx.closePath();
            ctx.fill();
        }

        // Legend
        ctx.globalAlpha = fadeAlpha * 0.5;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.sol.primary;
        ctx.fillText('\u25CF Wes', layerArea.x, layerArea.y + layerArea.h + 16);
        ctx.fillStyle = COLORS.luna.primary;
        ctx.fillText('\u25CF Amelia', layerArea.x + 60, layerArea.y + layerArea.h + 16);
    }

    // Close hint
    ctx.globalAlpha = fadeAlpha * 0.35;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText('click anywhere to close', px + panelW / 2, py + panelH - 12);

    ctx.globalAlpha = 1;
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
}
