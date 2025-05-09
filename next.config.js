// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone', // Enable standalone output for optimized Docker builds
    env: {
      // This makes VAPI_API_KEY (set by Cloud Run from secrets at runtime)
      // available to your client-side JavaScript bundle via process.env.VAPI_API_KEY.
      VAPI_API_KEY: process.env.VAPI_API_KEY,
    },
  };
  
  module.exports = nextConfig;