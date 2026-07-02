export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

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
