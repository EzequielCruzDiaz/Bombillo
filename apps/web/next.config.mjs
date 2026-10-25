/** @type {import('next').NextConfig} */
const nextConfig = {
  // Los paquetes del monorepo se publican como TypeScript fuente.
  transpilePackages: ["@bombillo/ui", "@bombillo/domain", "@bombillo/data"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
