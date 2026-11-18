import { getApiStatus } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const status = await getApiStatus();
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Boilerplate</h1>
      <p>Backend status: {status}</p>
    </main>
  );
}
