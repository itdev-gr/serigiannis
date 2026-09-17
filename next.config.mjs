import { siteRedirects } from './lib/legacy-redirects.mjs';

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
  // Το εσωτερικό redirect του Next για το τελικό «/» έτρεχε ΠΡΙΝ τους δικούς
  // μας κανόνες και έβαζε ένα έξτρα βήμα σε κάθε παλιά διεύθυνση του WordPress
  // site (όλες είχαν τελικό «/»). Το κόβουμε και το κάνουμε μόνοι μας, στη
  // σωστή θέση — δες siteRedirects().
  skipTrailingSlashRedirect: true,
  // Όλα τα redirects (παλιές διευθύνσεις, τελικό «/», apex και vercel.app →
  // www) ζουν στο lib/legacy-redirects.mjs ώστε να ελέγχονται με tests. Η
  // σειρά τους είναι ό,τι κάνει κάθε παλιό URL να φτάνει με ΕΝΑ 308 στο τελικό.
  async redirects() {
    return siteRedirects();
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
