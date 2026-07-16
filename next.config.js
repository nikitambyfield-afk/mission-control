/** @type {import('next').NextConfig} */
const nextConfig = {
  // No more static export — Render runs as a normal Node server with SSR + API routes
  images: { unoptimized: true },
};
module.exports = nextConfig;
