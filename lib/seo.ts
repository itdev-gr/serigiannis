export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

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
