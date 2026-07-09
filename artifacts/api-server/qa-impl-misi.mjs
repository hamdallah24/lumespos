import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  const cmd = `
curl -s -m 10 -c /tmp/qc.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null
echo "=== FILE SEBELUM ==="
stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null
stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts 2>/dev/null
echo "=== TEST: BUAT MISI IMPLEMENTASI ==="
echo "Mengirim: buat misi analisis dan perbaiki file proposal-review.ts..."
curl -s -m 300 -b /tmp/qc.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi analisis dan perbaiki file proposal-review.ts. Ada bug critical di file itu. CTO harus readFile, analisis, lalu writeFile/editFile untuk memperbaiki.","mode":"ceo"}' 2>&1 | grep -E "type.*tool|type.*done|type.*status.*CTO|writeFile|editFile|execCommand|APPROVED|DB#|Selesai|finalText" | head -20
echo "=== FILE SESUDAH ==="
stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null
stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts 2>/dev/null
echo "=== SELESAI ==="`;
  c.exec(cmd, (err, stream) => {
    let out = "";
    if (err) { console.error("Error:", err.message); c.end(); return; }
    stream.on("data", d => out += d);
    stream.on("close", () => { console.log(out); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
