/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.99'],
  // Τα ανεβάσματα εικόνων περνούν μέσα από Server Action· το default όριο του
  // Next είναι 1MB και έκοβε σιωπηλά κάθε φωτογραφία κινητού.
  experimental: {
    serverActions: { bodySizeLimit: '15mb' },
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
