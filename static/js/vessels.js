import { VESSELS, COLORS } from './constants.js';
import { getState, getPerson } from './state.js';

let vesselPositions = [];
let hoveredVessel = null;
let selectedVessel = null;
let onVesselSelect = null;
let time = 0;
let videoElements = {};
let videosReady = false;

// Display size for vessel videos
const VESSEL_DISPLAY_SIZE = 100;

export function initVessels(w, h, callback) {
    onVesselSelect = callback;
    layoutVessels(w, h);
    loadVideos();
}

function loadVideos() {
    let loadedCount = 0;
    const total = VESSELS.length;

    for (const v of VESSELS) {
        const video = document.createElement('video');
        video.src = `/static/images/${v.id}.mp4`;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.style.display = 'none';
        document.body.appendChild(video);

        video.addEventListener('canplaythrough', () => {
            loadedCount++;
            if (loadedCount >= total) videosReady = true;
            video.play().catch(() => {}); // autoplay may need user interaction
        }, { once: true });

        // Also try to play immediately (some browsers need this)
        video.load();

        videoElements[v.id] = video;
    }

    // Fallback: mark ready after 3 seconds even if not all loaded
    setTimeout(() => {
        videosReady = true;
        // Try playing all videos
        for (const v of VESSELS) {
            const vid = videoElements[v.id];
            if (vid && vid.paused) vid.play().catch(() => {});
        }
    }, 3000);
}

export function layoutVessels(w, h) {
    const cx = w / 2;
    const cy = h / 2;
    // Elliptical layout — wider than tall to match widescreen
    const radiusX = cx * 0.72;
    const radiusY = cy * 0.68;

    vesselPositions = VESSELS.map((v, i) => {
        const angle = (i / VESSELS.length) * Math.PI * 2 - Math.PI / 2;
        const wobble = Math.sin(i * 2.7) * 5;
        return {
            ...v,
            x: cx + Math.cos(angle) * (radiusX + wobble),
            y: cy + Math.sin(angle) * (radiusY + wobble),
            baseSize: VESSEL_DISPLAY_SIZE / 2,
            angle,
        };
    });
}

export function updateVessels(dt) {
    time += dt;
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
        const maxLevel = Math.max(myLevel, theirLevel);
        const glowIntensity = maxLevel / 5;

        // Breathing pulse
        const breathe = 1 + Math.sin(time * 0.8 + i * 0.7) * 0.02;
        const scale = (isHovered || isSelected ? 1.1 : 1.0) * breathe;
        const displaySize = VESSEL_DISPLAY_SIZE * scale;

        const video = videoElements[v.id];
        const hasVideo = video && video.readyState >= 2; // HAVE_CURRENT_DATA

        ctx.save();

        // Glow effect behind vessel
        if (glowIntensity > 0 || isHovered) {
            const glowSize = displaySize * 0.6;
            const glowAlpha = 0.1 + glowIntensity * 0.2 + (isHovered ? 0.1 : 0);
            const grad = ctx.createRadialGradient(v.x, v.y, glowSize * 0.2, v.x, v.y, glowSize);
            grad.addColorStop(0, `hsla(${v.hue}, 60%, 50%, ${glowAlpha})`);
            grad.addColorStop(1, `hsla(${v.hue}, 60%, 50%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(v.x, v.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw video frame or fallback
        if (hasVideo) {
            const dx = v.x - displaySize / 2;
            const dy = v.y - displaySize / 2;

            // Circular soft mask — clip to a circle with feathered edge
            ctx.save();
            ctx.beginPath();
            ctx.arc(v.x, v.y, displaySize * 0.48, 0, Math.PI * 2);
            ctx.clip();
            ctx.globalAlpha = isHovered || isSelected ? 1.0 : 0.9;
            ctx.drawImage(video, dx, dy, displaySize, displaySize);
            ctx.globalAlpha = 1;
            ctx.restore();

            // Soft edge fade — draw a radial gradient ring to feather the clip edge
            const fadeGrad = ctx.createRadialGradient(v.x, v.y, displaySize * 0.36, v.x, v.y, displaySize * 0.52);
            fadeGrad.addColorStop(0, 'rgba(10, 10, 26, 0)');
            fadeGrad.addColorStop(1, 'rgba(10, 10, 26, 1)');
            ctx.fillStyle = fadeGrad;
            ctx.beginPath();
            ctx.arc(v.x, v.y, displaySize * 0.52, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Fallback: simple glowing circle while videos load
            ctx.beginPath();
            ctx.arc(v.x, v.y, displaySize * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${v.hue}, 50%, 40%, 0.3)`;
            ctx.fill();
            ctx.strokeStyle = `hsla(${v.hue}, 40%, 55%, 0.5)`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Selection ring
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, displaySize * 0.52, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${v.hue}, 50%, 65%, 0.5)`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();

        // Label below vessel
        ctx.save();
        const labelAlpha = isHovered || isSelected ? 1.0 : 0.6;
        ctx.globalAlpha = labelAlpha;
        ctx.font = `${isHovered || isSelected ? '13px' : '11px'} Georgia, "Cormorant Garamond", serif`;
        ctx.fillStyle = `hsla(${v.hue}, 30%, 70%, 1)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(v.name, v.x, v.y + displaySize * 0.52 + 6);

        // Essence on hover/select
        if (isHovered || isSelected) {
            ctx.font = 'italic 10px Georgia, "Cormorant Garamond", serif';
            ctx.fillStyle = `hsla(${v.hue}, 25%, 60%, 0.7)`;
            ctx.fillText(v.essence, v.x, v.y + displaySize * 0.52 + 22);
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
        if (Math.sqrt(dx * dx + dy * dy) < VESSEL_DISPLAY_SIZE * 0.5 + 10) {
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
