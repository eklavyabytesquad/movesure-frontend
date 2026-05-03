import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const BACKEND = 'http://xltfp8ewyj0f7a2qro7ihwed.46.202.162.119.sslip.io';

const nextConfig: NextConfig = {
  // Declare Turbopack config so Next.js 16 doesn't error when next-pwa
  // injects its webpack plugin alongside Turbopack.
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: `${BACKEND}/v1/:path*`,
      },
    ];
  },
};

export default withPWA({
  dest:                       "public",
  cacheOnFrontEndNav:         true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline:             true,
  // Disable SW in development so hot-reload works normally
  disable:                    process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    // App-shell: cache all static assets with Cache First
    // API calls: handled by the application (apiFetch + IndexedDB)
    runtimeCaching: [
      {
        // Static assets — serve instantly from cache, update in background
        urlPattern: /\.(?:js|css|woff2?|png|svg|ico|webp)$/i,
        handler:    "CacheFirst",
        options: {
          cacheName:  "static-assets",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        // Next.js page data (_next/data) — stale-while-revalidate
        urlPattern: /^\/_next\/data\//,
        handler:    "StaleWhileRevalidate",
        options:    { cacheName: "next-page-data" },
      },
      {
        // Google Fonts stylesheet — cache aggressively
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler:    "CacheFirst",
        options: {
          cacheName:  "google-fonts-stylesheets",
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // Google Fonts files
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler:    "CacheFirst",
        options: {
          cacheName:  "google-fonts-webfonts",
          expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
    ],
  },
})(nextConfig);
