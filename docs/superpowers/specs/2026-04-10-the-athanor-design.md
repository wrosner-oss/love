# The Athanor — Design Spec

A fanciful web app for two people (Wes and Amelia) to express and visualize the quality of their romantic connection through an alchemical metaphor. Sacred and playful in equal measure.

## Context

Amelia is deeply into the mystical/spiritual world — Eros, Tantra (as life force), Inner Marriage (cultivating both masculine and feminine), authenticity. She values honesty and directness above all. Wes is building this as a surprise gift. The app embodies the practice she teaches: look inward honestly, then bring that outward into a shared space.

## Core Concept

An alchemist's furnace (athanor) where two people tend nine flames, each representing a quality of their relationship. The combined state produces a generative visualization — the Coniunctio — that reflects the harmony or dissonance between them in real time. No numbers. No scores. You feel it.

## Entry Experience

- Dark, warm screen — deep indigo fading to black, faint golden particle dust drifting
- First visit for Amelia: a single line fades in — *"For the alchemy between us."* — before anything else appears
- Two alchemical symbols appear:
  - Sun glyph (Sol) with "Wes" — represents the masculine principle
  - Moon glyph (Luna) with "Amelia" — represents the feminine principle
- Tap your symbol to enter. No login, no password.
- Sol/Luna symbolism maps directly to alchemical tradition. She will recognize it immediately.

## The Main View: The Athanor

### Layout
- Dark warm background — deep indigo/black with subtle texture, like looking into deep water at night
- Faint golden particles drift throughout, giving life even when still
- Nine vessels arranged in an organic circle/mandala pattern
- Center of the circle: the Coniunctio visualization

### The Nine Vessels

Each is a stylized alchemical flask/crucible with a slightly different shape. Luminous, hand-drawn, sigil-like quality.

| Quality | Alchemical Name | Essence |
|---|---|---|
| Honesty/Directness | Clear Mercury | Are we saying the real thing? |
| Trust | The Foundation Stone | Do I believe you? |
| Presence | The Still Point | Are we actually here? |
| Eros/Desire | The Red Lion | The pull between us |
| The Physical | Sacred Fire | Bodies, touch, embodiment |
| Playfulness | Quicksilver | Lightness, mischief, fun |
| Vulnerability | The Open Vessel | Showing what's unfinished |
| Independence | Sovereign Gold | Healthy space, selfhood |
| Creative Energy | Prima Materia | Making each other more alive |

### Vessel Anatomy
- Alchemical flask shape (unique per quality)
- Flame beneath — the primary interaction element
- Luminous liquid inside that glows and swirls based on flame intensity
- Two colors of liquid — one for each person's reading
  - When readings are close: colors blend into something new
  - When readings diverge: colors separate like oil and water

## Interaction: Tending the Flames

### The Gesture
Drag the flame beneath a vessel up or down. Not a slider — an actual flame shape that stretches and shrinks. As the flame rises, the liquid responds: glowing brighter, swirling faster. The center visualization shifts in real time.

### Five Levels (felt, not labeled)
1. **Ember** — barely glowing, just a coal
2. **Flickering** — small, tentative flame
3. **Kindling** — steady warmth, growing
4. **Burning** — strong, confident fire
5. **Blazing** — full radiance, completely alive

### Rules
- You can only adjust your own flames, never your partner's
- Your partner's readings are visible (their liquid color) but not interactive
- You don't have to adjust everything every visit — changing one flame is a complete visit
- Changes persist immediately and are visible to the other person on their next visit

## The Coniunctio (Center Visualization)

The heart of the app. A generative, abstract energy visualization driven by the combined state of all nine vessels.

### Two Energy Forms
- **Solar energy** (Wes) — warm, golden, structured movement
- **Lunar energy** (Amelia) — cool, silver, fluid movement

### Behavioral States
- **High alignment** — energies weave together fluidly, almost breathing as one. Harmonious, hypnotic.
- **Mixed alignment** — complex dance with visible counterpoint. Beautiful but with tension. Some qualities pull together, others create dissonance.
- **Low alignment** — energies move independently, different rhythms. Not ugly — but searching for each other.

### Key Principle
There is no number. The visualization IS the reading. Dissonance is not displayed as failure — it's displayed as two energies that haven't found their rhythm yet. Even low alignment is visually alive and beautiful in its own way.

## History: Layers Over Time

### Concept
History is not a graph. It's sediment — like layers in glass or rings in a tree.

### Implementation
- Tapping a vessel reveals its history as a band of color that shifts over time
- Early days show movement and volatility
- As things stabilize, bands become more coherent
- Each adjustment is timestamped quietly
- History is for reflection, not scorekeeping

## Technical Architecture

### Frontend
- Single-page web app
- HTML Canvas or WebGL for generative visuals
- Vanilla JS or light framework — complexity budget goes to visuals, not framework overhead
- Laptop-first design (won't break on mobile, but optimized for larger screens)

### Backend
- Simple server (Node or Python) for state persistence
- Lightweight database (SQLite) — only two users, minimal data
- REST API: read state, write adjustments, read history

### Authentication
- None in the traditional sense
- Pick your symbol (Sun/Moon) to enter
- Optional: shared secret in URL path for minimal protection

### Data Model
- Each adjustment: who, which vessel, what level, when
- Current state: most recent reading per person per vessel
- History: ordered list of all adjustments over time

## Explicit Non-Goals (v1)

- No notifications or push alerts
- No chat or messaging
- No mobile-specific design
- No onboarding tutorial — discovery through touch
- No AI interpretation of readings
- No percentage or numeric score (easter egg possibility later)

## Visual Direction

- **Palette:** Deep indigo/black base. Gold and warm amber for Wes/solar. Silver and cool blue-white for Amelia/lunar. Rich jewel tones in the vessel liquids.
- **Aesthetic:** Alchemical meets abstract energy. Hand-drawn sigil quality for vessels. Fluid, generative, particle-based for the Coniunctio. Nothing should feel like software.
- **Motion:** Everything breathes. Even idle, particles drift, liquids slowly swirl, the Coniunctio pulses gently. The app is alive.
- **Typography:** Something with character — not a system font. Maybe slightly mystical but still legible. Clean enough for Wes, evocative enough for Amelia.
