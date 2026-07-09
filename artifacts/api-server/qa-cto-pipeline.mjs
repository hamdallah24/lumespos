import { Client } from "ssh2";

const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";

const c = new Client();
c.on("ready", () => {
  const cmd = `
curl -s -m 10 -c /tmp/qa_cto2.txt -X POST 'http://localhost:3000/api/auth/login' \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null
echo "=== CTO 3-CYCLE PIPELINE TEST ==="
echo "Starting CTO analysis - this takes 2-3 minutes..."
curl -s -m 300 -b /tmp/qa_cto2.txt -X POST 'http://localhost:3000/api/ai/chat' \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Analisis singkat file execution-pipeline.ts, cari potensi masalah","mode":"cto"}' 2>&1 | grep -E "type.*status|type.*meta|type.*done|type.*tool|CEng|Pipeline|status.*CTO" | head -30
echo ""
echo "=== DONE ==="`;
  c.exec(cmd, (err, stream) => {
    let out = "";
    if (err) { console.error("Exec error:", err.message); c.end(); return; }
    stream.on("data", d => out += d);
    stream.on("close", () => { console.log(out); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
