---
schemaVersion: 1
scope: workspace
updatedAt: "2026-06-23T15:44:00.237Z"
workspaceName: "Northstar Canvas Launch Page"
---

# Project Memory

## Project Overview
Landing page for Northstar Canvas, a collaborative whiteboard tool. Bold launch campaign with real product copy, SVG-only visuals, and interactive in-page demos.

## Current State
- App.jsx: fully built page with hero banner, countdown, feature tour, pricing, FAQ, CTA footer.
- DESIGN.md: created with color/token system (deep navy #0b0f1c, cyan accent oklch(70% 0.15 200), gold CTA oklch(75% 0.2 45), typography Inter, spacing scale 4-8-12-16-20-24-32-40-48-64).
- Preview verified: 338 nodes, no errors.

## Artifacts
- App.jsx: Complete React single-file component for the launch page.
- DESIGN.md: Design system tokens (colors, typography, spacing, radii, shadows) in Google-compatible format.

## Design Direction
- Palette: deep navy background (space) with cyan for interactive elements, gold for primary CTA — evokes “north star guidance” + warmth.
- No generic gradients or stock imagery; every visual is an inline SVG (sticky notes, flow lines, cursor, embed panels).
- Interactive feature tour (3-tab switcher), FAQ accordion, countdown timer banner, three-tier pricing card with 40% launch discount strikethrough.
- Responsive: single-column stack on mobile, multi-column on tablet/desktop.

## User Feedback
- None received beyond the initial brief.

## Decisions
- Use React (no framework) for portability.
- All visuals inline SVG for zero asset dependencies.
- Pricing: highlighted “Team” plan with launch discount, anchor pricing for “Free” and “Pro” tiers.
- Banner: launch announcement with countdown timer.
- FAQ: click-to-toggle accordion, all closed by default.

## Open Questions
- Whether to add a video/gif or keep static SVG.
- Need for copy polish on legal/terms links.
- Whether to include a demo video section or leave as feature tour.

## Next Steps
- Hand off for copy review and client approval.
- Consider adding smooth scroll animations for section entries.
- Possibly extract color/type tokens into a CSS file if used outside App.jsx.

## Promotion Candidates For DESIGN.md
- All current tokens already written to DESIGN.md; no pending promotion.

## Recent History
- 2026-06-23: Created App.jsx (first pass) and DESIGN.md.
- Applied craft-polish and responsive-layout skills.
- Fixed malformed JSX comment (`{/* North star */}`) and replaced `href="#"` with `<button>` for interactive elements.
- Preview verified clean.