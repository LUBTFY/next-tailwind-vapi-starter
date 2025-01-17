import Orb from "@/components/orb";

export default function Home() {
  return (
    <main 
      className="flex items-center justify-center min-h-screen"
      style={{ 
        background: 'linear-gradient(180deg, rgb(38, 38, 38) 0%, rgb(76, 29, 149) 100%)'
      }}
    >
      <Orb />
    </main>
  );
}