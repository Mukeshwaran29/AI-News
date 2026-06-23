---
version: alpha
name: Northstar Canvas Launch Page
---

## Overview

Product launch page for Northstar Canvas — a real-time collaborative whiteboard for product teams. Bold campaign energy, dark space-inspired palette, and concrete product signal throughout.

## Colors

| Token | Value | Usage |
|---|---|---|
| `--accent` | `oklch(0.72 0.18 200)` | Primary interactive, links, badges |
| `--accent-dim` | `oklch(0.55 0.14 200 / 0.3)` | Subtle accents, hover surfaces |
| `--accent-glow` | `oklch(0.72 0.18 200 / 0.15)` | Glow backgrounds |
| `--cta` | `oklch(0.78 0.20 45)` | Primary buttons |
| `--cta-hover` | `oklch(0.85 0.18 45)` | Button hover |
| `--surface` | `#131829` | Card, section surfaces |
| `--surface-2` | `#1a2038` | Elevated surface |
| `--text` | `#f1f5f9` | Primary body/heading |
| `--text-muted` | `#8892b0` | Secondary text |
| `--border` | `#1e2940` | Borders, dividers |
| `--bg` | `#0b0f1c` | Page background |

## Typography

| Level | Size | Weight | Style |
|---|---|---|---|
| Hero H1 | `clamp(2.5rem, 5vw, 3.8rem)` | 750 | Tight letter-spacing -0.03em |
| Section H2 | `clamp(2rem, 3.5vw, 2.8rem)` | 700 | -0.02em tracking |
| Feature H3 | `1.6rem` | 650 | -0.01em tracking |
| Body | `1.05rem` / `0.95rem` / `0.9rem` | 400–500 | 1.7 line-height |
| UI labels | `0.85rem` / `0.8rem` | 500–600 | — |

Font stack: `SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif`

## Rounded

| Token | Value |
|---|---|
| `--radius-sm` | 6px |
| `--radius-md` | 12px |
| `--radius-lg` | 20px |
| Pill/badge | 100px |

## Spacing

Section padding: 80px 24px (desktop), 60px 20px (mobile). Content max-width: 1200px. Grid gap: 24px spacing between cards.

## Components

### Launch Banner
Dismissible announcement bar with gradient bg and close action.

### Navigation
Sticky transparent nav with blur backdrop, logo wordmark, scroll links, and CTA. Mobile hamburger toggle.

### Hero
Two-column grid: badge + headline + sub + CTAs + offer chip | SVG canvas illustration with animated sticky notes and cursor. Single-column stack on mobile.

### Feature Tabs
Segmented tab bar switching between Infinite Canvas, Real-Time Collaboration, Smart Shapes, and Integrations. Each tab shows text panel + SVG visual. Animated fade transition.

### Quote Card
Large pull quote with colored open-quote ornament, attribution with monogram avatar.

### Pricing Grid
Three-tier cards (Starter, Team featured, Business). Team card has accent border + glow + scale + launch badge. Strike-through original price. Missing features shown with muted X icon.

### FAQ Accordion
Expand/collapse with chevron rotation animation. Single open at a time.

### CTA Footer
Gradient-surfaced wrap-up section with dual buttons. Footer bottom shows logo, link row, copyright.

## Tweak Controls

- `accentHue` (200): Cyan accent hue
- `ctaHue` (45): Gold CTA hue
- `density` (1): Spacing multiplier
