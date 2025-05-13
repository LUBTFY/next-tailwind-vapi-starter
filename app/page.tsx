// app/page.tsx (within next-tailwind-vapi-starter project)
"use client";

import Orb from "@/components/orb"; 

export default function Home() {
  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center p-0 m-0 bg-transparent" 
      style={{ 
        width: '100vw',  // Use viewport width of the iframe
        height: '100vh', // Use viewport height of the iframe
        overflow: 'hidden', // Prevent scrollbars within the iframe page itself
        background: 'transparent' // Explicitly ensure main background is transparent
      }}
    >
      {/* This div will expand to the size of the <main> element (iframe size). 
          The Orb component will then fill this div. */}
      <div style={{ width: "100%", height: "100%", position: "relative", background: 'transparent' }}>
        <Orb />
      </div>
    </main>
  );
}