import Orb from "@/components/orb";

export default function Home() {
  return (
    <main 
      className="flex items-center justify-center min-h-screen"
      style={{ 
        background: 'linear-gradient(180deg, #141316 0%, #B685FF 100%)'
      }}
    >
      <Orb />
    </main>
  );
}