/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    // Optimize all images, including remote ones
    domains: [],
    // Add any remote hostnames if needed
    remotePatterns: [
      'lh3.googleusercontent.com',
      'cdn.sanity.io',
      'res.cloudinary.com'
    ],
    // Disable unoptimized images
    unoptimized: false,
    // Increase image format options
    formats: ['image/webp']
  },
};

module.exports = nextConfig;
