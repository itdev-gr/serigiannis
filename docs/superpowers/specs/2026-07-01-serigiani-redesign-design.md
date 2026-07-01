# Sergiani Travel — Website Redesign Design Spec

**Date:** 2026-07-01
**Client:** Sergiani Travel (sergianitravel.gr) — Greek travel agency, Peristeri Athens, est. 1995
**Deliverable:** React template redesign of 5 pages (Home, Day Trips, Cruises, Bus Rentals, Contact)
**Design system name:** "Aegean Editorial"

---

## 1. Goals & Non-Goals

### Goals
- Deliver a **template-quality** redesign that the agency can present to the client as a fully-functional React demo.
- Establish a distinctive **"Aegean Editorial"** design language that differentiates from generic WordPress travel templates.
- Preserve the current site's information architecture (categories, offerings) while dramatically improving hierarchy, aspiration, and conversion clarity.
- All 5 pages must be **production-quality**: fully responsive (375 / 768 / 1024 / 1440 px), accessible (WCAG AA), animated with intentional GSAP motion.
- Copy stays in **Greek** to match the audience (Athens-based travelers).

### Non-Goals
- No backend / booking engine — this is a static React template with mock trip data.
- No CMS integration in this phase.
- No i18n — Greek only for now.
- No payment flow.
- No user authentication.

---

## 2. Visual Theme & Atmosphere

**Mood:** Warm, aspirational, sun-drenched Mediterranean. Editorial travel-magazine quality (think Condé Nast Traveler Greece issue) meets accessible family-agency approachability.

**Aesthetic philosophy:** Photography does the selling. Typography carries the authority (30 years of experience). Motion adds cinematic depth without gimmicks. Whitespace is generous — content breathes like magazine pages.

**Anti-patterns explicitly rejected:**
- Generic navy-and-orange travel-booking color scheme.
- Small e-commerce product tiles in uniform grids.
- Stock-photo smiles, low-contrast pastel gradients, "AI SaaS" clean-slate minimalism.
- Emojis as icons.
- Placeholder "0" stats (a bug on the current site).

---

## 3. Color Palette & Roles

| Token | Descriptive Name | Hex | Functional Role |
|---|---|---|---|
| `--color-primary` | Aegean Deep | `#1B3A5C` | Primary brand color: navigation, headings, dark story sections. Deep sea at dusk. |
| `--color-sea` | Sea Breeze | `#5B9FD4` | Interactive accents: links, active states, category tags. Aegean shallows. |
| `--color-cta` | Terracotta | `#C96A47` | All primary CTA buttons and price badges. Mediterranean warmth; 7:1 contrast on ivory. |
| `--color-cta-hover` | Deep Terracotta | `#B25939` | CTA hover state. |
| `--color-bg` | Ivory Sand | `#F7F2EB` | Page background — warmer than pure white; evokes editorial paper stock. |
| `--color-surface` | White Stone | `#FDFCFA` | Card and elevated surface backgrounds. |
| `--color-text` | Charcoal | `#1A1817` | Primary body text. |
| `--color-muted` | Warm Stone | `#6B6259` | Secondary text, captions, metadata. |
| `--color-olive` | Aegean Olive | `#6E7C4A` | Nature/hiking accent tag; secondary accent. |
| `--color-dark-bg` | Deep Ink | `#0F2233` | Dark story sections, hero image overlays. |
| `--color-border` | Faint Aegean | `rgba(27, 58, 92, 0.12)` | Dividers, card borders. |

**Semantic mapping (Tailwind config extension):**
- `bg-primary` → Aegean Deep
- `bg-background` → Ivory Sand (page default)
- `bg-surface` → White Stone (cards)
- `bg-cta` → Terracotta
- `text-body` → Charcoal
- `text-muted` → Warm Stone

---

## 4. Typography Rules

**Font stack loaded via Google Fonts:** Playfair Display (400, 500, 600, 700, italics) + Inter (300, 400, 500, 600, 700).

| Role | Family | Weight | Size (desktop / mobile) | Line-height | Letter-spacing | Notes |
|---|---|---|---|---|---|---|
| Hero display (H1) | Playfair Display | 700 | 96 / 56 px | 1.05 | -0.02em | Destination names, page titles. |
| Section heading (H2) | Playfair Display | 600 | 56 / 40 px | 1.1 | -0.015em | Section titles. |
| Editorial subhead (H3) | Playfair Display Italic | 500 | 32 / 24 px | 1.2 | 0 | Pull-quote style. |
| Card title (H4) | Playfair Display | 600 | 24 / 22 px | 1.25 | 0 | Trip card destinations. |
| Body | Inter | 400 | 16 px (min) | 1.65 | 0 | Max 68ch line length. |
| Body large | Inter | 400 | 18 / 17 px | 1.6 | 0 | Editorial intro paragraphs. |
| UI label | Inter | 500 | 12 px, uppercase | 1 | 0.12em | Categories, nav, badges. |
| Button | Inter | 600 | 15 px | 1 | 0.02em | Buttons. |
| Price | Inter | 700 | 20 px | 1 | 0 | Tabular-nums for alignment. |
| Caption | Inter | 400 | 13 px | 1.5 | 0 | Metadata, timestamps. |

**Pairing rationale:** Playfair Display's high-contrast serif conveys travel-magazine authority and makes Greek destination names (Μετέωρα, Ύδρα, Σαντορίνη) feel monumental. Inter is the neutral workhorse for UI chrome and body copy, with excellent Greek script support.

---

## 5. Component Stylings

### Buttons

- **Primary CTA:** Filled Terracotta background, White Stone text, `rounded-md` (6px), 44px min height, 24px horizontal padding, Inter 600 15px. Hover: darker terracotta + 4px translate-y-neg-shadow. Focus: 2px offset Aegean Deep outline.
- **Secondary CTA (on dark hero):** Transparent background, 1.5px White border, White Stone text. Hover: white background + Aegean Deep text.
- **Tertiary link:** Aegean Deep text, thin underline with 2px offset, hover moves underline to Sea Breeze.

### Cards / Containers

- **Trip cards:** White Stone background, `rounded-lg` (10px) subtly rounded, `border` 1px Faint Aegean. Photo top 60% of card, `aspect-[4/3]`, rounded top corners. Text block bottom 40% with 24px padding. Price badge absolute-positioned top-right of photo, Terracotta background, 8px 12px padding, `rounded-full`, Inter 700 14px white.
- **Shadow depth:** Whisper-soft. Base state: no shadow. Hover: `shadow-lg` = 0 20px 40px -12px rgba(15, 34, 51, 0.15). Photo scales `1.03` on card hover.
- **Feature editorial cards:** Full-bleed photo backgrounds with 60% Deep Ink gradient overlay bottom-anchored. Content bottom-left, headline in Playfair Display 700 white, subhead in Inter, CTA at bottom.

### Inputs / Forms

- **Base input:** White Stone background, 1px Faint Aegean border, `rounded-md` (6px), 44px height, 16px horizontal padding, Inter 400 16px Charcoal text.
- **Focus state:** Border becomes Aegean Deep, 3px ring with `rgba(27, 58, 92, 0.15)`.
- **Error state:** Border becomes `#C13B2D` (deeper terracotta), error text below.
- **Labels:** Above input, Inter 500 13px Charcoal, uppercase optional for section groupings.
- **Required marker:** Terracotta asterisk suffix.
- **Textarea:** Same as input, min height 140px, resize-vertical.

### Badges & Tags

- **Category tag:** Inter 500 11px uppercase tracking-wide, Sea Breeze background at 15% opacity, Aegean Deep text, `rounded-full`, 6px 12px padding.
- **Nature/hiking tag:** Same shape, Aegean Olive tint.
- **"Since 1995" trust badge:** Small pill with olive-branch icon left, Playfair Display Italic text.

### Navigation

- **Desktop nav:** Fixed top, 80px height. On hero (top of page): fully transparent, white text/logo. On scroll >80px: 68px height, White Stone background 85% opacity + 12px backdrop-blur, subtle 1px bottom border, Aegean Deep text.
- **Mobile nav:** Hamburger opens full-screen overlay in Deep Ink with large Playfair Display links stacked vertically. Close X top-right.

---

## 6. Layout Principles

- **Container widths:** `max-w-[1280px]` for most sections. `max-w-[1440px]` only for full-bleed hero content wrappers. `max-w-[680px]` for editorial prose intros.
- **Section spacing:** `py-24` (96px) desktop / `py-16` (64px) mobile between major sections.
- **Grid strategy:** Not uniform. Home page uses **asymmetric editorial grid**: 12-col grid where featured trip spans 7 cols and secondary trips fill 5 cols. Listing pages use uniform 3-col grid (2-col tablet, 1-col mobile) for scannability — the variance is between page *types*, not within a single listing page.
- **Whitespace strategy:** Generous. Section headings get 48px of top-margin breathing room. Cards get 32px gaps in grids.
- **Vertical rhythm:** 8px base unit. All spacing on multiples of 8 (8, 16, 24, 32, 48, 64, 96).
- **Photography:** Always `object-cover`, always full-bleed on hero, always high-quality. Placeholder photos in the template will use Unsplash Greek-destination photos (Santorini, Meteora, Hydra, Delphi).
- **Content max-width for readability:** Body prose blocks capped at 68ch.

---

## 7. Motion & Animation Specification

All animations gate on `prefers-reduced-motion: reduce` — motion-safe users get the full experience; motion-sensitive users get instant final states.

All GSAP tweens are stored in `useRef` and killed on unmount (React equivalent of the Vue pattern in the gsap skill).

### Global animations

| Effect | Trigger | Implementation |
|---|---|---|
| Page fade transition | Route change | `gsap.timeline()` → fade out (opacity 0, y -10) 200ms, then fade in (opacity 0→1, y 20→0) 400ms `power2.out`. |
| Nav glass morph | Scroll position >80px | ScrollTrigger toggles CSS class; class transitions `background-color`, `backdrop-filter`, `height` for 300ms. |

### Home page animations

| Effect | Trigger | Implementation |
|---|---|---|
| Hero title character reveal | On mount | Split text into words → stagger `y: 40, opacity: 0` → `y: 0, opacity: 1`, 0.08s stagger, `power3.out`, total ~1.2s. |
| Hero image parallax | Scroll | ScrollTrigger `scrub: true` → hero image `y: 20%` as page scrolls. |
| Category strip fade-in | ScrollTrigger 80% viewport | Fade + y-30 → 0, 0.6s. |
| Featured trip cards stagger | ScrollTrigger.batch, 75% viewport | y-40, opacity 0 → 1, stagger 0.1s, `power2.out`. |
| Stats counter | ScrollTrigger 90% viewport | Number counter tween from 0 to target value over 1.5s `power2.out`. |
| Editorial feature mask reveal | ScrollTrigger 70% viewport | `clip-path: inset(0 100% 0 0)` → `inset(0 0% 0 0)`, 1.2s `power4.out`. Reveals photo from left to right. |
| Testimonial fade-in | ScrollTrigger 70% viewport | y-20 → 0, opacity 0 → 1, stagger 0.15s. |

### Listing page (Day Trips / Cruises) animations

| Effect | Trigger | Implementation |
|---|---|---|
| Page hero fade-in | On mount | Simple fade + y-20, 500ms. |
| Trip cards batch reveal | ScrollTrigger.batch | Trigger when 60% in view, stagger 0.08s, opacity + y-30 → 0. |
| Filter bar sticky | Scroll >200px | CSS position: sticky; adds shadow via class toggle. |
| Card hover | Hover | Photo `scale(1.03)`, card `translate-y-[-4px]`, shadow deepens. All CSS transitions (150-300ms, `power2.out` cubic-bezier). |

### Bus Rentals page animations

| Effect | Trigger | Implementation |
|---|---|---|
| Value props stagger | ScrollTrigger 80% | Stagger 0.1s icon-scale + text fade. |
| Route cards | ScrollTrigger.batch | Same batch pattern as trip cards. |
| Use case cards | ScrollTrigger | Horizontal stagger 0.15s. |
| Quote form focus | Input focus | Border color transitions to Aegean Deep + ring appears, 200ms. |

### Contact page animations

| Effect | Trigger | Implementation |
|---|---|---|
| Two-column reveal | On mount | Form (left) slides in from left, info card (right) slides in from right, both 0.6s `power3.out`. |
| Form field focus | Focus | Border + ring, 200ms. |
| Submit success | On submit success | Green check icon scales in + form transitions to success message. |

### Reduced-motion fallback

When `prefers-reduced-motion: reduce`:
- All ScrollTrigger animations become instant `set()` calls to final state.
- Route transitions become instant.
- Hover transitions remain (they're already brief).
- Parallax is disabled.

---

## 8. Information Architecture

### Sitemap

```
/                     → Home
/monoimeres           → Day Trips listing
/kroyazieres          → Cruises listing
/pullman-rentals      → Bus Rentals
/epikoinonia          → Contact
```

### Global chrome

**Header nav (order):**
1. Logo (links home)
2. Αρχική (Home)
3. Εκδρομές (dropdown: Μονοήμερες, Κρουαζιέρες)
4. Ενοικιάσεις Πούλμαν
5. Επικοινωνία
6. CTA button: "Κλείστε Θέση" → scrolls to featured trips or opens contact form

**Footer:**
- Column 1: Logo + tagline + "Από το 1995"
- Column 2: Quick links (all pages)
- Column 3: Contact info (address, phones, hours)
- Column 4: Social icons (Facebook, Instagram, YouTube, TripAdvisor)
- Bottom bar: © 2026 Sergiani Travel · Terms · Privacy

---

## 9. Page-Level Specifications

### 9.1 Home page

Sections in order, all full-width unless noted:

1. **Hero** (100vh):
   - Full-bleed background photo (Santorini aerial or Meteora sunrise), Deep Ink gradient overlay bottom-heavy.
   - Small trust badge top-center: "ΑΠΟ ΤΟ 1995 · ΤΑΞΙΔΙΩΤΙΚΟ ΓΡΑΦΕΙΟ ΠΕΡΙΣΤΕΡΙ"
   - H1: "Ανακαλύψτε την Ελλάδα" (Playfair Display, white, 96px desktop).
   - Subhead: "Μονοήμερες, κρουαζιέρες, πολυήμερες. Από την Αθήνα, με 30 χρόνια εμπειρίας."
   - CTAs: Terracotta primary "Δείτε τις Εκδρομές" + White ghost "Ενοικίαση Πούλμαν".
   - Animated chevron scroll indicator bottom-center.

2. **Category strip** (below hero):
   - 6 pill categories with small Lucide icons: Μονοήμερες, Κρουαζιέρες, Πολυήμερες, Θαλάσσια Μπάνια, Πεζοπορίες, Πούλμαν.
   - Horizontal scroll on mobile, centered on desktop.

3. **Featured trips section** (`py-24`):
   - Section heading "Οι Πιο Δημοφιλείς Εκδρομές" + short subhead.
   - Asymmetric editorial grid: 1 large card (7 cols, tall) + 2 smaller cards (5 cols, stacked).
   - Cards: Meteora (large), Hydra + Cape Sounio (small).

4. **About / stats strip** (dark section, Deep Ink background, `py-24`):
   - Left column: H2 "30 χρόνια δημιουργούμε αναμνήσεις" + short paragraph in Inter light.
   - Right column: 4 stats in 2x2 grid: Playfair Display 72px numbers, Inter 500 uppercase 13px labels beneath.
     - "30+ ΧΡΟΝΙΑ ΕΜΠΕΙΡΙΑΣ"
     - "500+ ΕΚΔΡΟΜΕΣ ΤΟΝ ΧΡΟΝΟ"
     - "10.000+ ΤΑΞΙΔΙΩΤΕΣ"
     - "50+ ΠΡΟΟΡΙΣΜΟΙ"

5. **Editorial destination feature** (`py-32`):
   - Full-bleed 60vh section: alternating alignment (image left, text right).
   - "Αυτό το Σαββατοκύριακο: Ύδρα" — pull-quote style headline in Playfair Display Italic.
   - Short editorial paragraph + "Κλείστε Θέση" CTA.
   - Mask-reveal animation on scroll.

6. **Cruises teaser** (`py-24`):
   - Heading "Κρουαζιέρες Σαρωνικού".
   - 3 cruise cards in a horizontal row (grid-cols-3 desktop, 1 mobile).
   - CTA at bottom: "Δείτε όλες τις Κρουαζιέρες →".

7. **Testimonials** (`py-24`, Ivory Sand background):
   - Heading "Τι λένε οι ταξιδιώτες μας".
   - 3 testimonials in editorial-blockquote format: giant Playfair Display italic opening quote mark, quote text in Playfair Display Italic 22px, name + city in Inter 500 12px uppercase.

8. **Contact strip** (Terracotta background, white text, `py-16`):
   - "Έτοιμοι για την επόμενη περιπέτεια;" + phone numbers large and clickable + "Ή στείλτε μήνυμα →" link.

9. **Footer** (Deep Ink background).

### 9.2 Day Trips listing page (/monoimeres)

1. **Page hero** (60vh):
   - Photo: Psatha beach or Hydra harbor.
   - H1 "Μονοήμερες Εκδρομές", subhead "Από Αθήνα · 2026".
   - Small breadcrumb above H1: Αρχική / Εκδρομές / Μονοήμερες.

2. **Intro paragraph** (max 680px, centered, Playfair Italic 18px):
   - Short editorial intro.

3. **Sort bar** (sticky at top when scrolling):
   - "Ταξινόμηση:" label + inline links: Δημοφιλείς · Τιμή ↑ · Τιμή ↓ · Ημερομηνία.
   - Simple, no facet filters.

4. **Trip grid**:
   - 3-col desktop, 2-col tablet, 1-col mobile.
   - 12 mock trips (based on real data: Ψάθα, Τήνος, Λιχαδονήσια, Ύδρα, Σπέτσες, Μετέωρα, Δελφοί, Ναύπλιο, Ανδρος, Σκύρος, Πήλιο, Ακρ. Σούνιο).
   - Each card: 4:3 photo, price badge, destination H4, 2-line description, date(s), Inter 500 caption for duration, "Κράτηση →" text link.

5. **Pagination**:
   - Elegant chevron arrows + numeric pages. Active page in Terracotta.

6. **Footer**.

### 9.3 Cruises listing page (/kroyazieres)

1. **Page hero** (70vh):
   - Nautical photo (Saronic islands aerial).
   - H1 "Κρουαζιέρες", subhead "Σαρωνικός · Αργοσαρωνικός".

2. **Editorial intro paragraph** (centered, max 680px).

3. **Cruise cards** (stacked vertically, full-width, each ~500px tall):
   - Card 1: Σαλαμίνα · Αίγινα · Αγκίστρι — Από 20€ — Κάθε Κυριακή.
   - Card 2: Κολύμβησης Αγκίστρι · Μετώπη · Αίγινα — Από 55€ — Καθημερινά.
   - Card 3: Ύδρα · Πόρος · Αίγινα — Από 55€ — Καθημερινά.
   - Each card: full-width photo left (50%), content right (50%), reversed on alternating cards. Route as tag chip. Islands as inline dot-separated list. Duration + price prominent. "Κράτηση" CTA.

4. **"Book by phone" CTA strip** (Aegean Deep background):
   - "Προτιμάτε τηλεφωνικά;" + phone numbers.

5. **Footer**.

### 9.4 Bus Rentals page (/pullman-rentals)

1. **Page hero** (60vh):
   - Photo of a coach on a Greek coastal road.
   - H1 "Ενοικιάσεις Πούλμαν", subhead "Εκδρομές · Μεταφορές · Εταιρικά".

2. **Value props strip** (`py-16`):
   - 4-column icon grid: "Έμπειροι Οδηγοί", "Σύγχρονος Στόλος", "Καθόλη την Ελλάδα", "24ώρη Εξυπηρέτηση".
   - Lucide icons in Aegean Deep circles.

3. **Featured routes section** (`py-24`):
   - Heading "Δημοφιλείς Διαδρομές" + subhead.
   - 5 route cards in a 2+3 asymmetric grid.
   - Each card: small map/pin icon, route name (Playfair Display 22px), duration badge, "Λεπτομέρειες →" link.
   - Routes: Αθήνα → Σούνιο, Αθήνα → Μετέωρα, Αθήνα → Δελφοί, Αθήνα → Ολυμπία, Περιήγηση Αθήνας.

4. **Use cases section** (`py-24`, Ivory Sand background):
   - 3 horizontal cards: "Σχολικές Εκδρομές", "Εταιρικές Μεταφορές", "Ιδιωτικές Εκδρομές".
   - Each: Lucide icon + H3 + 2-line description.

5. **Quote request CTA strip** (Deep Ink background, `py-32`):
   - Left: H2 "Ζητήστε την προσφορά σας" + tel: links formatted large.
   - Right: Mini form: Name, Phone, Date, Notes, Submit (Terracotta button).

6. **Footer**.

### 9.5 Contact page (/epikoinonia)

1. **Page hero** (40vh, light background — no photo needed, just editorial header):
   - H1 "Επικοινωνία", subhead address line.

2. **Two-column layout** (`py-24`, 12-col grid, form spans 7 cols, info spans 5 cols):

   **Form column:**
   - Fields: Ονοματεπώνυμο*, Email*, Τηλέφωνο, Θέμα*, Μήνυμα.
   - React Hook Form validation, inline error messages.
   - Submit: "Αποστολή Μηνύματος" Terracotta button, full width.
   - Success state: Green check + "Το μήνυμά σας εστάλη. Θα επικοινωνήσουμε σύντομα."

   **Info card column** (Deep Ink background, white text, sticky on scroll):
   - Address block with map-pin icon.
   - 3 phones with phone icon (all `tel:` links).
   - Email with envelope icon (`mailto:` link).
   - Business hours block.
   - Social row: 4 Lucide icons (Facebook, Instagram, Youtube, ExternalLink for TripAdvisor).

3. **Google Maps embed** (full-width, 400px tall):
   - `iframe` embed with grayscale/Aegean-tinted styling via wrapper `filter: hue-rotate(-10deg) saturate(0.85)`.

4. **Footer**.

---

## 10. Component Inventory

Reusable components to build:

| Component | Purpose | Used on |
|---|---|---|
| `Navbar` | Fixed top navigation | All pages |
| `Footer` | Site footer | All pages |
| `PageHero` | Reusable page hero with photo + title + subhead | All pages except home |
| `HomeHero` | Bespoke 100vh home hero with animated title | Home |
| `TripCard` | Standard trip card | Home, Day Trips |
| `FeatureTripCard` | Large editorial trip card | Home |
| `CruiseCard` | Full-width horizontal cruise card | Home teaser, Cruises page |
| `RouteCard` | Bus route card | Bus Rentals |
| `UseCaseCard` | Icon + title + desc card | Bus Rentals |
| `StatCounter` | Animated stat number | Home |
| `TestimonialBlock` | Editorial pull-quote testimonial | Home |
| `EditorialFeature` | Full-bleed image + text section with mask-reveal | Home |
| `CategoryPill` | Small pill for category strip | Home |
| `SectionHeading` | H2 + subhead + optional CTA link | Multiple |
| `CTAButton` | Primary Terracotta button | Multiple |
| `GhostButton` | Outline white button | Home hero |
| `TextLink` | Underlined text link with hover animation | Multiple |
| `Badge` | Category / status badge | Trip cards |
| `PriceBadge` | Terracotta price pill for trip cards | Trip cards |
| `SortBar` | Sticky sort control | Day Trips |
| `Pagination` | Numeric pagination | Day Trips |
| `ContactForm` | Full contact form with RHF | Contact, Bus Rentals |
| `ContactInfoCard` | Sticky info sidebar | Contact |
| `MapEmbed` | Styled Google Maps iframe | Contact |

---

## 11. Data Structure (Mock)

All data lives in `src/data/*.ts` as typed arrays. No API in this template phase.

```ts
// src/data/trips.ts
type Trip = {
  id: string;
  slug: string;
  title: string;           // Greek destination name
  category: 'monoimeri' | 'kroyaziera' | 'polyimeri' | 'thalassia-bania' | 'pezoporia';
  photo: string;           // URL
  photoAlt: string;
  priceFrom: number;       // in euros
  priceOriginal?: number;  // strikethrough original price if discounted
  duration: string;        // "5,5 ώρες", "Μονοήμερη", etc.
  dates: string;           // "Κάθε Σάββατο & Κυριακή" or "12/7, 26/7/2026"
  description: string;     // 1-2 sentence blurb
  featured?: boolean;      // highlights on home
};

// src/data/cruises.ts — similar shape, category always 'kroyaziera'
// src/data/routes.ts — bus rental routes
// src/data/useCases.ts — bus rental use cases
// src/data/testimonials.ts — { name, city, quote }
// src/data/stats.ts — { value, label } for home stats
```

---

## 12. Tech Stack

| Layer | Choice | Version | Rationale |
|---|---|---|---|
| Build tool | Vite | 5.x | Instant HMR, tiny config. |
| Framework | React | 18.x | Standard. |
| Language | TypeScript | 5.x | Type-safe trip data shapes. |
| Router | React Router DOM | 6.x | SPA routing with `useLocation` for page transitions. |
| Styling | Tailwind CSS | 3.4.x | Utility-first; pairs with shadcn/ui. |
| UI primitives | shadcn/ui | latest | Radix-based, accessible, unstyled. We use: Button, Input, Textarea, Label, Dialog, Sheet (mobile nav), Badge, Card. |
| Animation | GSAP | 3.12+ | Industry standard for cinematic motion. |
| GSAP plugins | ScrollTrigger, SplitText | 3.12+ | ScrollTrigger for scroll effects. SplitText is a premium plugin; we'll use a free equivalent (`split-type` npm package) to avoid the paywall. |
| Icons | Lucide React | latest | Consistent stroke-width SVG icons. |
| Forms | React Hook Form | 7.x | Best-in-class React form handling. |
| Form validation | Zod | 3.x | Type-safe schema validation. |
| Font loading | Google Fonts CSS import | — | Playfair Display + Inter. |
| Image placeholders | Unsplash | — | High-quality Greek destination photos. |

**Directory structure:**
```
src/
  main.tsx
  App.tsx
  index.css              # Tailwind + font imports + CSS vars
  components/
    layout/              # Navbar, Footer
    ui/                  # shadcn primitives + our button/badge/etc
    home/                # Home-page-specific sections
    trips/               # TripCard, FeatureTripCard
    cruises/             # CruiseCard
    rentals/             # RouteCard, UseCaseCard
    contact/             # ContactForm, ContactInfoCard
    shared/              # PageHero, SectionHeading, StatCounter, etc.
  pages/
    HomePage.tsx
    MonoimeresPage.tsx
    KroyazieresPage.tsx
    RentalsPage.tsx
    ContactPage.tsx
  data/
    trips.ts
    cruises.ts
    routes.ts
    testimonials.ts
    stats.ts
    useCases.ts
  hooks/
    useGsapAnimation.ts  # Custom hook for GSAP + cleanup + reduced motion
    useReducedMotion.ts
  lib/
    utils.ts             # cn() helper etc
  types/
    index.ts
```

---

## 13. Accessibility Requirements

- All images have descriptive `alt` text (empty `alt=""` only for decorative photos with sibling text).
- All interactive elements have `cursor-pointer` and visible focus states (2px offset Aegean Deep ring).
- All form inputs have associated `<label>` with `htmlFor`.
- Color contrast: minimum 4.5:1 for body text, 7:1 for CTAs (Terracotta on Ivory verified at ~5.2:1; Terracotta on White at ~5.5:1 — passes AA large & AA normal for CTA font sizes ≥15px 600 weight).
- Icon-only buttons get `aria-label`.
- Hero H1 is unique per page.
- Nav has `<nav>` landmark, footer has `<footer>`, main content has `<main>`.
- Keyboard navigation: tab order matches visual order; mobile menu trap-focuses; ESC closes overlays.
- `prefers-reduced-motion` honored for all GSAP effects.
- Skip-to-main-content link at top of every page (visible on focus).
- Form submission errors are announced via `aria-live="polite"`.

---

## 14. Responsive Breakpoints

Using Tailwind defaults:
- `sm`: 640px — small tablets, large phones landscape.
- `md`: 768px — tablets.
- `lg`: 1024px — small laptops, primary desktop layout kicks in.
- `xl`: 1280px — large desktops.
- `2xl`: 1536px — huge screens (rare adjustments).

Design tested at: **375** (iPhone SE), **768** (iPad portrait), **1024** (small laptop), **1440** (standard desktop). No horizontal scroll on any width.

---

## 15. Success Criteria

The template is done when:

- [ ] All 5 pages render with the design language above.
- [ ] All pages are responsive at 375 / 768 / 1024 / 1440 with no horizontal scroll.
- [ ] All GSAP animations run smoothly (60fps) on desktop, respect `prefers-reduced-motion`.
- [ ] Trip data (min 12 day trips, 3 cruises, 5 bus routes, 3 testimonials, 4 stats, 3 use cases) is realistic and reflects the real site's offerings.
- [ ] Nav works on desktop dropdown + mobile hamburger overlay.
- [ ] Contact form validates and shows success state (no backend, mock submit).
- [ ] All linked pages actually route.
- [ ] No console errors, no TypeScript errors, `npm run build` succeeds.
- [ ] Playfair Display + Inter loaded without FOUT flash-of-unstyled-content.
- [ ] All CTAs have `cursor-pointer` and visible focus rings.
- [ ] Client-presentable: no lorem ipsum, no placeholder "0" stats, no broken images.

---

## 16. Out of Scope (Documented, Not Building)

- Real booking / payment integration.
- CMS-backed content editing.
- Multi-language support (English, etc.).
- User accounts, wishlists, saved trips.
- Real-time seat availability.
- Individual trip detail pages (`/monoimeres/[slug]`) — cards link to a placeholder for now.
- News/blog section from the current site's "ΝΕΑ" section.
- Advanced filtering (facet-based) beyond simple sort.

These can be phased in later; the template establishes the design language they'd inherit.
