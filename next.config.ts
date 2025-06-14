
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hfjpzzlwgpgyqzpsokcc.supabase.co',
        port: '',
        pathname: '/**', 
      },
    ],
  },
  // Removed serverActions block to address Vercel build warning
  // Default bodySizeLimit is 1MB, can be re-added if specific actions need more.
};

export default nextConfig;
