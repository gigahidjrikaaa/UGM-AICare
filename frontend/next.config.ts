/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: 'standalone',
  
  // Development optimizations
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Turbopack configuration (Next.js 16 default bundler)
  turbopack: {
    // Turbopack handles resolve.fallback automatically for browser builds
    // Web3 externals are handled via serverExternalPackages below
  },
  
  // Legacy webpack config for backward compatibility (if needed with --webpack flag)
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
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      path: false,
      os: false,
    };

    // Externalize problematic dependencies for Web3
    config.externals = config.externals || [];
    config.externals.push({
      'pino-pretty': 'pino-pretty',
      '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage',
      'utf-8-validate': 'utf-8-validate',
      'bufferutil': 'bufferutil',
      'encoding': 'encoding',
    });

    // Ignore specific module warnings for optional dependencies
    if (!config.ignoreWarnings) config.ignoreWarnings = [];
    config.ignoreWarnings.push(
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      /Module not found: Can't resolve '@react-native-async-storage\/async-storage'/,
      /Module not found: Can't resolve 'pino-pretty'/,
      /Module not found: Can't resolve 'utf-8-validate'/,
      /Module not found: Can't resolve 'bufferutil'/,
      /Module not found: Can't resolve 'encoding'/,
    );

    // Next.js 16 fixes the webpack minification bug - no workaround needed!
    // Removed: config.optimization.minimize = false

    return config;
  },
  
  // Bundle optimization
  experimental: {
    // Optimize package imports for better tree shaking
    optimizePackageImports: ['framer-motion', 'react-icons', 'date-fns', 'lucide-react', 'recharts'],
    // Reduce memory usage
    workerThreads: false,
    // Enable faster refresh
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  
  // External packages configuration for server (both webpack and Turbopack)
  serverExternalPackages: [
    'pino-pretty',
    '@react-native-async-storage/async-storage',
    'utf-8-validate',
    'bufferutil',
    'encoding',
  ],
  
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
  
  // Production-only optimizations (skip in dev)
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
  }),
  
  // Development-only optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Disable static optimization during dev for faster builds
    staticPageGenerationTimeout: 1000,
  }),
};

module.exports = nextConfig;
