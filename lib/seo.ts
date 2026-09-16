export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** JSON-LD ready to drop into a `<script>` tag.
 *
 *  `JSON.stringify` escapes quotes but NOT `<`, so a tour or article title
 *  containing `</script>` would close the tag and let whatever follows run as
 *  markup. The data here is written by the office (and part of it was imported
 *  from the old site), so this is not hypothetical enough to leave alone.
 *  Escaping `<`, `>` and `&` as unicode keeps the JSON identical to a parser
 *  while making tag breakout impossible. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/** WebSite structured data for the home page. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sergiani Travel',
    url: SITE_URL,
    inLanguage: 'el',
  };
}

/** ItemList (carousel) of the featured tours shown on the home page. */
export function tourItemListJsonLd(tours: { slug: string; title: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: tours.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/tour/${t.slug}`,
      name: t.title,
    })),
  };
}

/** Product structured data for a tour page.
 *
 *  Η Google δίνει «Product snippets» (τιμή, διαθεσιμότητα κάτω από τον τίτλο)
 *  μόνο σε σελίδες με τύπο Product· το παλιό WooCommerce site τα είχε και
 *  έπαιρνε από εκεί μεγάλο μέρος των clicks. Το Offer μπαίνει μόνο όταν
 *  υπάρχει τιμή — Product χωρίς offers/review/rating απλώς δεν δίνει snippet,
 *  δεν είναι σφάλμα. */
export function productJsonLd(input: {
  name: string;
  description?: string;
  url: string;
  image?: string | null;
  price?: number | null;
  currency?: string;
  inStock?: boolean;
  category?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.category ? { category: input.category } : {}),
    brand: { '@type': 'Brand', name: 'Sergiani Travel' },
    ...(input.price != null
      ? {
          offers: {
            '@type': 'Offer',
            price: input.price,
            priceCurrency: input.currency ?? 'EUR',
            availability: input.inStock === false ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
            url: input.url,
            seller: { '@type': 'TravelAgency', name: 'Sergiani Travel', url: SITE_URL },
          },
        }
      : {}),
  };
}

/** Organization structured data for the site (TravelAgency). */
export function orgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'Sergiani Travel',
    url: SITE_URL,
    foundingDate: '1995',
    telephone: '+302105712451',
    email: 'info@sergianitravel.gr',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Π. Μελά 45',
      addressLocality: 'Περιστέρι',
      postalCode: '121 31',
      addressRegion: 'Αττική',
      addressCountry: 'GR',
    },
    areaServed: 'GR',
  };
}
