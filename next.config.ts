import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    domains: ['techneth-bucket.s3.ap-south-1.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // CORS / Origin allow-listing is handled in middleware.ts (see lib/cors.ts).
  // Do not re-add a wildcard Access-Control-Allow-Origin here.
};

export default nextConfig;
