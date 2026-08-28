/** Προεπιλεγμένες εικόνες του hero slideshow της αρχικής (self-hosted στο
 *  /public/hero). Ο admin μπορεί να τις αντικαταστήσει από τις Ρυθμίσεις
 *  (settings.homeImages.hero) — βλ. components/home/resolve-images.ts. */
export const DEFAULT_HERO_IMAGES: readonly { src: string; alt: string }[] = [
  { src: '/hero/hero-1.jpg', alt: 'Χαλκίδα, ηλιοβασίλεμα' },
  { src: '/hero/hero-2.jpg', alt: 'Γέφυρα και φυσικό τοπίο' },
  { src: '/hero/hero-3.jpg', alt: 'Παραλία και θάλασσα' },
];
