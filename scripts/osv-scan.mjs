import { readFileSync } from "node:fs";
const text = readFileSync(process.argv[2] ?? "bun.lock", "utf8");
const pkgSection = text.slice(text.indexOf('"packages"'));
const set = new Set();
for (const m of pkgSection.matchAll(/:\s*\["((?:@[^/"]+\/)?[^@"]+)@([^"]+)"/g)) {
  if (!m[2].startsWith("workspace:")) set.add(`${m[1]}@@${m[2]}`);
}
const pkgs = [...set].map(s => s.split("@@"));
let vulns = [];
for (let i = 0; i < pkgs.length; i += 500) {
  const chunk = pkgs.slice(i, i + 500);
  const res = await fetch("https://api.osv.dev/v1/querybatch", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ queries: chunk.map(([name, version]) => ({ package: { name, ecosystem: "npm" }, version })) }) });
  const { results } = await res.json();
  results.forEach((r, j) => r.vulns?.length && vulns.push(`${chunk[j][0]}@${chunk[j][1]}: ${r.vulns.map(v => v.id).join(",")}`));
}
console.log(`Scanned ${pkgs.length} unique packages from lockfile`);
console.log(vulns.length ? vulns.join("\n") : "No known vulnerabilities");
if (vulns.length) process.exit(1);
