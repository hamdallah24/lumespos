import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmd = `echo "=== BEFORE ===" && stat -c "%Y" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts && curl -s -m 10 -c /tmp/qa_fix.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null && echo "=== CTO IMPLEMENT ===" && curl -s -m 300 -b /tmp/qa_fix.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi cari dan perbaiki bug di file execution-pipeline.ts. CTO harus baca file, analisis, lalu writeFile untuk perbaiki.","mode":"ceo"}' 2>&1 | grep -E "type.*meta|type.*done|writeFile|editFile|APPROVED|finalText" | head -10 && echo "" && echo "=== AFTER ===" && stat -c "%Y" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts && grep -n "entri\\|entry" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`;
  c.exec(cmd, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no output)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 360000 });
