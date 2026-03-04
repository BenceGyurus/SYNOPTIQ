import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Enables standalone output for Docker
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://backend:8000/api/v1/:path*', // Proxy to Backend
      },
    ]
  },
};

export default nextConfig;
