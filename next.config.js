// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone', // Enable standalone output for optimized Docker builds
    env: {
      // This makes SERVER_VAPI_PUBLIC_KEY (set by Cloud Run from secrets at runtime)
      // available to your client-side JavaScript bundle as process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY.
      NEXT_PUBLIC_VAPI_PUBLIC_KEY: process.env.SERVER_VAPI_PUBLIC_KEY,
      // This makes SERVER_VAPI_ASSISTANT_ID (set by Cloud Run from secrets at runtime)
      // available to your client-side JavaScript bundle as process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID.
      NEXT_PUBLIC_VAPI_ASSISTANT_ID: process.env.SERVER_VAPI_ASSISTANT_ID,
    },
  };
  
  module.exports = nextConfig;