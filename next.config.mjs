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
