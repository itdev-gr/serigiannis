# Sergiani Travel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality React template of the redesigned Sergiani Travel website (5 pages) using the "Aegean Editorial" design system defined in `docs/superpowers/specs/2026-07-01-serigiani-redesign-design.md`.

**Architecture:** Vite + React + TypeScript SPA. Tailwind CSS for styling with a custom theme mapping the Aegean Editorial tokens. shadcn/ui primitives for accessible UI base. GSAP + ScrollTrigger + split-type for editorial motion. React Router v6 for SPA routing with page-fade transitions. React Hook Form + Zod for forms. All content is Greek and mocked in typed `src/data/*.ts` files (no backend).

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3.4, shadcn/ui (Button, Input, Textarea, Label, Sheet, Badge), GSAP 3.12 (+ ScrollTrigger), split-type 0.3, React Router 6, React Hook Form 7, Zod 3, Lucide React.

**Note on TDD:** This is a visual/motion template. Tests are written for pure utility hooks (`useReducedMotion`, form Zod schemas) where TDD adds value. Visual components and GSAP animations are verified by running the dev server and checking rendering, motion, and reduced-motion fallback in the browser at 375/768/1024/1440 widths.

**Commit cadence:** Commit after every task. Never batch.

---

## Phase 1 — Project Scaffolding

### Task 1: Scaffold Vite React-TS project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore`, `README.md`

- [ ] **Step 1: Create Vite React-TS project in place**

Because the working directory is empty except for `docs/` and `.git/`, use the non-destructive path:

```bash
npm create vite@latest . -- --template react-ts
```

When prompted to overwrite: choose "Ignore files and continue". Vite will scaffold alongside `docs/`.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Verify dev server boots**

```bash
npm run dev
```

Expected: Vite prints `Local: http://localhost:5173`. Kill server after confirming.

- [ ] **Step 4: Replace default `src/App.tsx` with an empty shell**

```tsx
// src/App.tsx
export default function App() {
  return <div>Sergiani Travel</div>;
}
```

- [ ] **Step 5: Remove default Vite CSS**

Delete `src/App.css`. Empty `src/index.css` (we'll fill it in Task 4).

- [ ] **Step 6: Update `.gitignore`**

Ensure it includes:
```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: scaffold Vite React-TS project"
```

---

### Task 2: Install all runtime dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install core UI + routing + form + motion deps**

```bash
npm install react-router-dom@^6 gsap@^3.12 split-type@^0.3 react-hook-form@^7 zod@^3 @hookform/resolvers@^3 lucide-react@latest clsx@^2 tailwind-merge@^2 class-variance-authority@^0.7
```

- [ ] **Step 2: Install Tailwind and shadcn peer dependencies as dev**

```bash
npm install -D tailwindcss@^3.4 postcss@^8 autoprefixer@^10 @types/node
```

- [ ] **Step 3: Install shadcn Radix primitives we need**

```bash
npm install @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-dialog
```

- [ ] **Step 4: Verify install**

Run `npm ls react-router-dom gsap split-type` — all three should appear.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install React Router, GSAP, RHF, Zod, Radix primitives"
```

---

### Task 3: Configure Tailwind with Aegean Editorial theme

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`

- [ ] **Step 1: Initialize Tailwind**

```bash
npx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js`.

- [ ] **Step 2: Rename config to TS and replace contents**

Delete `tailwind.config.js`. Create `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3A5C',
          hover: '#152E49',
        },
        sea: '#5B9FD4',
        cta: {
          DEFAULT: '#C96A47',
          hover: '#B25939',
        },
        background: '#F7F2EB',
        surface: '#FDFCFA',
        body: '#1A1817',
        muted: '#6B6259',
        olive: '#6E7C4A',
        'deep-ink': '#0F2233',
        border: 'rgba(27, 58, 92, 0.12)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-hero': ['clamp(3.5rem, 7vw, 6rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-section': ['clamp(2.5rem, 4.5vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '600' }],
        'display-editorial': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.2', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        prose: '68ch',
        content: '1280px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 34, 51, 0.04)',
        'card-hover': '0 20px 40px -12px rgba(15, 34, 51, 0.15)',
        cta: '0 8px 16px -4px rgba(201, 106, 71, 0.35)',
      },
      transitionTimingFunction: {
        'editorial': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts postcss.config.js
git rm -f tailwind.config.js
git commit -m "feat(styling): configure Tailwind with Aegean Editorial theme tokens"
```

---

### Task 4: Global CSS — fonts, resets, CSS vars

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-primary: 27 58 92;
    --color-sea: 91 159 212;
    --color-cta: 201 106 71;
    --color-bg: 247 242 235;
    --color-surface: 253 252 250;
    --color-body: 26 24 23;
    --color-muted: 107 98 89;
    --color-olive: 110 124 74;
    --color-deep-ink: 15 34 51;
  }

  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    @apply bg-background text-body font-sans;
    font-size: 16px;
    line-height: 1.65;
  }

  h1, h2, h3, h4 {
    @apply font-display text-primary;
  }

  ::selection {
    background: rgb(var(--color-cta));
    color: rgb(var(--color-surface));
  }

  /* Editorial number spacing where used */
  .tabular {
    font-variant-numeric: tabular-nums;
  }

  /* Skip-to-main link */
  .skip-link {
    @apply absolute left-4 top-4 z-50 -translate-y-32 rounded-md bg-primary px-4 py-2 text-surface transition-transform focus:translate-y-0;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .text-pretty {
    text-wrap: pretty;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Update `index.html` `<title>` and lang**

Edit `index.html`:
```html
<!doctype html>
<html lang="el">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Sergiani Travel — Ταξιδιωτικό γραφείο στο Περιστέρι. Μονοήμερες, κρουαζιέρες, πολυήμερες εκδρομές από την Αθήνα από το 1995." />
    <title>Sergiani Travel · Ταξιδιωτικό Γραφείο από το 1995</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify with `npm run dev` — page should render with Ivory Sand background and Playfair rendering for h1 (add temporary `<h1>Test</h1>` to App.tsx to check)**

Undo the test `<h1>` after confirming.

- [ ] **Step 4: Commit**

```bash
git add src/index.css index.html src/App.tsx
git commit -m "feat(styling): global CSS, font imports, CSS vars, motion-reduce fallback"
```

---

### Task 5: Router skeleton

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`
- Create: `src/pages/HomePage.tsx`, `src/pages/MonoimeresPage.tsx`, `src/pages/KroyazieresPage.tsx`, `src/pages/RentalsPage.tsx`, `src/pages/ContactPage.tsx`

- [ ] **Step 1: Create page stubs**

Each of the 5 page files starts with just:
```tsx
// src/pages/HomePage.tsx
export default function HomePage() {
  return <div className="p-8"><h1>Home</h1></div>;
}
```

Repeat for `MonoimeresPage`, `KroyazieresPage`, `RentalsPage`, `ContactPage` with matching names.

- [ ] **Step 2: Configure router in `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 3: Add routes to `src/App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MonoimeresPage from './pages/MonoimeresPage';
import KroyazieresPage from './pages/KroyazieresPage';
import RentalsPage from './pages/RentalsPage';
import ContactPage from './pages/ContactPage';

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">Μετάβαση στο περιεχόμενο</a>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/monoimeres" element={<MonoimeresPage />} />
        <Route path="/kroyazieres" element={<KroyazieresPage />} />
        <Route path="/pullman-rentals" element={<RentalsPage />} />
        <Route path="/epikoinonia" element={<ContactPage />} />
      </Routes>
    </>
  );
}
```

- [ ] **Step 4: Verify all 5 routes render**

Run `npm run dev` and manually visit each URL. Each should render its heading.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/App.tsx src/pages/
git commit -m "feat(routing): scaffold 5 pages with React Router"
```

---

## Phase 2 — Shared Foundations

### Task 6: TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/index.ts

export type TripCategory =
  | 'monoimeri'
  | 'kroyaziera'
  | 'polyimeri'
  | 'thalassia-bania'
  | 'pezoporia';

export type Trip = {
  id: string;
  slug: string;
  title: string;
  category: TripCategory;
  photo: string;
  photoAlt: string;
  priceFrom: number;
  priceOriginal?: number;
  duration: string;
  dates: string;
  description: string;
  featured?: boolean;
};

export type Cruise = {
  id: string;
  slug: string;
  title: string;
  routeTag: string;
  islands: string[];
  photo: string;
  photoAlt: string;
  priceFrom: number;
  duration: string;
  dates: string;
  description: string;
};

export type Route = {
  id: string;
  from: string;
  to: string;
  durationHours: string;
  description: string;
  icon?: string;
};

export type UseCase = {
  id: string;
  icon: string; // Lucide icon name
  title: string;
  description: string;
};

export type Testimonial = {
  id: string;
  name: string;
  city: string;
  quote: string;
};

export type Stat = {
  id: string;
  value: number;
  suffix?: string;
  label: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types/
git commit -m "feat(types): trip, cruise, route, testimonial types"
```

---

### Task 7: Mock data files

**Files:**
- Create: `src/data/trips.ts`, `src/data/cruises.ts`, `src/data/routes.ts`, `src/data/useCases.ts`, `src/data/testimonials.ts`, `src/data/stats.ts`

- [ ] **Step 1: Create `src/data/trips.ts`**

```ts
import type { Trip } from '@/types';

export const trips: Trip[] = [
  {
    id: 't1',
    slug: 'psatha-thalassia-bania',
    title: 'Θαλάσσια Μπάνια Ψάθα',
    category: 'thalassia-bania',
    photo: 'https://images.unsplash.com/photo-1533760881669-80db4d7b341a?w=1600&q=80',
    photoAlt: 'Παραλία Ψάθα με τιρκουάζ νερά',
    priceFrom: 10,
    priceOriginal: 12,
    duration: '5,5 ώρες',
    dates: 'Καθημερινά · Ιούλιος–Αύγουστος',
    description: 'Καθημερινές αναχωρήσεις για μπάνιο στη Ψάθα με άνετο πούλμαν.',
    featured: true,
  },
  {
    id: 't2',
    slug: 'tinos-proskynima',
    title: 'Προσκύνημα στην Τήνο',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1600&q=80',
    photoAlt: 'Παναγία της Τήνου',
    priceFrom: 75,
    priceOriginal: 95,
    duration: 'Μονοήμερη',
    dates: 'Κάθε Σάββατο & Κυριακή',
    description: 'Επίσκεψη στην Παναγία της Τήνου με ξενάγηση στο νησί.',
  },
  {
    id: 't3',
    slug: 'lichadonisia-kavos',
    title: 'Λιχαδονήσια · Κάβος',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1590523278191-995cbcda646b?w=1600&q=80',
    photoAlt: 'Λιχαδονήσια από ψηλά',
    priceFrom: 25,
    priceOriginal: 30,
    duration: 'Λεωφορείο & Πλοίο',
    dates: '18/7, 26/7, 2/8, 9/8/2026',
    description: 'Εξωτικές παραλίες στα Λιχαδονήσια με ολιγοήμερη περιήγηση.',
  },
  {
    id: 't4',
    slug: 'ydra',
    title: 'Ύδρα · Το Νησί του Μιαούλη',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1601581875039-e899893d520c?w=1600&q=80',
    photoAlt: 'Λιμάνι της Ύδρας',
    priceFrom: 25,
    duration: 'Μονοήμερη',
    dates: '27/6, 12/7/2026',
    description: 'Το νησί των καπετάνιων, της τέχνης και της αρχοντιάς.',
    featured: true,
  },
  {
    id: 't5',
    slug: 'spetses',
    title: 'Σπέτσες',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1600&q=80',
    photoAlt: 'Παραλία Σπετσών',
    priceFrom: 25,
    duration: 'Μονοήμερη',
    dates: '12/7/2026',
    description: 'Το νησί των αρωμάτων και του Αργοσαρωνικού.',
  },
  {
    id: 't6',
    slug: 'meteora',
    title: 'Μετέωρα',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1600&q=80',
    photoAlt: 'Μοναστήρια στα Μετέωρα',
    priceFrom: 65,
    duration: 'Μονοήμερη',
    dates: 'Κάθε Σάββατο',
    description: 'Τα μοναστήρια στους ουρανούς — ένα ταξίδι στην πνευματικότητα.',
    featured: true,
  },
  {
    id: 't7',
    slug: 'delphi',
    title: 'Δελφοί',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1601160937568-06f1a6d80b52?w=1600&q=80',
    photoAlt: 'Αρχαία Δελφοί',
    priceFrom: 45,
    duration: 'Μονοήμερη',
    dates: 'Κάθε Κυριακή',
    description: 'Ο ομφαλός της γης, με ξενάγηση στον αρχαιολογικό χώρο.',
  },
  {
    id: 't8',
    slug: 'nafplio',
    title: 'Ναύπλιο',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1602612411023-b19f7fb8b664?w=1600&q=80',
    photoAlt: 'Παλαμήδι Ναυπλίου',
    priceFrom: 30,
    duration: 'Μονοήμερη',
    dates: 'Κάθε Σάββατο',
    description: 'Η πρώτη πρωτεύουσα, με βόλτα στο ενετικό λιμάνι.',
  },
  {
    id: 't9',
    slug: 'andros',
    title: 'Άνδρος',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1518131945814-14ada1a54983?w=1600&q=80',
    photoAlt: 'Χώρα Άνδρου',
    priceFrom: 35,
    duration: 'Μονοήμερη',
    dates: '19/7, 2/8/2026',
    description: 'Το νησί των πλοιοκτητών, με μοναδικές παραλίες.',
  },
  {
    id: 't10',
    slug: 'akr-sounio',
    title: 'Ακρωτήριο Σούνιο',
    category: 'monoimeri',
    photo: 'https://images.unsplash.com/photo-1503152394-c571994fd383?w=1600&q=80',
    photoAlt: 'Ναός του Ποσειδώνα στο Σούνιο',
    priceFrom: 20,
    duration: '4–5 ώρες',
    dates: 'Καθημερινά',
    description: 'Το ηλιοβασίλεμα στον Ναό του Ποσειδώνα.',
  },
  {
    id: 't11',
    slug: 'pilio',
    title: 'Πήλιο',
    category: 'polyimeri',
    photo: 'https://images.unsplash.com/photo-1602512587137-42acdb02b4b8?w=1600&q=80',
    photoAlt: 'Χωριά Πηλίου',
    priceFrom: 180,
    duration: '2 ημέρες',
    dates: '1–2/8/2026',
    description: 'Το βουνό των Κενταύρων, τα χωριά και οι κρυμμένες παραλίες.',
  },
  {
    id: 't12',
    slug: 'skyros',
    title: 'Σκύρος',
    category: 'polyimeri',
    photo: 'https://images.unsplash.com/photo-1613395887811-72a3ac9dcbb1?w=1600&q=80',
    photoAlt: 'Χώρα Σκύρου',
    priceFrom: 240,
    duration: '3 ημέρες',
    dates: '5–7/9/2026',
    description: 'Το άγνωστο νησί των Σποράδων με μοναδική αρχιτεκτονική.',
  },
];
```

- [ ] **Step 2: Create `src/data/cruises.ts`**

```ts
import type { Cruise } from '@/types';

export const cruises: Cruise[] = [
  {
    id: 'c1',
    slug: 'salamina-aigina-agkistri',
    title: 'Σαλαμίνα · Αίγινα · Αγκίστρι',
    routeTag: 'Σαρωνικός',
    islands: ['Σαλαμίνα', 'Αίγινα', 'Αγκίστρι'],
    photo: 'https://images.unsplash.com/photo-1602942506283-06c9fa4b7f47?w=1600&q=80',
    photoAlt: 'Ελληνικό νησί στον Σαρωνικό',
    priceFrom: 20,
    duration: 'Μονοήμερη',
    dates: 'Κάθε Κυριακή · Ιούλιος–Αύγουστος',
    description: 'Τρία νησιά, μία μέρα, μια κρουαζιέρα με μπάνιο, φαγητό και ξενάγηση.',
  },
  {
    id: 'c2',
    slug: 'kolymvisis-agkistri-metopi-aigina',
    title: 'Κρουαζιέρα Κολύμβησης',
    routeTag: 'Αργοσαρωνικός',
    islands: ['Αγκίστρι', 'Μετώπη', 'Αίγινα'],
    photo: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1600&q=80',
    photoAlt: 'Κρυστάλλινα νερά ελληνικού νησιού',
    priceFrom: 55,
    duration: 'Ημερήσια',
    dates: 'Καθημερινά · Ιούνιος–Σεπτέμβριος',
    description: 'Μια μέρα αφιερωμένη στη θάλασσα — τρία σημεία, πολλές βουτιές.',
  },
  {
    id: 'c3',
    slug: 'ydra-poros-aigina',
    title: 'Ύδρα · Πόρος · Αίγινα',
    routeTag: 'Αργοσαρωνικός',
    islands: ['Ύδρα', 'Πόρος', 'Αίγινα'],
    photo: 'https://images.unsplash.com/photo-1523592121529-f6dde35f079e?w=1600&q=80',
    photoAlt: 'Λιμάνι Ύδρας από ψηλά',
    priceFrom: 55,
    duration: 'One-day cruise',
    dates: 'Καθημερινά',
    description: 'Τα τρία στολίδια του Αργοσαρωνικού με γεύμα και μουσική στο πλοίο.',
  },
];
```

- [ ] **Step 3: Create `src/data/routes.ts`**

```ts
import type { Route } from '@/types';

export const routes: Route[] = [
  { id: 'r1', from: 'Αθήνα', to: 'Ακρωτήριο Σούνιο', durationHours: '4–5 ώρες', description: 'Ηλιοβασίλεμα στον Ναό του Ποσειδώνα.' },
  { id: 'r2', from: 'Αθήνα', to: 'Μετέωρα', durationHours: '12–14 ώρες', description: 'Τα μοναστήρια πάνω από τα βράχια.' },
  { id: 'r3', from: 'Αθήνα', to: 'Δελφοί', durationHours: '8–9 ώρες', description: 'Ο αρχαίος ομφαλός της γης.' },
  { id: 'r4', from: 'Αθήνα', to: 'Αρχαία Ολυμπία', durationHours: '10 ώρες', description: 'Γενέτειρα των Ολυμπιακών Αγώνων.' },
  { id: 'r5', from: 'Περιήγηση', to: 'Αθήνας', durationHours: '4–5 ώρες', description: 'City tour με τα σημαντικότερα μνημεία.' },
];
```

- [ ] **Step 4: Create `src/data/useCases.ts`**

```ts
import type { UseCase } from '@/types';

export const useCases: UseCase[] = [
  { id: 'u1', icon: 'GraduationCap', title: 'Σχολικές Εκδρομές', description: 'Ασφαλείς μεταφορές με έμπειρους οδηγούς και πλήρες συνοδευτικό υλικό.' },
  { id: 'u2', icon: 'Briefcase', title: 'Εταιρικές Μεταφορές', description: 'Οργανωμένες μεταφορές προσωπικού και εκπαιδεύσεις εκτός Αθήνας.' },
  { id: 'u3', icon: 'PartyPopper', title: 'Ιδιωτικές Εκδρομές', description: 'Γάμοι, βαπτίσεις και οικογενειακές εκδρομές με ιδιωτικό πούλμαν.' },
];
```

- [ ] **Step 5: Create `src/data/testimonials.ts`**

```ts
import type { Testimonial } from '@/types';

export const testimonials: Testimonial[] = [
  { id: 'q1', name: 'Μαρία Κ.', city: 'Αθήνα', quote: 'Η εκδρομή στα Μετέωρα ήταν άψογα οργανωμένη. Ο ξεναγός γνώριζε τα πάντα και το πούλμαν άνετο. Θα ξαναταξιδέψουμε μαζί σας.' },
  { id: 'q2', name: 'Γιώργος Π.', city: 'Περιστέρι', quote: 'Πολυήμερη στην Καππαδοκία με τη Sergiani — αξεπέραστη ποιότητα και ξεκάθαρη τιμή, χωρίς κρυφές χρεώσεις.' },
  { id: 'q3', name: 'Ελένη Μ.', city: 'Ομόνοια', quote: 'Κάθε καλοκαίρι πάμε στη Ψάθα με το πούλμαν τους. Καθαρό, στην ώρα του, με χαμογελαστό προσωπικό.' },
];
```

- [ ] **Step 6: Create `src/data/stats.ts`**

```ts
import type { Stat } from '@/types';

export const stats: Stat[] = [
  { id: 's1', value: 30, suffix: '+', label: 'Χρόνια Εμπειρίας' },
  { id: 's2', value: 500, suffix: '+', label: 'Εκδρομές τον Χρόνο' },
  { id: 's3', value: 10000, suffix: '+', label: 'Ταξιδιώτες' },
  { id: 's4', value: 50, suffix: '+', label: 'Προορισμοί' },
];
```

- [ ] **Step 7: Configure `@` alias in `vite.config.ts` and `tsconfig.json`**

Edit `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Edit `tsconfig.json` — add under `compilerOptions`:
```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 8: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/data/ vite.config.ts tsconfig.json
git commit -m "feat(data): mock trip/cruise/route/testimonial/stat data with @ alias"
```

---

### Task 8: Utility `cn()` helper + button variants

**Files:**
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Create the utility**

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuro(amount: number): string {
  return `${amount}€`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/
git commit -m "feat(lib): cn() className merger + formatEuro helper"
```

---

### Task 9: `useReducedMotion` hook

**Files:**
- Create: `src/hooks/useReducedMotion.ts`
- Create: `src/hooks/useReducedMotion.test.ts`

- [ ] **Step 1: Install vitest for unit tests**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Add vitest config to `vite.config.ts`**

At the top:
```ts
/// <reference types="vitest" />
```

Add to the defineConfig object:
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
},
```

- [ ] **Step 3: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add test script to `package.json`**

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Write failing test — `src/hooks/useReducedMotion.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', undefined);
  });

  it('returns true when user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('returns false when user has no motion preference', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npm run test:run -- src/hooks/useReducedMotion.test.ts
```

Expected: FAIL — hook does not exist.

- [ ] **Step 7: Implement `src/hooks/useReducedMotion.ts`**

```ts
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefers;
}
```

- [ ] **Step 8: Verify tests pass**

```bash
npm run test:run
```

Expected: 2 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useReducedMotion.ts src/hooks/useReducedMotion.test.ts src/test/ vite.config.ts package.json package-lock.json
git commit -m "feat(hooks): useReducedMotion hook with vitest coverage"
```

---

### Task 10: `useGsapContext` hook

**Files:**
- Create: `src/hooks/useGsapContext.ts`

This wraps `gsap.context()` to guarantee cleanup on unmount and scope selectors to a container.

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useGsapContext.ts
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';

/**
 * Runs a GSAP setup function scoped to `scopeRef`. All tweens and ScrollTriggers
 * created inside are automatically reverted on unmount.
 */
export function useGsapContext(
  setup: (ctx: gsap.Context) => void,
  scopeRef: RefObject<HTMLElement>,
  deps: unknown[] = []
) {
  const ctxRef = useRef<gsap.Context | null>(null);

  useLayoutEffect(() => {
    if (!scopeRef.current) return;
    ctxRef.current = gsap.context(setup, scopeRef.current);
    return () => {
      ctxRef.current?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

- [ ] **Step 2: Register ScrollTrigger globally once — create `src/lib/gsap.ts`**

```ts
// src/lib/gsap.ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function registerGsapPlugins() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export { gsap, ScrollTrigger };
```

Call `registerGsapPlugins()` once in `src/main.tsx`:

```tsx
import { registerGsapPlugins } from './lib/gsap';
registerGsapPlugins();
```

- [ ] **Step 3: Verify TS compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGsapContext.ts src/lib/gsap.ts src/main.tsx
git commit -m "feat(motion): useGsapContext hook + ScrollTrigger registration"
```

---

## Phase 3 — Shared UI Primitives

### Task 11: Button component with variants

**Files:**
- Create: `src/components/ui/Button.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold text-[15px] tracking-[0.02em] transition-all duration-200 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-cta text-surface shadow-cta hover:bg-cta-hover hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0',
        ghost: 'border border-surface/60 bg-transparent text-surface hover:bg-surface hover:text-primary',
        outline: 'border border-primary/20 bg-transparent text-primary hover:bg-primary hover:text-surface',
        dark: 'bg-primary text-surface hover:bg-primary-hover',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4 text-[13px]',
        lg: 'h-14 px-8 text-[16px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat(ui): Button component with primary/ghost/outline/dark variants"
```

---

### Task 12: Text link with animated underline

**Files:**
- Create: `src/components/ui/TextLink.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/ui/TextLink.tsx
import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

type Props = LinkProps & {
  showArrow?: boolean;
};

export const TextLink = forwardRef<HTMLAnchorElement, Props>(
  ({ className, children, showArrow = true, ...props }, ref) => (
    <Link
      ref={ref}
      className={cn(
        'group inline-flex items-center gap-1.5 font-sans font-semibold text-[14px] uppercase tracking-[0.12em] text-primary transition-colors hover:text-cta',
        className
      )}
      {...props}
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-100 bg-current transition-transform duration-300 ease-editorial group-hover:scale-x-0" />
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-cta transition-transform duration-300 delay-100 ease-editorial group-hover:scale-x-100 group-hover:origin-left" />
      </span>
      {showArrow && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />}
    </Link>
  )
);
TextLink.displayName = 'TextLink';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/TextLink.tsx
git commit -m "feat(ui): TextLink with animated underline sweep"
```

---

### Task 13: Badge components (Category + Price)

**Files:**
- Create: `src/components/ui/Badge.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/ui/Badge.tsx
import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-sans font-semibold uppercase tracking-[0.12em]',
  {
    variants: {
      variant: {
        sea: 'bg-sea/15 text-primary',
        olive: 'bg-olive/15 text-olive',
        cta: 'bg-cta text-surface',
        surface: 'bg-surface/95 text-primary shadow-sm',
      },
      size: {
        default: 'h-7 px-3 text-[11px]',
        lg: 'h-9 px-4 text-[13px]',
      },
    },
    defaultVariants: { variant: 'sea', size: 'default' },
  }
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

export function PriceBadge({ from, original }: { from: number; original?: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-cta px-4 py-2 text-surface shadow-md">
      {original !== undefined && original > from && (
        <span className="font-sans text-[13px] font-medium line-through opacity-70">{original}€</span>
      )}
      <span className="font-sans text-[16px] font-bold tabular">από {from}€</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Badge.tsx
git commit -m "feat(ui): Badge (sea/olive/cta variants) + PriceBadge"
```

---

### Task 14: SectionHeading

**Files:**
- Create: `src/components/shared/SectionHeading.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/shared/SectionHeading.tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  invert?: boolean;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, subtitle, align = 'left', invert = false, action }: Props) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', align === 'center' && 'md:flex-col md:items-center md:text-center')}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p className={cn('mb-3 font-sans text-[13px] font-medium uppercase tracking-[0.14em]', invert ? 'text-sea' : 'text-cta')}>
            {eyebrow}
          </p>
        )}
        <h2 className={cn('font-display text-display-section', invert ? 'text-surface' : 'text-primary')}>{title}</h2>
        {subtitle && (
          <p className={cn('mt-4 text-[17px] leading-relaxed', invert ? 'text-surface/80' : 'text-muted')}>{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/SectionHeading.tsx
git commit -m "feat(ui): SectionHeading with eyebrow + optional action slot"
```

---

## Phase 4 — Layout Components

### Task 15: Navbar (transparent → glass morph on scroll)

**Files:**
- Create: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/layout/Navbar.tsx
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Ship, MapPin, Bus, Mail, Home as HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Αρχική', icon: HomeIcon },
  { to: '/monoimeres', label: 'Μονοήμερες', icon: MapPin },
  { to: '/kroyazieres', label: 'Κρουαζιέρες', icon: Ship },
  { to: '/pullman-rentals', label: 'Πούλμαν', icon: Bus },
  { to: '/epikoinonia', label: 'Επικοινωνία', icon: Mail },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const dark = isHome && !scrolled;

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-all duration-300 ease-editorial',
          scrolled ? 'bg-surface/85 backdrop-blur-md border-b border-border' : 'bg-transparent',
          scrolled ? 'py-3' : 'py-5'
        )}
      >
        <div className="container flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Sergiani Travel — αρχική">
            <div className={cn('grid h-10 w-10 place-items-center rounded-full transition-colors', dark ? 'bg-surface/15 backdrop-blur' : 'bg-primary')}>
              <Ship className={cn('h-5 w-5', dark ? 'text-surface' : 'text-surface')} strokeWidth={1.5} />
            </div>
            <div className="leading-tight">
              <div className={cn('font-display text-[20px] font-semibold', dark ? 'text-surface' : 'text-primary')}>Sergiani</div>
              <div className={cn('font-sans text-[10px] uppercase tracking-[0.2em]', dark ? 'text-surface/70' : 'text-muted')}>Travel · 1995</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Κύρια πλοήγηση">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.1em] transition-all',
                    dark ? 'text-surface/85 hover:bg-surface/10 hover:text-surface' : 'text-primary hover:bg-primary/5',
                    isActive && (dark ? 'bg-surface/15 text-surface' : 'bg-primary/10 text-primary')
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant={dark ? 'ghost' : 'primary'} size="sm" className="hidden md:inline-flex">
              <Link to="/epikoinonia">Κλείστε Θέση</Link>
            </Button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn('grid h-11 w-11 place-items-center rounded-full lg:hidden', dark ? 'text-surface hover:bg-surface/10' : 'text-primary hover:bg-primary/10')}
              aria-label="Άνοιγμα μενού"
            >
              <Menu className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-deep-ink transition-all duration-500 ease-editorial lg:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <Link to="/" className="font-display text-2xl font-semibold text-surface">Sergiani</Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full text-surface hover:bg-surface/10"
            aria-label="Κλείσιμο μενού"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
        <nav className="mt-8 flex flex-col gap-1 px-6" aria-label="Πλοήγηση κινητού">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded-lg px-4 py-4 font-display text-3xl transition-colors',
                  isActive ? 'text-cta' : 'text-surface hover:text-sea'
                )
              }
            >
              <Icon className="h-6 w-6 opacity-60" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
          <Button asChild size="lg" className="mt-8">
            <Link to="/epikoinonia">Κλείστε Θέση</Link>
          </Button>
        </nav>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Mount navbar in `App.tsx`**

```tsx
import { Navbar } from '@/components/layout/Navbar';
// ...
<Navbar />
<Routes>...
```

- [ ] **Step 3: Verify — visit home + inner pages, scroll to see glass morph**

Run `npm run dev`, click through each page. Scroll on home to check the glass state.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Navbar.tsx src/App.tsx
git commit -m "feat(layout): Navbar with scroll-triggered glass morph + mobile overlay"
```

---

### Task 16: Footer

**Files:**
- Create: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/layout/Footer.tsx
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail, Clock, Ship } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-deep-ink text-surface">
      <div className="container grid gap-12 py-20 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-surface/10">
              <Ship className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="font-display text-2xl font-semibold">Sergiani Travel</div>
          </div>
          <p className="text-[15px] leading-relaxed text-surface/70">
            Ταξιδιωτικό γραφείο στο Περιστέρι από το 1995. Οργανώνουμε εκδρομές, κρουαζιέρες και μεταφορές σε όλη την Ελλάδα.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="https://facebook.com/sergiani.travelgr" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 transition-colors hover:bg-cta">
              <Facebook className="h-4 w-4" strokeWidth={1.75} />
            </a>
            <a href="https://instagram.com/sergiani_travel" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 transition-colors hover:bg-cta">
              <Instagram className="h-4 w-4" strokeWidth={1.75} />
            </a>
            <a href="https://youtube.com/@sergianitravel" aria-label="YouTube" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 transition-colors hover:bg-cta">
              <Youtube className="h-4 w-4" strokeWidth={1.75} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-surface/60">Εκδρομές</h3>
          <ul className="space-y-3 text-[15px]">
            <li><Link to="/monoimeres" className="text-surface/80 hover:text-cta">Μονοήμερες</Link></li>
            <li><Link to="/kroyazieres" className="text-surface/80 hover:text-cta">Κρουαζιέρες</Link></li>
            <li><Link to="/monoimeres" className="text-surface/80 hover:text-cta">Θαλάσσια Μπάνια</Link></li>
            <li><Link to="/monoimeres" className="text-surface/80 hover:text-cta">Πολυήμερες</Link></li>
            <li><Link to="/pullman-rentals" className="text-surface/80 hover:text-cta">Ενοικίαση Πούλμαν</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-surface/60">Επικοινωνία</h3>
          <ul className="space-y-3 text-[15px] text-surface/80">
            <li className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <span>Π. Μελά 45, Περιστέρι 121 31<br/><span className="text-surface/60">(Μετρό Αγίου Αντωνίου)</span></span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <a href="tel:+302105712451" className="hover:text-cta">210 571 2451</a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <a href="tel:+306976811825" className="hover:text-cta">6976 811 825 <span className="text-surface/50">(24ώρο)</span></a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <a href="mailto:info@sergianitravel.gr" className="hover:text-cta">info@sergianitravel.gr</a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-surface/60">Ωράριο</h3>
          <ul className="space-y-3 text-[15px] text-surface/80">
            <li className="flex items-start gap-3">
              <Clock className="mt-1 h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <div>
                <div>Δευ–Παρ: 09:00–17:00</div>
                <div>Σάββατο: 09:00–14:00</div>
              </div>
            </li>
          </ul>
          <div className="mt-6 rounded-lg border border-surface/10 bg-surface/5 p-4">
            <div className="font-sans text-[12px] uppercase tracking-[0.14em] text-cta">Ασφαλείς πληρωμές</div>
            <div className="mt-1.5 text-[14px] text-surface/70">Κάρτα, IRIS, Τραπεζική Κατάθεση</div>
          </div>
        </div>
      </div>
      <div className="border-t border-surface/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-[13px] text-surface/60 md:flex-row">
          <div>© 2026 Sergiani Travel. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-surface">Όροι Συμμετοχής</a>
            <a href="#" className="hover:text-surface">Πολιτική Απορρήτου</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Mount in `App.tsx`**

```tsx
import { Footer } from '@/components/layout/Footer';
// After Routes:
<Footer />
```

- [ ] **Step 3: Verify visually — footer displays on every page**

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Footer.tsx src/App.tsx
git commit -m "feat(layout): Footer with contact, hours, socials, quick links"
```

---

### Task 17: Page transition wrapper

**Files:**
- Create: `src/components/layout/PageTransition.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/layout/PageTransition.tsx
import { useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function PageTransition({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }
    );
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, containerRef, [location.pathname]);

  return (
    <div ref={containerRef} id="main" tabIndex={-1}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Wrap `Routes` in `App.tsx`**

```tsx
<PageTransition>
  <Routes>...</Routes>
</PageTransition>
```

Note: Because `PageTransition` receives `Routes` as children but re-animates on `location.pathname` change, this works — `useGsapContext` dep array on pathname re-runs the tween.

- [ ] **Step 3: Verify — navigating between pages fades**

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/PageTransition.tsx src/App.tsx
git commit -m "feat(layout): PageTransition GSAP fade on route change"
```

---

### Task 18: PageHero (reusable)

**Files:**
- Create: `src/components/shared/PageHero.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/shared/PageHero.tsx
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { gsap } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Crumb = { label: string; to?: string };

type Props = {
  photo: string;
  photoAlt: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  heightClass?: string; // e.g. 'h-[60vh]'
};

export function PageHero({ photo, photoAlt, eyebrow, title, subtitle, breadcrumbs, heightClass = 'h-[60vh] min-h-[420px]' }: Props) {
  const scopeRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('[data-hero-image]', { scale: 1.08, duration: 1.4 })
      .from('[data-hero-eyebrow]', { y: 20, opacity: 0, duration: 0.5 }, '-=1.0')
      .from('[data-hero-title]', { y: 30, opacity: 0, duration: 0.7 }, '-=0.75')
      .from('[data-hero-subtitle]', { y: 20, opacity: 0, duration: 0.55 }, '-=0.5');
  }, scopeRef, []);

  return (
    <section ref={scopeRef} className={`relative w-full overflow-hidden ${heightClass}`}>
      <img
        data-hero-image
        src={photo}
        alt={photoAlt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-deep-ink/50 via-deep-ink/40 to-deep-ink/80" />
      <div className="container relative flex h-full flex-col justify-end pb-16 pt-32 text-surface">
        {breadcrumbs && (
          <nav aria-label="breadcrumb" className="mb-5 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-surface/70">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {c.to ? <Link to={c.to} className="hover:text-cta">{c.label}</Link> : <span>{c.label}</span>}
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 opacity-60" />}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p data-hero-eyebrow className="mb-3 font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">{eyebrow}</p>}
        <h1 data-hero-title className="max-w-4xl font-display text-display-hero text-balance">{title}</h1>
        {subtitle && <p data-hero-subtitle className="mt-5 max-w-2xl text-[19px] leading-relaxed text-surface/85">{subtitle}</p>}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/PageHero.tsx
git commit -m "feat(shared): PageHero with GSAP entrance timeline"
```

---

## Phase 5 — Content Components

### Task 19: TripCard

**Files:**
- Create: `src/components/trips/TripCard.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/trips/TripCard.tsx
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowUpRight } from 'lucide-react';
import type { Trip } from '@/types';
import { PriceBadge } from '@/components/ui/Badge';

const CATEGORY_LABEL: Record<Trip['category'], string> = {
  'monoimeri': 'Μονοήμερη',
  'kroyaziera': 'Κρουαζιέρα',
  'polyimeri': 'Πολυήμερη',
  'thalassia-bania': 'Θαλάσσια Μπάνια',
  'pezoporia': 'Πεζοπορία',
};

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link
      to={`/monoimeres/${trip.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-all duration-300 ease-editorial hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
        <img
          src={trip.photo}
          alt={trip.photoAlt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
        />
        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center rounded-full bg-surface/95 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur">
            {CATEGORY_LABEL[trip.category]}
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <PriceBadge from={trip.priceFrom} original={trip.priceOriginal} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[22px] font-semibold leading-tight text-primary">{trip.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted line-clamp-2">{trip.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" strokeWidth={1.75} />{trip.duration}</span>
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />{trip.dates}</span>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-primary group-hover:text-cta">Λεπτομέρειες</span>
          <ArrowUpRight className="h-4 w-4 text-primary transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-cta" strokeWidth={1.75} />
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trips/TripCard.tsx
git commit -m "feat(trips): TripCard with photo zoom, price + category badges"
```

---

### Task 20: FeatureTripCard (large editorial)

**Files:**
- Create: `src/components/trips/FeatureTripCard.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/trips/FeatureTripCard.tsx
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Trip } from '@/types';
import { PriceBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function FeatureTripCard({ trip, size = 'lg' }: { trip: Trip; size?: 'lg' | 'sm' }) {
  return (
    <Link
      to={`/monoimeres/${trip.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-lg',
        size === 'lg' ? 'aspect-[5/6] lg:aspect-[4/5]' : 'aspect-[4/3]'
      )}
    >
      <img src={trip.photo} alt={trip.photoAlt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-deep-ink via-deep-ink/30 to-transparent" />

      <div className="absolute right-4 top-4">
        <PriceBadge from={trip.priceFrom} original={trip.priceOriginal} />
      </div>

      <div className={cn('absolute inset-x-0 bottom-0 flex flex-col text-surface', size === 'lg' ? 'p-8 lg:p-10' : 'p-6')}>
        <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-cta">
          {trip.duration} · {trip.dates}
        </p>
        <h3 className={cn('font-display font-semibold text-balance leading-[1.1]', size === 'lg' ? 'text-4xl lg:text-5xl' : 'text-2xl')}>
          {trip.title}
        </h3>
        {size === 'lg' && <p className="mt-3 max-w-md text-[15px] leading-relaxed text-surface/85">{trip.description}</p>}
        <div className="mt-6 flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[0.12em]">
          <span>Ανακαλύψτε τη διαδρομή</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1.75} />
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trips/FeatureTripCard.tsx
git commit -m "feat(trips): FeatureTripCard editorial full-bleed variant"
```

---

### Task 21: CruiseCard

**Files:**
- Create: `src/components/cruises/CruiseCard.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/cruises/CruiseCard.tsx
import { Link } from 'react-router-dom';
import { Waves, Clock, Calendar } from 'lucide-react';
import type { Cruise } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function CruiseCard({ cruise, reverse = false }: { cruise: Cruise; reverse?: boolean }) {
  return (
    <article className="group grid overflow-hidden rounded-lg border border-border bg-surface shadow-card md:grid-cols-2 md:min-h-[420px]">
      <div className={cn('relative overflow-hidden bg-primary/5', reverse && 'md:order-2')}>
        <img src={cruise.photo} alt={cruise.photoAlt} className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105" loading="lazy" />
      </div>
      <div className={cn('flex flex-col justify-between gap-8 p-8 md:p-12', reverse && 'md:order-1')}>
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Badge variant="olive">{cruise.routeTag}</Badge>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />{cruise.duration}
            </span>
          </div>
          <h3 className="font-display text-3xl font-semibold leading-tight text-primary md:text-4xl">
            {cruise.title}
          </h3>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">{cruise.description}</p>
          <div className="mt-6 flex items-center gap-2 text-[13px] text-muted">
            <Waves className="h-4 w-4 text-sea" strokeWidth={1.75} />
            {cruise.islands.map((island, i) => (
              <span key={island} className="inline-flex items-center gap-2">
                {island}
                {i < cruise.islands.length - 1 && <span className="text-primary/30">·</span>}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 text-[13px] text-muted">
            <Calendar className="h-4 w-4 text-sea" strokeWidth={1.75} />
            {cruise.dates}
          </div>
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-border pt-6">
          <div>
            <div className="font-sans text-[11px] uppercase tracking-[0.12em] text-muted">Από</div>
            <div className="font-display text-4xl font-bold text-cta tabular">{cruise.priceFrom}€</div>
          </div>
          <Button asChild variant="dark">
            <Link to={`/kroyazieres/${cruise.slug}`}>Κράτηση</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cruises/CruiseCard.tsx
git commit -m "feat(cruises): CruiseCard split editorial layout with reverse variant"
```

---

### Task 22: RouteCard + UseCaseCard for Bus Rentals

**Files:**
- Create: `src/components/rentals/RouteCard.tsx`
- Create: `src/components/rentals/UseCaseCard.tsx`

- [ ] **Step 1: Create `RouteCard.tsx`**

```tsx
// src/components/rentals/RouteCard.tsx
import { MapPin, ArrowRight, Clock } from 'lucide-react';
import type { Route } from '@/types';

export function RouteCard({ route }: { route: Route }) {
  return (
    <div className="group flex flex-col gap-5 rounded-lg border border-border bg-surface p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/8 text-primary transition-colors group-hover:bg-cta group-hover:text-surface">
          <MapPin className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-muted">
          <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
          {route.durationHours}
        </div>
      </div>
      <div>
        <div className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-cta">{route.from}</div>
        <div className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-primary">
          <ArrowRight className="h-4 w-4 opacity-40" strokeWidth={1.75} /> {route.to}
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-muted">{route.description}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `UseCaseCard.tsx`**

```tsx
// src/components/rentals/UseCaseCard.tsx
import * as Lucide from 'lucide-react';
import type { UseCase } from '@/types';

export function UseCaseCard({ item }: { item: UseCase }) {
  const Icon = (Lucide[item.icon as keyof typeof Lucide] as Lucide.LucideIcon) ?? Lucide.Bus;
  return (
    <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-card">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cta/10 text-cta">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold text-primary">{item.title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.description}</p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/rentals/
git commit -m "feat(rentals): RouteCard and UseCaseCard"
```

---

### Task 23: StatCounter with GSAP counter tween

**Files:**
- Create: `src/components/shared/StatCounter.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/shared/StatCounter.tsx
import { useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Stat } from '@/types';

export function StatCounter({ stat }: { stat: Stat }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    const numberEl = scopeRef.current?.querySelector<HTMLElement>('[data-value]');
    if (!numberEl) return;

    if (reduced) {
      numberEl.textContent = stat.value.toLocaleString('el-GR') + (stat.suffix ?? '');
      return;
    }

    const counter = { val: 0 };
    gsap.to(counter, {
      val: stat.value,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: scopeRef.current!,
        start: 'top 85%',
        once: true,
      },
      onUpdate: () => {
        const displayed = Math.round(counter.val).toLocaleString('el-GR');
        numberEl.textContent = displayed + (stat.suffix ?? '');
      },
    });
  }, scopeRef, [reduced]);

  return (
    <div ref={scopeRef} className="text-center md:text-left">
      <div className="font-display text-6xl font-bold text-surface tabular md:text-7xl">
        <span data-value>0</span>
      </div>
      <div className="mt-3 font-sans text-[12px] font-semibold uppercase tracking-[0.18em] text-surface/70">{stat.label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/StatCounter.tsx
git commit -m "feat(shared): StatCounter with GSAP number tween triggered on scroll"
```

---

### Task 24: TestimonialBlock

**Files:**
- Create: `src/components/shared/TestimonialBlock.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/shared/TestimonialBlock.tsx
import type { Testimonial } from '@/types';

export function TestimonialBlock({ item }: { item: Testimonial }) {
  return (
    <figure className="relative flex flex-col gap-6 rounded-lg bg-surface p-8 shadow-card">
      <span aria-hidden="true" className="font-display text-8xl leading-none text-cta/20">"</span>
      <blockquote className="-mt-8 font-display text-[22px] italic leading-[1.4] text-primary">
        {item.quote}
      </blockquote>
      <figcaption className="mt-auto border-t border-border pt-5">
        <div className="font-sans text-[15px] font-semibold text-primary">{item.name}</div>
        <div className="font-sans text-[12px] uppercase tracking-[0.14em] text-muted">{item.city}</div>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/TestimonialBlock.tsx
git commit -m "feat(shared): TestimonialBlock editorial pull-quote"
```

---

### Task 25: CategoryPill strip

**Files:**
- Create: `src/components/home/CategoryStrip.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/home/CategoryStrip.tsx
import { Link } from 'react-router-dom';
import { Ship, MapPin, Compass, Waves, Mountain, Bus } from 'lucide-react';

const CATEGORIES = [
  { to: '/monoimeres', label: 'Μονοήμερες', icon: MapPin },
  { to: '/kroyazieres', label: 'Κρουαζιέρες', icon: Ship },
  { to: '/monoimeres', label: 'Πολυήμερες', icon: Compass },
  { to: '/monoimeres', label: 'Θαλάσσια Μπάνια', icon: Waves },
  { to: '/monoimeres', label: 'Πεζοπορίες', icon: Mountain },
  { to: '/pullman-rentals', label: 'Ενοικίαση Πούλμαν', icon: Bus },
];

export function CategoryStrip() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="container">
        <div className="scrollbar-hide flex gap-3 overflow-x-auto py-6 md:justify-center md:gap-4">
          {CATEGORIES.map(({ to, label, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-background px-5 py-2.5 font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary transition-all hover:border-cta hover:bg-cta hover:text-surface"
            >
              <Icon className="h-4 w-4 opacity-60 group-hover:opacity-100" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/home/CategoryStrip.tsx
git commit -m "feat(home): CategoryStrip horizontal pill scroller"
```

---

### Task 26: EditorialFeature (mask-reveal)

**Files:**
- Create: `src/components/home/EditorialFeature.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/home/EditorialFeature.tsx
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/Button';

export function EditorialFeature() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    gsap.fromTo(
      '[data-mask]',
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.4,
        ease: 'power4.out',
        scrollTrigger: { trigger: scopeRef.current!, start: 'top 70%', once: true },
      }
    );
    gsap.from('[data-editorial-text] > *', {
      y: 30,
      opacity: 0,
      stagger: 0.12,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: scopeRef.current!, start: 'top 60%', once: true },
    });
  }, scopeRef, [reduced]);

  return (
    <section ref={scopeRef} className="py-24 md:py-32">
      <div className="container grid gap-12 md:grid-cols-2 md:items-center">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
          <div data-mask className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1601581875039-e899893d520c?w=1600&q=80"
              alt="Λιμάνι της Ύδρας"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        <div data-editorial-text className="max-w-lg">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">Αυτό το Σαββατοκύριακο</p>
          <h2 className="mt-4 font-display text-display-section italic text-primary">Ύδρα — το νησί του Μιαούλη</h2>
          <p className="mt-6 text-[17px] leading-relaxed text-muted">
            Η Ύδρα δεν έχει αυτοκίνητα. Έχει μόνο πέτρα, φως, θάλασσα και ιστορία. Ένα ταξίδι που μοιάζει με ταινία. Καθημερινές αναχωρήσεις από τον Πειραιά, μαζί με τον έμπειρο συνοδό μας.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Button asChild>
              <Link to="/monoimeres">Δείτε τη Διαδρομή</Link>
            </Button>
            <div className="font-display text-lg italic text-muted">από <span className="text-2xl font-bold not-italic text-cta">25€</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/home/EditorialFeature.tsx
git commit -m "feat(home): EditorialFeature with clip-path mask reveal on scroll"
```

---

### Task 27: SortBar + Pagination

**Files:**
- Create: `src/components/trips/SortBar.tsx`
- Create: `src/components/trips/Pagination.tsx`

- [ ] **Step 1: Create `SortBar.tsx`**

```tsx
// src/components/trips/SortBar.tsx
export type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'date';

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Δημοφιλή' },
  { key: 'price-asc', label: 'Τιμή ↑' },
  { key: 'price-desc', label: 'Τιμή ↓' },
  { key: 'date', label: 'Ημερομηνία' },
];

export function SortBar({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="sticky top-20 z-20 -mx-4 mb-10 flex items-center gap-4 border-y border-border bg-background/95 px-4 py-4 backdrop-blur">
      <span className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Ταξινόμηση</span>
      <div className="scrollbar-hide flex gap-1 overflow-x-auto">
        {OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 font-sans text-[13px] font-medium transition-colors ${
              value === key ? 'bg-primary text-surface' : 'text-primary hover:bg-primary/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Pagination.tsx`**

```tsx
// src/components/trips/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null;
  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== 'ellipsis') pages.push('ellipsis');
  }
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1} className="grid h-10 w-10 place-items-center rounded-full border border-border text-primary transition hover:bg-primary hover:text-surface disabled:opacity-40" aria-label="Προηγούμενη σελίδα">
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="px-2 text-muted">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`grid h-10 w-10 place-items-center rounded-full font-sans text-[14px] font-semibold transition ${
              p === current ? 'bg-cta text-surface' : 'text-primary hover:bg-primary/10'
            }`}
            aria-current={p === current ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button type="button" onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total} className="grid h-10 w-10 place-items-center rounded-full border border-border text-primary transition hover:bg-primary hover:text-surface disabled:opacity-40" aria-label="Επόμενη σελίδα">
        <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </nav>
  );
}
```

- [ ] **Step 3: Add scrollbar-hide utility to `src/index.css`**

```css
@layer utilities {
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/trips/SortBar.tsx src/components/trips/Pagination.tsx src/index.css
git commit -m "feat(trips): sticky SortBar and elegant Pagination"
```

---

### Task 28: RevealOnScroll wrapper

**Files:**
- Create: `src/components/shared/RevealOnScroll.tsx`

Reusable batched-stagger reveal for cards.

- [ ] **Step 1: Create**

```tsx
// src/components/shared/RevealOnScroll.tsx
import { useRef, type ReactNode } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  children: ReactNode;
  selector?: string;
  stagger?: number;
  y?: number;
  className?: string;
};

export function RevealOnScroll({ children, selector = '[data-reveal]', stagger = 0.09, y = 32, className }: Props) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    const targets = scopeRef.current?.querySelectorAll<HTMLElement>(selector);
    if (!targets || targets.length === 0) return;

    gsap.set(targets, { opacity: 0, y });
    ScrollTrigger.batch(Array.from(targets), {
      start: 'top 85%',
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger, overwrite: true }),
      once: true,
    });
  }, scopeRef, [reduced]);

  return <div ref={scopeRef} className={className}>{children}</div>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/RevealOnScroll.tsx
git commit -m "feat(shared): RevealOnScroll with ScrollTrigger.batch stagger"
```

---

## Phase 6 — Home Page Assembly

### Task 29: HomeHero (bespoke 100vh hero with split-type)

**Files:**
- Create: `src/components/home/HomeHero.tsx`

- [ ] **Step 1: Create**

```tsx
// src/components/home/HomeHero.tsx
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import SplitType from 'split-type';
import { ChevronDown, Bus } from 'lucide-react';
import { gsap } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/Button';

export function HomeHero() {
  const scopeRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    if (titleRef.current) {
      const split = new SplitType(titleRef.current, { types: 'words' });
      gsap.from(split.words, { yPercent: 100, opacity: 0, duration: 1, ease: 'power4.out', stagger: 0.08 });
    }
    gsap.from('[data-hero-eyebrow]', { opacity: 0, y: 15, delay: 0.2, duration: 0.7, ease: 'power2.out' });
    gsap.from('[data-hero-sub]', { opacity: 0, y: 20, delay: 0.8, duration: 0.8, ease: 'power2.out' });
    gsap.from('[data-hero-cta]', { opacity: 0, y: 20, delay: 1.1, duration: 0.7, ease: 'power2.out', stagger: 0.15 });
    gsap.from('[data-hero-scroll]', { opacity: 0, y: 10, delay: 1.6, duration: 0.6, ease: 'power2.out' });
    gsap.from('[data-hero-img]', { scale: 1.1, duration: 1.6, ease: 'power2.out' });
  }, scopeRef, [reduced]);

  return (
    <section ref={scopeRef} className="relative h-[100vh] min-h-[640px] w-full overflow-hidden">
      <img
        data-hero-img
        src="https://images.unsplash.com/photo-1533105079780-92b9be482077?w=2000&q=85"
        alt="Λευκά και μπλε ελληνικού νησιού"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-deep-ink/40 via-deep-ink/30 to-deep-ink/80" />
      <div className="container relative flex h-full flex-col justify-end pb-20 pt-32 text-surface">
        <p data-hero-eyebrow className="mb-5 inline-flex items-center gap-3 self-start rounded-full border border-surface/25 bg-surface/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cta" />
          Από το 1995 · Ταξιδιωτικό Γραφείο Περιστέρι
        </p>
        <h1 ref={titleRef} className="max-w-5xl overflow-hidden font-display text-display-hero text-balance leading-[1.02]">
          Ανακαλύψτε<br/>την Ελλάδα
        </h1>
        <p data-hero-sub className="mt-6 max-w-2xl text-[19px] leading-relaxed text-surface/85">
          Μονοήμερες, κρουαζιέρες και πολυήμερες εκδρομές από την Αθήνα. 30 χρόνια εμπειρίας. Άνετα πούλμαν, έμπειροι ξεναγοί, ξεκάθαρες τιμές.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <div data-hero-cta>
            <Button asChild size="lg">
              <Link to="/monoimeres">Δείτε τις Εκδρομές</Link>
            </Button>
          </div>
          <div data-hero-cta>
            <Button asChild variant="ghost" size="lg">
              <Link to="/pullman-rentals"><Bus className="h-4 w-4" strokeWidth={1.75}/> Ενοικίαση Πούλμαν</Link>
            </Button>
          </div>
        </div>
      </div>
      <div data-hero-scroll className="absolute bottom-6 left-1/2 -translate-x-1/2 text-surface/70">
        <ChevronDown className="h-6 w-6 animate-bounce" strokeWidth={1.5} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/home/HomeHero.tsx
git commit -m "feat(home): HomeHero with word-by-word title reveal, staggered content"
```

---

### Task 30: Home page assembly

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Assemble the home page**

```tsx
// src/pages/HomePage.tsx
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { HomeHero } from '@/components/home/HomeHero';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { EditorialFeature } from '@/components/home/EditorialFeature';
import { TripCard } from '@/components/trips/TripCard';
import { FeatureTripCard } from '@/components/trips/FeatureTripCard';
import { CruiseCard } from '@/components/cruises/CruiseCard';
import { StatCounter } from '@/components/shared/StatCounter';
import { TestimonialBlock } from '@/components/shared/TestimonialBlock';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { TextLink } from '@/components/ui/TextLink';
import { Button } from '@/components/ui/Button';
import { trips } from '@/data/trips';
import { cruises } from '@/data/cruises';
import { testimonials } from '@/data/testimonials';
import { stats } from '@/data/stats';

export default function HomePage() {
  const featured = trips.filter((t) => t.featured);
  const [large, ...rest] = featured;
  const otherFeatured = rest.slice(0, 2);

  return (
    <>
      <HomeHero />
      <CategoryStrip />

      {/* Featured trips */}
      <section className="py-24 md:py-32">
        <div className="container">
          <SectionHeading
            eyebrow="Ξεχωριστές Επιλογές"
            title="Οι πιο δημοφιλείς εκδρομές μας"
            subtitle="Επιλεγμένες από τους ταξιδιώτες μας — μονοήμερες αποδράσεις με αρχή και τέλος στην Αθήνα."
            action={<TextLink to="/monoimeres">Όλες οι εκδρομές</TextLink>}
          />
          <RevealOnScroll className="mt-14 grid gap-6 lg:grid-cols-12">
            {large && (
              <div data-reveal className="lg:col-span-7">
                <FeatureTripCard trip={large} size="lg" />
              </div>
            )}
            <div className="grid gap-6 lg:col-span-5">
              {otherFeatured.map((trip) => (
                <div key={trip.id} data-reveal>
                  <FeatureTripCard trip={trip} size="sm" />
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* About + stats (dark) */}
      <section className="bg-deep-ink py-24 text-surface md:py-32">
        <div className="container grid gap-16 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">Από το 1995</p>
            <h2 className="mt-4 font-display text-display-section text-surface">
              Τριάντα χρόνια δημιουργούμε αναμνήσεις
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-surface/80">
              Είμαστε ένα ταξιδιωτικό γραφείο στο Περιστέρι που πιστεύει ότι κάθε εκδρομή είναι μια ιστορία. Οργανώνουμε ταξίδια σε όλη την Ελλάδα με σεβασμό στον χρόνο και τη διάθεσή σας.
            </p>
            <div className="mt-8">
              <Button asChild variant="ghost">
                <Link to="/epikoinonia">Ελάτε να γνωριστούμε</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 md:col-span-7 md:gap-14">
            {stats.map((stat) => <StatCounter key={stat.id} stat={stat} />)}
          </div>
        </div>
      </section>

      <EditorialFeature />

      {/* Cruises teaser */}
      <section className="bg-surface py-24 md:py-32">
        <div className="container">
          <SectionHeading
            eyebrow="Θάλασσα"
            title="Κρουαζιέρες στον Σαρωνικό"
            subtitle="Τρεις κρουαζιέρες, τρεις ολόκληρες μέρες θάλασσας — χωρίς άγχος, χωρίς μετακίνηση."
            action={<TextLink to="/kroyazieres">Όλες οι κρουαζιέρες</TextLink>}
          />
          <RevealOnScroll className="mt-14 flex flex-col gap-8">
            {cruises.map((cruise, i) => (
              <div key={cruise.id} data-reveal>
                <CruiseCard cruise={cruise} reverse={i % 2 === 1} />
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32">
        <div className="container">
          <SectionHeading eyebrow="Οι Ταξιδιώτες Μας" title="Τι λένε όσοι ταξίδεψαν μαζί μας" align="center" />
          <RevealOnScroll className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} data-reveal>
                <TestimonialBlock item={t} />
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-cta py-16 text-surface">
        <div className="container flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Έτοιμοι για την επόμενη περιπέτεια;</h2>
            <p className="mt-2 text-[17px] text-surface/90">Καλέστε μας ή στείλτε μας μήνυμα — απαντάμε την ίδια μέρα.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="tel:+302105712451" className="inline-flex items-center gap-3 rounded-full bg-surface px-6 py-3 font-display text-2xl font-semibold text-cta transition hover:bg-surface/90">
              <Phone className="h-5 w-5" strokeWidth={1.75}/> 210 571 2451
            </a>
            <Link to="/epikoinonia" className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4 hover:text-surface/80">
              ή στείλτε μήνυμα
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Fix `main` padding — hero must start at top of viewport**

The Navbar is `fixed`, so pages already start under it visually. But inner pages (not home) need top-padding equal to the navbar height so their content isn't hidden. We'll handle this in PageHero (already has `pt-32`).

Also: since `PageTransition` wraps content and `main#main` starts on this page, we must be sure the Navbar isn't blocking hero clicks. Check by viewing home — the CTA should be clickable.

- [ ] **Step 3: Verify visually — full home page renders correctly at 375, 768, 1024, 1440**

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat(home): assemble Home page — hero, featured, stats, editorial, cruises, testimonials"
```

---

## Phase 7 — Listing Pages

### Task 31: Day Trips page (Μονοήμερες)

**Files:**
- Modify: `src/pages/MonoimeresPage.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/pages/MonoimeresPage.tsx
import { useMemo, useState } from 'react';
import { PageHero } from '@/components/shared/PageHero';
import { TripCard } from '@/components/trips/TripCard';
import { SortBar, type SortKey } from '@/components/trips/SortBar';
import { Pagination } from '@/components/trips/Pagination';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { trips } from '@/data/trips';

const PAGE_SIZE = 9;

export default function MonoimeresPage() {
  const [sort, setSort] = useState<SortKey>('popular');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const arr = [...trips];
    switch (sort) {
      case 'price-asc': return arr.sort((a, b) => a.priceFrom - b.priceFrom);
      case 'price-desc': return arr.sort((a, b) => b.priceFrom - a.priceFrom);
      case 'date': return arr; // dates are non-comparable strings; keep insertion
      case 'popular':
      default: return arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
  }, [sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHero
        photo="https://images.unsplash.com/photo-1533760881669-80db4d7b341a?w=2000&q=85"
        photoAlt="Ελληνική παραλία"
        breadcrumbs={[{ label: 'Αρχική', to: '/' }, { label: 'Εκδρομές' }, { label: 'Μονοήμερες' }]}
        eyebrow="2026"
        title="Μονοήμερες Εκδρομές από την Αθήνα"
        subtitle="Επιλέξτε από 30+ προορισμούς — Ύδρα, Μετέωρα, Δελφοί, Σούνιο και πολλούς ακόμη."
      />
      <section className="py-16 md:py-24">
        <div className="container">
          <p className="mx-auto max-w-prose text-center font-display text-[19px] italic leading-relaxed text-muted">
            Κάθε Σαββατοκύριακο ξεκινάμε από τον σταθμό μας στο Περιστέρι και σας πάμε στα πιο όμορφα σημεία της Ελλάδας. Χωρίς άγχος, χωρίς οργάνωση από εσάς.
          </p>
          <SortBar value={sort} onChange={(v) => { setSort(v); setPage(1); }} />
          <RevealOnScroll className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((trip) => (
              <div key={trip.id} data-reveal><TripCard trip={trip} /></div>
            ))}
          </RevealOnScroll>
          <Pagination current={page} total={totalPages} onChange={setPage} />
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify — visit `/monoimeres`, click sort options, click pagination**

- [ ] **Step 3: Commit**

```bash
git add src/pages/MonoimeresPage.tsx
git commit -m "feat(pages): Day Trips listing with sort + pagination"
```

---

### Task 32: Cruises page (Κρουαζιέρες)

**Files:**
- Modify: `src/pages/KroyazieresPage.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/pages/KroyazieresPage.tsx
import { PageHero } from '@/components/shared/PageHero';
import { CruiseCard } from '@/components/cruises/CruiseCard';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { Button } from '@/components/ui/Button';
import { Phone } from 'lucide-react';
import { cruises } from '@/data/cruises';

export default function KroyazieresPage() {
  return (
    <>
      <PageHero
        photo="https://images.unsplash.com/photo-1523592121529-f6dde35f079e?w=2000&q=85"
        photoAlt="Θέα των Σαρωνικών νησιών από ψηλά"
        breadcrumbs={[{ label: 'Αρχική', to: '/' }, { label: 'Κρουαζιέρες' }]}
        eyebrow="Σαρωνικός · Αργοσαρωνικός"
        title="Κρουαζιέρες από τον Πειραιά"
        subtitle="Μια μέρα, τρία νησιά, χίλιες φωτογραφίες. Οργανωμένες κρουαζιέρες με άνετα πλοία και γεύμα εν πλω."
        heightClass="h-[70vh] min-h-[520px]"
      />
      <section className="py-16 md:py-24">
        <div className="container">
          <p className="mx-auto max-w-prose text-center font-display text-[19px] italic leading-relaxed text-muted">
            Οι κρουαζιέρες μας αναχωρούν από τον Πειραιά κάθε πρωί. Επιλέξτε ανάμεσα σε ημερήσιες περιηγήσεις σε τρία νησιά ή αποκλειστικά ταξίδια κολύμβησης — μαζί με ξεναγό, γεύμα και μουσική.
          </p>
          <RevealOnScroll className="mt-16 flex flex-col gap-10">
            {cruises.map((cruise, i) => (
              <div key={cruise.id} data-reveal>
                <CruiseCard cruise={cruise} reverse={i % 2 === 1} />
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>
      <section className="bg-primary py-16 text-surface">
        <div className="container flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-display text-3xl font-semibold">Προτιμάτε να κλείσετε τηλεφωνικά;</h2>
            <p className="mt-2 text-surface/80">Καλέστε μας — απαντάμε την ίδια μέρα.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="ghost" size="lg">
              <a href="tel:+302105712451"><Phone className="h-4 w-4" strokeWidth={1.75}/> 210 571 2451</a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="tel:+306976811825"><Phone className="h-4 w-4" strokeWidth={1.75}/> 6976 811 825</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify — visit `/kroyazieres`, cards alternate side, hover state works**

- [ ] **Step 3: Commit**

```bash
git add src/pages/KroyazieresPage.tsx
git commit -m "feat(pages): Cruises page with alternating editorial cards + phone CTA"
```

---

### Task 33: Bus Rentals page

**Files:**
- Modify: `src/pages/RentalsPage.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/pages/RentalsPage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserRound, Wrench, MapPinned, PhoneCall, Phone } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { RouteCard } from '@/components/rentals/RouteCard';
import { UseCaseCard } from '@/components/rentals/UseCaseCard';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { Button } from '@/components/ui/Button';
import { routes } from '@/data/routes';
import { useCases } from '@/data/useCases';

const VALUE_PROPS = [
  { icon: UserRound, title: 'Έμπειροι Οδηγοί', description: 'Πιστοποιημένοι οδηγοί με πολυετή εμπειρία σε τουριστικές μεταφορές.' },
  { icon: Wrench, title: 'Σύγχρονος Στόλος', description: 'Νεότερα πούλμαν με air-condition, mic, wifi και χώρο για αποσκευές.' },
  { icon: MapPinned, title: 'Καθόλη την Ελλάδα', description: 'Από τη Χαλκιδική μέχρι τη Μάνη — καλύπτουμε κάθε προορισμό.' },
  { icon: PhoneCall, title: '24ώρη Εξυπηρέτηση', description: 'Είμαστε διαθέσιμοι όλο το εικοσιτετράωρο για κρατήσεις και αλλαγές.' },
];

export default function RentalsPage() {
  return (
    <>
      <PageHero
        photo="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=2000&q=85"
        photoAlt="Πούλμαν σε ελληνικό δρόμο"
        breadcrumbs={[{ label: 'Αρχική', to: '/' }, { label: 'Ενοικιάσεις Πούλμαν' }]}
        eyebrow="Εκδρομές · Μεταφορές · Εταιρικά"
        title="Ενοικιάσεις Πούλμαν"
        subtitle="Ιδιωτικές μεταφορές με σύγχρονα πούλμαν, έμπειρους οδηγούς και ξεκάθαρες τιμές. Από την Αθήνα σε όλη την Ελλάδα."
      />

      {/* Value props */}
      <section className="border-b border-border py-16">
        <div className="container grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="text-center md:text-left">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/8 text-primary md:mx-0">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-primary">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured routes */}
      <section className="py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Ενδεικτικές Διαδρομές"
            title="Δημοφιλείς εξορμήσεις με το πούλμαν"
            subtitle="Οι διαδρομές που μας ζητούν πιο συχνά. Καλέστε μας για προσαρμοσμένα προγράμματα."
          />
          <RevealOnScroll className="mt-14 grid gap-6 lg:grid-cols-3">
            {routes.map((route) => (
              <div key={route.id} data-reveal><RouteCard route={route} /></div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-surface py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Για Ποιόν"
            title="Εξειδικευμένες υπηρεσίες"
            align="center"
          />
          <RevealOnScroll className="mt-14 grid gap-6 md:grid-cols-3">
            {useCases.map((u) => (
              <div key={u.id} data-reveal><UseCaseCard item={u} /></div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* Quote CTA */}
      <section className="bg-deep-ink py-24 text-surface md:py-32">
        <div className="container grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">Προσφορά χωρίς κόστος</p>
            <h2 className="mt-4 font-display text-display-section text-surface">Ζητήστε προσφορά για την εκδρομή σας</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-surface/80">
              Πείτε μας τον προορισμό, την ημερομηνία και τον αριθμό επιβατών — θα σας απαντήσουμε με πλήρη τιμή εντός 24 ωρών.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <a href="tel:+302105712451" className="group inline-flex items-center gap-3 text-surface">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-cta"><Phone className="h-4 w-4" strokeWidth={1.75}/></div>
                <div>
                  <div className="font-sans text-[11px] uppercase tracking-[0.14em] text-surface/60">Τηλέφωνο γραφείου</div>
                  <div className="font-display text-2xl font-semibold group-hover:text-cta">210 571 2451</div>
                </div>
              </a>
              <a href="tel:+306976811825" className="group inline-flex items-center gap-3 text-surface">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-cta"><PhoneCall className="h-4 w-4" strokeWidth={1.75}/></div>
                <div>
                  <div className="font-sans text-[11px] uppercase tracking-[0.14em] text-surface/60">Κινητό 24ώρου</div>
                  <div className="font-display text-2xl font-semibold group-hover:text-cta">6976 811 825</div>
                </div>
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-surface/10 bg-surface p-8 text-body md:p-10">
            <QuoteForm />
          </div>
        </div>
      </section>
    </>
  );
}

// Inline mini form (kept simple, no backend)
const QuoteSchema = z.object({
  name: z.string().min(2, 'Παρακαλώ συμπληρώστε το όνομά σας.'),
  phone: z.string().min(8, 'Παρακαλώ συμπληρώστε ένα έγκυρο τηλέφωνο.'),
  date: z.string().min(1, 'Παρακαλώ επιλέξτε ημερομηνία.'),
  notes: z.string().optional(),
});
type QuoteInput = z.infer<typeof QuoteSchema>;

function QuoteForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<QuoteInput>({
    resolver: zodResolver(QuoteSchema),
  });
  const onSubmit = (data: QuoteInput) => {
    // No backend — simulate success
    console.log('quote request:', data);
    setSent(true);
  };
  if (sent) {
    return (
      <div className="py-8 text-center">
        <h3 className="font-display text-2xl font-semibold text-primary">Το αίτημά σας παρελήφθη</h3>
        <p className="mt-3 text-muted">Θα επικοινωνήσουμε μαζί σας εντός 24 ωρών.</p>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <h3 className="font-display text-2xl font-semibold text-primary">Γρήγορη Προσφορά</h3>
      <Field label="Ονοματεπώνυμο" error={errors.name?.message}>
        <input {...register('name')} className={inputCls} placeholder="π.χ. Γιώργος Παπαδόπουλος" />
      </Field>
      <Field label="Τηλέφωνο" error={errors.phone?.message}>
        <input {...register('phone')} className={inputCls} placeholder="π.χ. 6900 000 000" />
      </Field>
      <Field label="Ημερομηνία" error={errors.date?.message}>
        <input type="date" {...register('date')} className={inputCls} />
      </Field>
      <Field label="Προορισμός / Σημειώσεις">
        <textarea {...register('notes')} rows={3} className={inputCls} placeholder="π.χ. Δελφοί, 30 άτομα, σχολική εκδρομή" />
      </Field>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Αποστολή…' : 'Ζητήστε Προσφορά'}
      </Button>
    </form>
  );
}

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-3 font-sans text-[15px] text-body placeholder:text-muted/60 transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}
```

- [ ] **Step 2: Verify — visit `/pullman-rentals`, fill quote form, submit shows success**

- [ ] **Step 3: Commit**

```bash
git add src/pages/RentalsPage.tsx
git commit -m "feat(pages): Bus Rentals page with routes, use cases, quote form (RHF+Zod)"
```

---

### Task 34: Contact page

**Files:**
- Modify: `src/pages/ContactPage.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/pages/ContactPage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Youtube, ExternalLink, Check } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { Button } from '@/components/ui/Button';

const ContactSchema = z.object({
  name: z.string().min(2, 'Παρακαλώ συμπληρώστε το όνομά σας.'),
  email: z.string().email('Μη έγκυρη διεύθυνση email.'),
  phone: z.string().optional(),
  subject: z.string().min(2, 'Παρακαλώ γράψτε ένα θέμα.'),
  message: z.string().optional(),
});
type ContactInput = z.infer<typeof ContactSchema>;

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(ContactSchema),
  });
  const onSubmit = (data: ContactInput) => { console.log('contact submit:', data); setSent(true); };

  return (
    <>
      <PageHero
        photo="https://images.unsplash.com/photo-1598969906520-b5bea34a9db4?w=2000&q=85"
        photoAlt="Θέα της Ακρόπολης"
        breadcrumbs={[{ label: 'Αρχική', to: '/' }, { label: 'Επικοινωνία' }]}
        eyebrow="Είμαστε εδώ για εσάς"
        title="Επικοινωνήστε μαζί μας"
        subtitle="Π. Μελά 45, Περιστέρι 121 31 · Απαντάμε την ίδια μέρα."
        heightClass="h-[50vh] min-h-[380px]"
      />

      <section className="py-20 md:py-28">
        <div className="container grid gap-10 lg:grid-cols-12">
          {/* Form */}
          <div className="lg:col-span-7">
            <div className="rounded-lg border border-border bg-surface p-8 shadow-card md:p-12">
              {sent ? (
                <div className="py-16 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-olive text-surface"><Check className="h-8 w-8" strokeWidth={1.5}/></div>
                  <h3 className="mt-6 font-display text-3xl font-semibold text-primary">Το μήνυμά σας εστάλη</h3>
                  <p className="mt-3 text-muted">Θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.</p>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-3xl font-semibold text-primary">Στείλτε μας μήνυμα</h2>
                  <p className="mt-2 text-muted">Συμπληρώστε τη φόρμα και θα σας απαντήσουμε άμεσα.</p>
                  <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Ονοματεπώνυμο *" error={errors.name?.message}>
                        <input {...register('name')} className={inputCls} placeholder="π.χ. Μαρία Παπαδοπούλου" />
                      </Field>
                      <Field label="Email *" error={errors.email?.message}>
                        <input {...register('email')} type="email" className={inputCls} placeholder="π.χ. maria@example.com" />
                      </Field>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Τηλέφωνο" error={errors.phone?.message}>
                        <input {...register('phone')} className={inputCls} placeholder="Προαιρετικό" />
                      </Field>
                      <Field label="Θέμα *" error={errors.subject?.message}>
                        <input {...register('subject')} className={inputCls} placeholder="π.χ. Κράτηση για Μετέωρα" />
                      </Field>
                    </div>
                    <Field label="Μήνυμα">
                      <textarea {...register('message')} rows={5} className={inputCls} placeholder="Πείτε μας πώς μπορούμε να σας εξυπηρετήσουμε…" />
                    </Field>
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? 'Αποστολή…' : 'Αποστολή Μηνύματος'}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Info sidebar */}
          <aside className="lg:col-span-5">
            <div className="sticky top-28 flex flex-col gap-6">
              <div className="rounded-lg bg-deep-ink p-8 text-surface md:p-10">
                <h3 className="font-display text-2xl font-semibold">Στοιχεία Επικοινωνίας</h3>
                <ul className="mt-6 space-y-5 text-[15px]">
                  <li className="flex items-start gap-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5}/>
                    <div>
                      <div className="font-semibold">Π. Μελά 45, Περιστέρι 121 31</div>
                      <div className="text-surface/60">Μετρό Αγίου Αντωνίου</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5}/>
                    <div className="space-y-1">
                      <a href="tel:+302105712451" className="block font-semibold hover:text-cta">210 571 2451</a>
                      <a href="tel:+302108212452" className="block font-semibold hover:text-cta">210 821 2452</a>
                      <a href="tel:+306976811825" className="block font-semibold hover:text-cta">6976 811 825 <span className="text-[13px] font-normal text-surface/60">· 24ώρο</span></a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5}/>
                    <a href="mailto:info@sergianitravel.gr" className="font-semibold hover:text-cta">info@sergianitravel.gr</a>
                  </li>
                  <li className="flex items-start gap-4">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5}/>
                    <div className="space-y-1">
                      <div><span className="font-semibold">Δευ–Παρ:</span> 09:00–17:00</div>
                      <div><span className="font-semibold">Σάββατο:</span> 09:00–14:00</div>
                    </div>
                  </li>
                </ul>
                <div className="mt-8 border-t border-surface/10 pt-6">
                  <div className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-surface/60">Ακολουθήστε μας</div>
                  <div className="flex gap-3">
                    <SocialIcon href="https://facebook.com/sergiani.travelgr" label="Facebook"><Facebook className="h-4 w-4" strokeWidth={1.75}/></SocialIcon>
                    <SocialIcon href="https://instagram.com/sergiani_travel" label="Instagram"><Instagram className="h-4 w-4" strokeWidth={1.75}/></SocialIcon>
                    <SocialIcon href="https://youtube.com/@sergianitravel" label="YouTube"><Youtube className="h-4 w-4" strokeWidth={1.75}/></SocialIcon>
                    <SocialIcon href="https://tripadvisor.com" label="TripAdvisor"><ExternalLink className="h-4 w-4" strokeWidth={1.75}/></SocialIcon>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Google Maps */}
      <section className="border-t border-border">
        <div className="aspect-[16/6] w-full">
          <iframe
            title="Sergiani Travel — τοποθεσία γραφείου"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3145.9!2d23.6835!3d38.014!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sPeristeri!5e0!3m2!1sen!2sgr!4v1700000000000"
            width="100%"
            height="100%"
            loading="lazy"
            style={{ border: 0, filter: 'saturate(0.85) hue-rotate(-8deg)' }}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}

const inputCls =
  'w-full rounded-md border border-border bg-background px-4 py-3 font-sans text-[15px] text-body placeholder:text-muted/50 transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 text-surface transition-colors hover:bg-cta">
      {children}
    </a>
  );
}
```

- [ ] **Step 2: Verify — visit `/epikoinonia`, fill and submit form, see success state**

- [ ] **Step 3: Commit**

```bash
git add src/pages/ContactPage.tsx
git commit -m "feat(pages): Contact page with form, info sidebar, map embed"
```

---

## Phase 8 — Polish & Verification

### Task 35: Verify TypeScript + build succeeds

**Files:** — none modified unless errors surface

- [ ] **Step 1: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any that appear before proceeding.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: `dist/` created without errors. Check bundle sizes reasonable.

- [ ] **Step 3: Preview build**

```bash
npm run preview
```

Visit each page. Confirm production-mode animation still works.

- [ ] **Step 4: Commit if any fixes were needed**

If no changes: skip. Otherwise:

```bash
git add -A
git commit -m "fix: resolve build issues"
```

---

### Task 36: Responsive verification pass

**Files:** — CSS fixes as needed

- [ ] **Step 1: In browser dev tools, test each page at 375, 768, 1024, 1440 px**

Pages to check: `/`, `/monoimeres`, `/kroyazieres`, `/pullman-rentals`, `/epikoinonia`.

At each breakpoint verify:
- No horizontal scroll.
- Hero readable (title doesn't overflow, subtitle wraps).
- Nav collapses to hamburger below `lg` (1024px).
- Cards reflow: 3-col → 2-col → 1-col cleanly.
- Footer stays legible.

- [ ] **Step 2: Fix any layout breaks by adjusting Tailwind responsive classes**

- [ ] **Step 3: Commit if changes made**

```bash
git add -A
git commit -m "fix(responsive): tighten layout at 375/768/1024 breakpoints"
```

---

### Task 37: Accessibility verification pass

**Files:** — a11y fixes as needed

- [ ] **Step 1: Keyboard-nav each page**

Tab through: are focus rings visible? Does tab order match visual? Does hamburger menu trap focus?

- [ ] **Step 2: Check images have alt text**

Grep: `grep -rn "<img" src/ | grep -v "alt="` — expected: no results.

- [ ] **Step 3: Check form labels**

Every `<input>` and `<textarea>` in the codebase is wrapped in a `<label>` — confirmed by design of `Field` component.

- [ ] **Step 4: Run Lighthouse a11y audit (optional but recommended)**

In Chrome DevTools → Lighthouse → Accessibility only. Target score ≥ 95.

- [ ] **Step 5: Fix any issues**

Common fixes: add `aria-label` to icon buttons that lack one; increase contrast on any low-contrast text.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(a11y): keyboard focus, alt text, aria-labels pass"
```

---

### Task 38: Reduced-motion verification

**Files:** — none unless motion leaks

- [ ] **Step 1: In macOS System Preferences → Accessibility → Display → enable "Reduce motion"**

Or in Chrome DevTools: Rendering panel → "Emulate CSS media feature prefers-reduced-motion: reduce".

- [ ] **Step 2: Reload every page and confirm no animations play**

Hero should render immediately at final state. Cards should be visible without waiting for scroll. Number counters should show final values immediately.

- [ ] **Step 3: If any animation slips through, add reduced-motion gates to that component's useGsapContext**

- [ ] **Step 4: Commit if changes made**

```bash
git add -A
git commit -m "fix(motion): ensure all GSAP effects honor prefers-reduced-motion"
```

---

### Task 39: Cross-page navigation smoke test

**Files:** — none

- [ ] **Step 1: Manual click-through**

From home, click every nav item, every card, every CTA. Verify:
- Every link routes to a real page.
- Page transitions animate.
- Scroll returns to top on navigation.
- No console errors.

- [ ] **Step 2: Fix any broken links**

- [ ] **Step 3: Commit if changes made**

---

### Task 40: Final README and preview

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write a client-presentable README**

```md
# Sergiani Travel — Website Redesign Template

Production-quality React template presenting a redesign of https://sergianitravel.gr, built for client review.

## Design System

"Aegean Editorial" — full spec in `docs/superpowers/specs/2026-07-01-serigiani-redesign-design.md`.

Palette: Aegean Deep (#1B3A5C) · Terracotta (#C96A47) · Ivory Sand (#F7F2EB).
Type: Playfair Display + Inter.
Motion: GSAP with ScrollTrigger, respecting `prefers-reduced-motion`.

## Pages

- `/` — Home
- `/monoimeres` — Day Trips listing
- `/kroyazieres` — Cruises listing
- `/pullman-rentals` — Bus Rentals
- `/epikoinonia` — Contact

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, GSAP, React Router, React Hook Form, Zod, Lucide React.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run preview` — preview production build
- `npm run test:run` — run vitest suite
```

- [ ] **Step 2: Final commit**

```bash
git add README.md
git commit -m "docs: README with tech stack, pages, run instructions"
```

- [ ] **Step 3: Final verification — `npm run dev` + click through all 5 pages one last time**

---

## Post-Plan Notes

- Individual trip detail pages (`/monoimeres/[slug]`) are stubbed as `<Link>` targets but not implemented — they'd 404. This is documented in the design spec Section 16 (out of scope). If the client wants them, add a Phase 9 with a dynamic route + `TripDetailPage`.
- The map iframe uses a generic Google Maps embed URL — replace with the actual embed URL from the current site's contact page before client hand-off.
- Photos are Unsplash URLs — swap for the agency's own photography before deployment.
- No analytics, no cookie consent, no SEO meta beyond title — those are production concerns, not template concerns.

