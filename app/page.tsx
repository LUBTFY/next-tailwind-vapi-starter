// app/page.tsx

"use client";

import Orb from "@/components/orb";

export default function Home() {
  // The Vapi setup (publicKey, assistantId) is handled inside hooks/use-vapi.ts
  // by reading process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY and process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID

  // Optional: For debugging in the browser console to verify env vars are accessible to the page
  // console.log("Page: NEXT_PUBLIC_VAPI_PUBLIC_KEY:", process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
  // console.log("Page: NEXT_PUBLIC_VAPI_ASSISTANT_ID:", process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-0 m-0 bg-black">
      {/* Style the container for the Orb as needed */}
      <div style={{ width: "300px", height: "300px" }}> {/* Example size */}
        <Orb />
      </div>
    </main>
  );
}