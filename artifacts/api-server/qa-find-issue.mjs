import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Cari unused import atau typo di file2 kecil
  const cmd = `echo "=== Cari issue nyata ==="
# Cek file execution-pipeline.ts - cari unused atau typo
head -30 /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts
echo "---"
# Cek verification-engine.ts - cari typo atau issue
head -30 /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/verification-engine.ts
echo "---"
# Cek file kecil lainnya
grep -rn "TODO\\|FIXME\\|HACK\\|XXX" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/ 2>/dev/null | head -10`;
  c.exec(cmd, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
