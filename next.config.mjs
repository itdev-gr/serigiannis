import { legacyRedirects } from './lib/legacy-redirects.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.99'],
  // Τα ανεβάσματα εικόνων περνούν μέσα από Server Action· το default όριο του
  // Next είναι 1MB και έκοβε σιωπηλά κάθε φωτογραφία κινητού.
  experimental: {
    serverActions: { bodySizeLimit: '15mb' },
  },
  // Το Viva payment source (WC-0001) κληρονομήθηκε από το παλιό WooCommerce
  // site· όσο τα success/failure URLs του δείχνουν ακόμα στα /wc-api/ paths,
  // η επιστροφή από την πληρωμή πρέπει να καταλήγει στο δικό μας endpoint.
  async rewrites() {
    return [{ source: '/wc-api/:path*', destination: '/api/payments/return' }];
  },
  // Το serigiannis.vercel.app είναι alias του ίδιου deployment· χωρίς redirect
  // ο ιδιοκτήτης κατέληγε να δουλεύει το admin από εκεί αντί για το κανονικό
  // domain. Τα /api/* μένουν απ' έξω: τα Vercel crons και το Viva webhook
  // χτυπούν το deployment URL και δεν ακολουθούν redirects.
  //
  // Οι διευθύνσεις του παλιού WordPress site (κατηγορίες, άρθρα, taxonomies)
  // ανακατευθύνονται μόνιμα στις νέες — δες lib/legacy-redirects.mjs. Οι παλιές
  // εκδρομές /tour/<slug> λύνονται μέσα στη σελίδα εκδρομής (lib/tour-aliases.ts).
  async redirects() {
    return [
      {
        source: '/:path((?!api/).*)',
        has: [{ type: 'host', value: 'serigiannis.vercel.app' }],
        destination: 'https://www.sergianitravel.gr/:path',
        permanent: true,
      },
      ...legacyRedirects(),
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
