/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: 'standalone',
  
  // Bundle optimization
  experimental: {
    // Optimize package imports for better tree shaking
    optimizePackageImports: ['framer-motion', 'react-icons', 'date-fns'],
  },
  
  // External packages configuration
  serverExternalPackages: [],
  
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
  
  // Help prevent hydration issues
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
