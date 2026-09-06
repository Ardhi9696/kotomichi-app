import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Keep recently-viewed dynamic pages warm in the client router cache
      // so back/forward and repeat navigations render instantly.
      dynamic: 30,
    },
  },
};

export default withNextIntl(nextConfig);