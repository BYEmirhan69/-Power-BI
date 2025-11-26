import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Güvenlik Header'ları
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Image Domain Yapılandırması
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // Performans optimizasyonları
  poweredByHeader: false,
  compress: true,

  // Experimental features
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-icons"],
  },
};

export default nextConfig;
