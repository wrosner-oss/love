import { VESSELS, COLORS, LEVELS } from './constants.js';
import { getState, getPerson } from './state.js';

let visible = false;
let vesselId = null;
let vesselInfo = null;
let fadeAlpha = 0;
let vesselImage = null;
let imageLoaded = false;

export function showDetail(id) {
    vesselId = id;
    vesselInfo = VESSELS.find(v => v.id === id);
    visible = true;
    fadeAlpha = 0;

    // Load the static PNG for the detail view
    imageLoaded = false;
    vesselImage = new Image();
    vesselImage.onload = () => { imageLoaded = true; };
    vesselImage.src = `/static/images/${id}.png`;
}

export function hideDetail() {
    visible = false;
}

export function isDetailVisible() { return visible; }

export function updateDetail(dt) {
    if (visible) {
        fadeAlpha = Math.min(1, fadeAlpha + dt * 3);
    } else {
        fadeAlpha = Math.max(0, fadeAlpha - dt * 4);
    }
}

export function drawDetail(ctx, w, h) {
    if (fadeAlpha <= 0) return;
    if (!vesselInfo) return;

    const state = getState();
    const person = getPerson();
    const other = person === 'wes' ? 'amelia' : 'wes';
    const myLevel = state[person]?.[vesselId] || 0;
    const theirLevel = state[other]?.[vesselId] || 0;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    // Dark overlay
    ctx.fillStyle = 'rgba(6, 6, 18, 0.92)';
    ctx.fillRect(0, 0, w, h);

    // Panel dimensions — right side panel
    const panelW = Math.min(420, w * 0.35);
    const panelH = h * 0.85;
    const px = w - panelW - 40;
    const py = (h - panelH) / 2;

    // Panel background
    ctx.fillStyle = 'rgba(14, 12, 25, 0.95)';
    ctx.strokeStyle = `hsla(${vesselInfo.hue}, 30%, 40%, 0.25)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    // Subtle hue glow on the panel edge
    const edgeGrad = ctx.createLinearGradient(px, py, px + 3, py);
    edgeGrad.addColorStop(0, `hsla(${vesselInfo.hue}, 50%, 50%, 0.15)`);
    edgeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(px, py, 3, panelH);

    let yPos = py + 24;
    const contentX = px + 28;
    const contentW = panelW - 56;

    // Vessel image — centered, large
    if (imageLoaded && vesselImage) {
        const imgSize = Math.min(160, contentW * 0.7);
        const imgX = px + (panelW - imgSize) / 2;
        ctx.drawImage(vesselImage, imgX, yPos, imgSize, imgSize);
        yPos += imgSize + 16;
    } else {
        yPos += 80;
    }

    // Name
    ctx.font = '22px Georgia, "Cormorant Garamond", serif';
    ctx.fillStyle = `hsla(${vesselInfo.hue}, 40%, 75%, 1)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(vesselInfo.name, px + panelW / 2, yPos);
    yPos += 30;

    // Essence
    ctx.font = 'italic 14px Georgia, "Cormorant Garamond", serif';
    ctx.fillStyle = `hsla(${vesselInfo.hue}, 30%, 60%, 0.8)`;
    ctx.fillText(vesselInfo.essence, px + panelW / 2, yPos);
    yPos += 28;

    // Divider line
    ctx.beginPath();
    ctx.moveTo(contentX + contentW * 0.2, yPos);
    ctx.lineTo(contentX + contentW * 0.8, yPos);
    ctx.strokeStyle = `hsla(${vesselInfo.hue}, 30%, 45%, 0.2)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    yPos += 16;

    // Description — word-wrapped
    if (vesselInfo.description) {
        ctx.font = '13px Georgia, "Cormorant Garamond", serif';
        ctx.fillStyle = 'rgba(220, 210, 195, 0.8)';
        ctx.textAlign = 'left';
        const lines = wrapText(ctx, vesselInfo.description, contentW);
        for (const line of lines) {
            ctx.fillText(line, contentX, yPos);
            yPos += 19;
        }
        yPos += 12;
    }

    // Current readings
    if (myLevel > 0 || theirLevel > 0) {
        ctx.beginPath();
        ctx.moveTo(contentX + contentW * 0.2, yPos);
        ctx.lineTo(contentX + contentW * 0.8, yPos);
        ctx.strokeStyle = `hsla(${vesselInfo.hue}, 30%, 45%, 0.15)`;
        ctx.stroke();
        yPos += 16;

        ctx.font = '11px -apple-system, "Raleway", sans-serif';
        ctx.textAlign = 'center';

        // My reading
        if (myLevel > 0) {
            const myColor = person === 'wes' ? COLORS.sol.primary : COLORS.luna.primary;
            const myName = person === 'wes' ? 'Wes' : 'Amelia';
            ctx.fillStyle = myColor;
            ctx.globalAlpha = fadeAlpha * 0.7;
            ctx.fillText(`${myName}: ${LEVELS[myLevel - 1]}`, px + panelW / 2, yPos);
            yPos += 18;
        }

        // Their reading
        if (theirLevel > 0) {
            const theirColor = person === 'wes' ? COLORS.luna.primary : COLORS.sol.primary;
            const theirName = person === 'wes' ? 'Amelia' : 'Wes';
            ctx.fillStyle = theirColor;
            ctx.globalAlpha = fadeAlpha * 0.7;
            ctx.fillText(`${theirName}: ${LEVELS[theirLevel - 1]}`, px + panelW / 2, yPos);
            yPos += 18;
        }
    }

    ctx.globalAlpha = fadeAlpha;

    // Close hint
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillStyle = 'rgba(200, 176, 122, 0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('click anywhere to close', px + panelW / 2, py + panelH - 16);

    ctx.globalAlpha = 1;
    ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
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
