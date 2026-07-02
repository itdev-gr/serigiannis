# Design System: Sergiani Travel — "Editorial" (derived from travel.gr/en)

**Source reference:** https://www.travel.gr/en/ (design language only — no assets/content copied)
**Applies to:** the Sergiani Travel Next.js frontend rebuild. Backend, data (254 tours), and the Supabase dashboard are unchanged.

## 1. Visual Theme & Atmosphere

**Curated editorial sophistication.** The mood is that of a trusted travel *publication* rather than a booking storefront: content-first, confident, and airy. Big aspirational photography does the emotional work; crisp black serif headlines carry authority; a single bold red is used sparingly as a signal. Generous whitespace and an asymmetric, magazine-style grid create a contemplative, unhurried rhythm. Nothing is crammed, nothing shouts — restraint *is* the aesthetic. Flat surfaces, near-invisible shadows, and clean edges keep the focus on imagery and typography.

Adjectives: **Editorial · Airy · High-contrast · Confident · Photographic · Restrained.**

## 2. Color Palette & Roles

| Descriptive Name | Hex | Functional Role |
|---|---|---|
| Editorial Ink | `#000000` | Primary headlines and high-emphasis text. Pure, magazine-black. |
| Graphite | `#333535` | Body copy and secondary text on light surfaces. |
| Signal Red | `#d4002a` | The one accent: category labels, active/hover nav, primary CTAs, links, key highlights. Used sparingly and deliberately. |
| Deep Red | `#a80020` | Signal Red hover/pressed state. |
| Golden Ochre | `#fcb900` | Rare secondary accent — a warm highlight/underline; never a text background behind white. |
| Paper White | `#ffffff` | Cards and elevated surfaces. |
| Paper Grey | `#f4f4f4` | Page background and soft alternating sections — a warm-neutral newsprint tone. |
| Hairline Grey | `#c9c8cd` | Thin dividers, card/section separators. |
| Muted Slate | `#5f6b73` | Metadata, captions, location tags (darkened from the source's `#9ca4ab` to meet WCAG AA on white). |
| Cream Wash | `#fff8e0` | Occasional soft feature-section tint. |

**Contrast rules (WCAG AA):** Ink/Graphite on Paper (21:1 / 11:1) ✅. Signal Red on white and white on Signal Red both ≈5.9:1 — red text and red buttons are both allowed ✅. Golden Ochre and Hairline Grey are **decorative/structural only — never behind small or white text.** Metadata uses Muted Slate `#5f6b73` (≈4.6:1), not the lighter source grey.

## 3. Typography Rules

Two families. A **high-contrast display serif** for headlines (mapping the source's PF Regal Display / Brummell), and a **neutral grotesk sans** for body/UI (mapping the source's Arial/Helvetica body).

- **Display — Fraunces** (Google Fonts; variable, high optical contrast). Weights 400/500/600/700, with the "SOFT"/opsz character dialed for editorial elegance. Used for: hero titles (clamp 40–72px), section headings (32–48px), card titles (20–24px). Tight leading (1.05–1.15), letter-spacing `-0.01em`. Serif = authority + magazine presence.
- **Body / UI — Inter** (Google Fonts). Weights 400/500/600. Body 16–17px, line-height **1.7** (spacious, editorial). Max line length ~66ch.
- **Accent labels / eyebrows — Inter**, 11–12px, **UPPERCASE**, letter-spacing `0.14em`, weight 600 — for category tags, location/meta, and section kickers.

*Rationale:* Fraunces reproduces the "regal display" high-contrast serif feel with a modern, distinctive edge; Inter gives the clean, neutral body the source relies on. (If a more classic Didone is preferred, Playfair Display is the drop-in alternative for Display.)

## 4. Component Stylings

* **Buttons.**
  - *Primary:* Signal Red solid, white text, **pill-shaped** (`rounded-full`), generous padding (14×28px), Inter 600, **no shadow**. Hover: Deep Red + subtle 1px lift (translate-y). 
  - *Secondary / tertiary:* text-forward — label + arrow "→", Ink text, red on hover, animated underline. No fill, no shadow.
  - *On-image:* white outline (1.5px) pill, white text; hover fills white with Ink text.
* **Cards (article/tour).** **Image-first:** photo occupies the top ~65% (`aspect-[3/2]`), **subtly rounded (6px)**, **no border**, **flat or whisper-soft shadow** — cards are separated by whitespace, not chrome. **Category badge** top-left of the image: uppercase 10–11px, Signal-Red text on a translucent white chip (or solid red chip with white text for emphasis). Title in Fraunces 20–24px (Ink) below the image; **location/meta** line with a small pin icon in Muted Slate. Hover: image scales `1.04`, title turns Signal Red. No heavy elevation.
* **Inputs / Forms.** Minimal and quiet: Paper-White field, **thin 1px Hairline-Grey border** (or bottom-rule style), `rounded-md`, 16px text, Ink. Focus: border → Ink, subtle red focus ring. Labels: Inter 12px uppercase, Muted Slate. Errors: Signal Red text below.
* **Category badges / tags.** Uppercase 10–11px, `0.12em` tracking; either Signal-Red text on translucent white, or solid Signal-Red on white text. Pill or small-radius.
* **Navigation.** Clean, minimal, tall-ish header on Paper. Logo left. Horizontal nav in Inter (uppercase small caps optional), Ink text, **Signal-Red on hover/active** with an animated underline. Language/utility top-right. On scroll: subtle Paper background + hairline bottom border (no heavy glass). Mobile: hamburger → full-screen Paper overlay, large Fraunces links.

## 5. Layout Principles

- **Asymmetric editorial grid.** Not a rigid uniform 3-col. Featured stories span larger (e.g., a 7/5 or 8/4 split); supporting content flows in varied widths beneath. Home reads like a magazine cover spread.
- **Generous whitespace.** Section vertical padding `py-24`–`py-32`; card gaps 24–32px; big top/bottom section margins. Breathing room signals editorial confidence.
- **Container:** `max-w-[1280px]`; editorial prose capped ~66ch; full-bleed heroes.
- **Hero:** large full-width photography with a dark bottom-anchored gradient; title bottom-left in Fraunces; location/kicker above it; minimal, no autoplay clutter.
- **Depth:** flat. Shadows are near-invisible (`0 1px 2px` at most, or none). Separation comes from whitespace, hairlines, and type scale — not elevation.
- **Imagery:** aspirational but authentic; always `object-cover`, high quality, generous. Photography is the primary visual voice.
- **Motion (rebuild):** restrained and editorial — Framer Motion fade/rise reveals on scroll, image `scale` on card hover, animated underlines, a quiet page transition; GSAP reserved for a hero parallax. All gate on `prefers-reduced-motion`. No bounce, no flashy gimmicks — motion should feel like turning a magazine page.

---

### Implementation mapping (tokens)
`ink #000000 · graphite #333535 · red #d4002a / #a80020 · ochre #fcb900 · paper #ffffff · paper-grey #f4f4f4 · hairline #c9c8cd · muted #5f6b73`. Fonts: `display: Fraunces`, `sans: Inter`. Radius: cards `6px`, buttons `full`. Shadow: near-flat.
