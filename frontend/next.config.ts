/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: 'standalone',
  
  // Webpack configuration to handle optional dependencies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    // Ignore missing optional dependencies that are not needed in browser
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.fallback) config.resolve.fallback = {};
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Ignore specific module warnings for optional dependencies
    if (!config.ignoreWarnings) config.ignoreWarnings = [];
    config.ignoreWarnings.push(
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      /Module not found: Can't resolve '@react-native-async-storage\/async-storage'/,
      /Module not found: Can't resolve 'pino-pretty'/
    );

    return config;
  },
  
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
      {
        hostname: 'www.gravatar.com',
      },
      {
        hostname: 'api.dicebear.com',
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
