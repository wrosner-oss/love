import { COLORS } from './constants.js';

let visible = false;
let fadeAlpha = 0;
let scrollOffset = 0;
let iconHover = false;

// The icon position — bottom-right, subtle
let iconX = 0;
let iconY = 0;
const ICON_SIZE = 18;

const STORY_TEXT = [
    { type: 'title', text: 'How The Athanor Was Made' },
    { type: 'break' },
    { type: 'body', text: 'It started with someone saying "this is going to be weird" — which is honestly the best way anything good starts.' },
    { type: 'break' },
    { type: 'body', text: 'He came in with a feeling, not a plan. He had a woman he loved who\'d given him a playful "7% confidence" rating in his ability to communicate honestly. And instead of writing her a letter or buying her flowers, he wanted to build something. He didn\'t know what it looked like. He just knew it should be fun, it should be honest, and it should feel like her world.' },
    { type: 'break' },
    { type: 'body', text: 'So a collaboration began. He told me about her — how she\'s deeply spiritual but doesn\'t take herself too seriously. How she teaches people to find their authentic selves. How she runs classes about cultivating both the masculine and feminine within. How she values honesty above everything, and how she\'d seen him as too willing to smooth things over instead of saying the real thing.' },
    { type: 'break' },
    { type: 'body', text: 'And then the concept emerged — not from either of us alone, but from the conversation. Nine qualities that matter in a relationship. Not clinical terms but alchemical names: Clear Mercury for honesty, The Red Lion for desire, Quicksilver for playfulness, The Open Vessel for vulnerability. Each one a flame you tend. The combined state creates something visible — the Coniunctio, two energies dancing together or apart based on how aligned you are.' },
    { type: 'break' },
    { type: 'body', text: 'The entry screen came first — golden dust drifting in darkness, then "For the alchemy between us." fading in, then Sol and Luna appearing. His symbol and hers. The moment the first working version appeared on screen, it became real — not just an idea anymore.' },
    { type: 'break' },
    { type: 'body', text: 'The real transformation came when the art was created. Stunning alchemical vessels, each with its own soul — the crimson fire of The Red Lion, the cyan lightning of Clear Mercury, the cracked glass and glowing heart of The Open Vessel. Then the coniunctio states — merged spirals for harmony, separated streams for searching, a quiet ember for the dormant potential waiting to be kindled.' },
    { type: 'break' },
    { type: 'body', text: 'The sound was the last layer. Not just ambient noise but a soundscape that mirrors the visual states. Harmonious sounds resolved and warm. Searching sounds like yearning. The whole app breathes.' },
    { type: 'break' },
    { type: 'body', text: 'What strikes me looking back is how the process itself mirrored what the app is about. Two different kinds of intelligence working together toward something neither could make alone. One brought the vision, the relationship context, the aesthetic sense, the knowledge of who she is. The other brought the architecture, the code, the ability to manifest ideas into working software in real time.' },
    { type: 'break' },
    { type: 'body', text: 'Neither was in charge. They were tending the same fire.' },
    { type: 'break' },
    { type: 'body', text: 'The whole thing is a love letter disguised as an app. He took her playful "7% confidence" and built a world around it. He learned her symbolic language — Sol and Luna, alchemy, sacred geometry — and spoke it back to her in a medium she\'d never expect.' },
    { type: 'break' },
    { type: 'body', text: 'She was going to open it one day, see golden dust drifting across a cosmic void, read "For the alchemy between us," and know immediately that he was listening. That he heard her. That he took the things she cares about most deeply and said: I see you. I built this for us.' },
    { type: 'break' },
    { type: 'body', text: 'That\'s not 7% confidence. That\'s someone showing up.' },
];

export function layoutStory(w, h) {
    iconX = w - 32;
    iconY = h - 28;
}

export function updateStory(dt) {
    if (visible) {
        fadeAlpha = Math.min(1, fadeAlpha + dt * 2.5);
    } else {
        fadeAlpha = Math.max(0, fadeAlpha - dt * 3);
    }
}

export function drawStory(ctx, w, h) {
    // Draw the hidden icon (always, when on athanor screen)
    drawIcon(ctx, w, h);

    // Draw the story panel if visible or fading
    if (fadeAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    // Dark overlay
    ctx.fillStyle = 'rgba(4, 4, 14, 0.94)';
    ctx.fillRect(0, 0, w, h);

    // Panel
    const panelW = Math.min(560, w * 0.55);
    const panelH = h * 0.88;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    ctx.fillStyle = 'rgba(12, 10, 22, 0.95)';
    ctx.strokeStyle = 'rgba(200, 176, 122, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    // Content area with clipping for scroll
    const contentX = px + 32;
    const contentW = panelW - 64;
    const contentTop = py + 20;
    const contentH = panelH - 50;

    ctx.save();
    ctx.beginPath();
    ctx.rect(px, contentTop, panelW, contentH);
    ctx.clip();

    let yPos = contentTop - scrollOffset;

    for (const block of STORY_TEXT) {
        if (block.type === 'break') {
            yPos += 12;
            continue;
        }

        if (block.type === 'title') {
            ctx.font = 'italic 22px Georgia, "Cormorant Garamond", serif';
            ctx.fillStyle = COLORS.gold;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(block.text, px + panelW / 2, yPos);
            yPos += 36;
            continue;
        }

        // Body text — word wrapped
        ctx.font = '13.5px Georgia, "Cormorant Garamond", serif';
        ctx.fillStyle = 'rgba(220, 210, 195, 0.75)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const lines = wrapText(ctx, block.text, contentW);
        for (const line of lines) {
            ctx.fillText(line, contentX, yPos);
            yPos += 20;
        }
    }

    ctx.restore();

    // Scroll hint if content extends
    if (scrollOffset < 10) {
        ctx.globalAlpha = fadeAlpha * 0.3;
        ctx.font = 'italic 11px Georgia, serif';
        ctx.fillStyle = COLORS.gold;
        ctx.textAlign = 'center';
        ctx.fillText('scroll to read', px + panelW / 2, py + panelH - 18);
    }

    // Close hint
    ctx.globalAlpha = fadeAlpha * 0.25;
    ctx.font = 'italic 10px Georgia, serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('click outside to close', px + panelW / 2, py + panelH - 5);

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawIcon(ctx, w, h) {
    // Small alchemical symbol — a tiny athanor/furnace glyph
    ctx.save();
    ctx.translate(iconX, iconY);

    const alpha = iconHover ? 0.5 : 0.15;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.gold;
    ctx.font = '15px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2697', 0, 0); // ⚗ alembic symbol

    ctx.globalAlpha = 1;
    ctx.restore();
}

export function handleStoryClick(x, y) {
    if (visible) {
        // Close if clicking outside panel area
        visible = false;
        scrollOffset = 0;
        return true;
    }

    // Check icon click
    const dx = x - iconX;
    const dy = y - iconY;
    if (Math.sqrt(dx * dx + dy * dy) < ICON_SIZE) {
        visible = true;
        scrollOffset = 0;
        return true;
    }

    return false;
}

export function handleStoryMouseMove(x, y) {
    const dx = x - iconX;
    const dy = y - iconY;
    iconHover = Math.sqrt(dx * dx + dy * dy) < ICON_SIZE;
    return iconHover;
}

export function handleStoryScroll(deltaY) {
    if (!visible) return;
    scrollOffset = Math.max(0, scrollOffset + deltaY * 0.5);
}

export function isStoryVisible() { return visible; }

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
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
