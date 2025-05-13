// next-tailwind-vapi-starter/app/page.tsx
"use client";

import Orb from "@/components/orb";

export default function Home() {
  return (
    // The main element no longer needs to be full screen.
    // It will essentially shrink to its content.
    // We can remove explicit width/height styles here if Orb defines its own.
    <main 
      className="flex items-center justify-center" // Center the direct child
      style={{ 
        width: '100%', // Take width of iframe
        height: '100%', // Take height of iframe
        background: 'transparent', // Important for embedding
        overflow: 'hidden'
      }}
    >
      {/* The Orb component itself will define its rendered size.
          This div will also take 100% of the iframe. */}
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <Orb />
      </div>
    </main>
  );
}