# sergianitravel.gr — content crawl (2026-07-02)

Full crawl of the live production site, used to source real content for the Home 1
rebuild (and later inner-page/SEO plans). Site is **WordPress + WooCommerce**; tours are
`/tour/<slug>/` products; categories under `/ekdromes-sergiani-travel/<cat>/`.

## Navigation (live)
- Αρχική → `/`
- Εκδρομές (dropdown): Μονοήμερες, Πολυήμερες, Θαλάσσια Μπάνια, Κρουαζιέρες, Πεζοπορίες, Ιστορικό Εκδρομών
- Κρουαζιέρες → `/ekdromes-sergiani-travel/kroyazieres/`
- Ενοικιάσεις Πούλμαν (dropdown): ΤΙΜΟΚΑΤΑΛΟΓΟΣ, Bus Rentals, + city-tour products
- Επικοινωνία → `/epikoinonia/`
- ΝΕΑ → `/nea/` (blog — 26 posts)

serigiani's current routes map cleanly (`/ekdromes`, `/ekdromes/[category]`, `/kroyazieres`,
`/enoikiaseis-poylman`, `/epikoinonia`, `/istoriko-ekdromon`, `/oroi`). A **ΝΕΑ/blog** section
exists on the live site but has no table in serigiani yet (deferred).

## Homepage sections (real copy)
1. **Hero H1:** «Μονοήμερες εκδρομές από Αθήνα – Sergiani Travel Ταξιδιωτικό Πρακτορείο». Sub: «Ψάχνεις μονοήμερες εκδρομές από Αθήνα, εκδρομές από Αθήνα για θάλασσα ή ενοικιάσεις πούλμαν; Το Sergiani Travel … οργανώνει κάθε εβδομάδα αποδράσεις από Αθήνα με πούλμαν για όλη την Ελλάδα.» No search form on the live home.
2. **Θαλάσσια Μπάνια** — cards: Ψάθα 10€ καθημερινά.
3. **Μονοήμερες** — cards: Ύδρα από 25€ (12/07/2026), Σαλαμίνα-Αίγινα-Αγκίστρι κρουαζιέρα από 20€.
4. **Πολυήμερες** — Σκύρος 240€ (21-23/7), Ριβιέρα Ιονίου 270€.
5. **Εξωτερικού** — Ισπανία 7ημ 1.085€, Πανόραμα Αλσατίας 1.189€, Βαρκελώνη 785€.
6. **Κρουαζιέρες** — Ύδρα-Πόρο-Αίγινα από 55€ καθημερινά.
7. **Γιατί να μας Εμπιστευτείτε:** Εμπειρία από το 1995 · Ασφάλεια & Αξιοπιστία · Μεγάλη Ποικιλία · Προσιτές Τιμές (verbatim copy in `components/home/content.ts` `about.trust`).
8. **Αριθμοί που Μιλούν:** labels Χρόνια Εμπειρίας / Εκδρομές τον Χρόνο / Ικανοποιημένοι Πελάτες / Προορισμοί (numeric values are JS counters — not in HTML; we keep 30+/500+/10.000+/50+).
9. **Testimonials:** Μαρία Κ. (Αθήνα), Γιώργος Π. (Περιστέρι), Ελένη Μ. (Ομόνοια), all ★★★★★ — verbatim in `data/site.ts`.

## Categories (6) + representative products
- **Μονοήμερες** (~350 items): Ύδρα, Τήνος 75€, Ναύπλιο, Λιχαδονήσια, Σπέτσες, Μονεμβασιά, Μετέωρα, Δελφοί, Αράχωβα/Παρνασσός, Σχολικές από 10€.
- **Πολυήμερες:** Σκύρος 240€, Ριβιέρα Ιονίου 270€, Πήλιο διήμερο, Χριστούγεννα Θεσσαλονίκη/Μπάνσκο.
- **Θαλάσσια Μπάνια:** Ψάθα 10€, Αθηναϊκή Ριβιέρα, Συκιά Κορινθίας 12€.
- **Κρουαζιέρες:** Ύδρα-Πόρο-Αίγινα από 55€ (ενήλικες 80€/παιδί 55€/κάτω 4 δωρεάν; Μαρίνα Δέλτα Καλλιθέας 7:45→19:40; μπουφέ + μουσική), Σαλαμίνα-Αίγινα-Αγκίστρι 20€, Σκιάθος-Κουκουναριές.
- **Εξωτερικού:** Ισπανία 1.085€, Βαρκελώνη 785€, Αλσατία 1.189€, Βουδαπέστη-Βιέννη, Καππαδοκία, Σικελία.
- **Πεζοπορίες:** thin — Μέθανα διήμερο, Υπόγεια Φωκίδα (mostly «Αναμένεται»).

## Contact / settings (verified — matches `seedSettings`)
- Address: Π. Μελά (Παύλου Μελά) 45, Περιστέρι 121 31 · Μετρό Αγίου Αντωνίου
- Phones: 210 571 2451, 210 821 2452; mobile 24ωρο 6976 811 825
- Email: info@sergianitravel.gr
- Socials: FB `/sergiani.travelgr/`, IG `@sergiani_travel`, YT `@sergianitravel`
- Payments: όλες οι κάρτες (online, χωρίς χρέωση), μετρητά στο γραφείο, κατάθεση Alpha `GR4301401330133002002027751` / EuroBank `GR6002602090000580201976974`, IRIS/VivaWallet.

## Terms (`/oroi-kai-proÿpotheseis/`)
Min **20 συμμετέχοντες** ή ακύρωση με πλήρη επιστροφή. Ακυρώσεις: μονοήμερες πλήρης επιστροφή έως 4 εργάσιμες πριν; πολυήμερες 100% στις 30 ημέρες / 50% στις 15.

## Conflicts / gaps (need owner input)
- **Opening hours** differ: contact 9:30–19:30 (Σάβ 10–14) vs footer/about 09:00–17:00 (Σάβ 09–14). Plan uses footer/settings version.
- **Founding year:** 1995 everywhere except bus page (1993). Plan uses 1995.
- **ΜΗΤΕ/ΓΕΜΗ/ΑΦΜ:** absent from all fetched pages (legally required for a GR agency — likely in an image). Not added.
- **Bus-rental full price matrix** is phone-only (not in HTML). Indicative ranges only: Αεροδρόμιο €55–250, Σούνιο €70–280, Ναύπλιο €150–700, Μετέωρα €480–1300.
- **Brand colors/fonts** not captured (text-only crawl).

## Site inventory sizes
- page-sitemap: 20 structural pages · post-sitemap: 26 blog posts · product-sitemap: ~185 `/tour/` products (2024-12 → 2026-04; many expired past tours kept for SEO).
