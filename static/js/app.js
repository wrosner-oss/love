import { setPerson, fetchState } from './state.js';
import { initEntry, resizeEntry, updateEntry, drawEntry, handleEntryClick, handleEntryMouseMove } from './entry.js';

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

let currentScreen = 'entry'; // 'entry' | 'transition' | 'athanor'
let w = 0;
let h = 0;
let transitionAlpha = 0;
let transitionTarget = null;
let lastWallTime = 0;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (currentScreen === 'entry') resizeEntry(w, h);
}

function onPersonSelected(person) {
    setPerson(person);
    transitionTarget = 'athanor';
    currentScreen = 'transition';
    transitionAlpha = 0;

    fetchState().then(() => {
        // State loaded — transition will complete in the loop
    });
}

function tick() {
    const now = performance.now();
    const dt = lastWallTime === 0 ? 0.016 : Math.min((now - lastWallTime) / 1000, 2.0);
    lastWallTime = now;

    if (currentScreen === 'entry') {
        updateEntry(dt);
        drawEntry(ctx, w, h);
    } else if (currentScreen === 'transition') {
        transitionAlpha = Math.min(1, transitionAlpha + dt * 1.5);
        updateEntry(dt);
        drawEntry(ctx, w, h);
        ctx.fillStyle = `rgba(10, 10, 26, ${transitionAlpha})`;
        ctx.fillRect(0, 0, w, h);

        if (transitionAlpha >= 1) {
            currentScreen = transitionTarget || 'athanor';
            transitionAlpha = 1;
        }
    } else if (currentScreen === 'athanor') {
        if (transitionAlpha > 0) {
            transitionAlpha = Math.max(0, transitionAlpha - dt * 1.0);
        }
        drawAthanorPlaceholder(ctx, w, h);
        if (transitionAlpha > 0) {
            ctx.fillStyle = `rgba(10, 10, 26, ${transitionAlpha})`;
            ctx.fillRect(0, 0, w, h);
        }
    }
}

function init() {
    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('click', (e) => {
        if (currentScreen === 'entry') handleEntryClick(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (currentScreen === 'entry') handleEntryMouseMove(e.clientX, e.clientY, canvas);
    });

    initEntry(w, h, onPersonSelected);

    // Primary: requestAnimationFrame for smooth visible-tab rendering
    function rafLoop() {
        tick();
        requestAnimationFrame(rafLoop);
    }
    requestAnimationFrame(rafLoop);

    // Fallback: setInterval for background tabs (throttled but still runs)
    setInterval(() => {
        tick();
    }, 100);
}

function drawAthanorPlaceholder(ctx, w, h) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.4);
    grad.addColorStop(0, 'rgba(40, 30, 50, 0.3)');
    grad.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'italic 300 26px Georgia, "Cormorant Garamond", serif';
    ctx.fillStyle = '#c8b07a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('The Athanor awakens...', w / 2, h / 2);
}

init();
