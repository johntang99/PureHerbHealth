/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * assetPrefix makes all /_next/static/chunks/* references absolute (pointing to
   * this server's own URL).  When clinic sites like tcm-network.local:3003 proxy
   * the shop HTML, the browser fetches JS chunks directly from pureherbhealth's URL
   * instead of trying to load them from the clinic's host — preventing ChunkLoadErrors.
   *
   * Dev:  NEXT_PUBLIC_APP_URL=http://localhost:3005  (already set in .env.local)
   * Prod: NEXT_PUBLIC_APP_URL=https://pureherbhealth.com
   */
  assetPrefix: process.env.NEXT_PUBLIC_APP_URL || '',

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
