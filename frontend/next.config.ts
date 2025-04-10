/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    // Optimize all images, including remote ones
    domains: [],
    // Add any remote hostnames if needed
    remotePatterns: [
      {
        hostname: 'lh3.googleusercontent.com',
      },
      {
        hostname: 'cdn.sanity.io',
      },
      {
        hostname: 'res.cloudinary.com',
      },
      {
        hostname: 'ipfs.io', // IPFS gateway
      },
      {
        hostname: 'cyan-certain-crane-60.mypinata.cloud', // Pinata IPFS gateway
      },
      {
        hostname: 'gateway.pinata.cloud', // Pinata IPFS gateway (generic)
      },
    ],
    // Disable unoptimized images
    unoptimized: false,
    // Increase image format options
    formats: ['image/webp']
  },
};

module.exports = nextConfig;
