/** Homepage category cards — clean landscape photos (no logos or promo text). */
export const CATEGORY_COVER_IMAGES: Record<string, { src: string; alt: string }> = {
  monoimeres: {
    src: '/categories/monoimeres.jpg',
    alt: 'Νησιωτικό λιμάνι με μπλε θάλασσα, μονοήμερη εκδρομή',
  },
  polyimeres: {
    src: '/categories/polyimeres.jpg',
    alt: 'Καταρράκτες Ποζάρ, πολυήμερη εκδρομή',
  },
  'thalassia-mpania': {
    src: '/categories/thalassia-mpania.jpg',
    alt: 'Παραλία με γαλάζια θάλασσα, θαλάσσια μπάνια',
  },
  kroyazieres: {
    src: '/categories/kroyazieres.jpg',
    alt: 'Παραλία και λιμάνι νησιού, κρουαζιέρα',
  },
  pezopories: {
    src: '/categories/pezopories.jpg',
    alt: 'Ομάδα πεζοπορίας σε ορεινό μονοπάτι',
  },
  eksoterikou: {
    src: '/categories/eksoterikou.jpg',
    alt: 'Αερόστατα Καππαδοκίας, εκδρομή εξωτερικού',
  },
};

export function categoryCoverImage(slug: string): { src: string; alt: string } | null {
  return CATEGORY_COVER_IMAGES[slug] ?? null;
}
