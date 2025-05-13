// next-tailwind-vapi-starter/app/page.tsx
"use client";

import Orb from "@/components/orb"; 

export default function Home() {
  const pageBackgroundColor = "hsl(240 10% 3.9%)"; // Or "#0A0A0D"

  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center p-0 m-0" // Removed bg-transparent class if it existed
      style={{ 
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: pageBackgroundColor // <<< SET TO YOUR WEBSITE'S BACKGROUND COLOR
      }}
    >
      <div 
        style={{ 
          width: "100%", 
          height: "100%", 
          position: "relative", 
          background: pageBackgroundColor // <<< ALSO SET HERE FOR CONSISTENCY
        }}
      >
        <Orb />
      </div>
    </main>
  );
}