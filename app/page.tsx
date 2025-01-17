import Orb from "@/components/orb";

export default function Home() {
  return (
    <main className="flex items-center justify-center" style={{ background: 'none', minHeight: '100vh' }}>
      <div style={{ width: '100%', height: '100%', background: 'none' }}>
        <Orb />
      </div>
    </main>
  );
}