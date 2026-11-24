import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components / Partial Prefetching are off: the Cloudflare Workers runtime
  // (via OpenNext) doesn't support them yet — pages hang. StockLume renders its
  // data on the client, so nothing here depends on them.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
