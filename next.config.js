/** @type {import('next').NextConfig} */
const nextConfig = {
  // Full Next.js server (SSR + /api Route Handlers), deployed on Vercel.
  // (Was `output: "export"` for the old static/Tauri build.)
  images: {
    unoptimized: true,
  },
  // Bundle the in-repo store data (projects/docs — the self-documentation
  // project) into the /api serverless functions so they can read it at runtime.
  outputFileTracingIncludes: {
    "/api/**/*": ["./projects/**/*"],
  },
  // Suppress file watcher errors in dev mode
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
