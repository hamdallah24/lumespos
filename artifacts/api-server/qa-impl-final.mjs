import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  const cmds = `
curl -s -m 10 -c /tmp/qd.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null
echo "=== BEFORE ==="
stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null
echo ""
echo "=== TEST: CTO IMPLEMENT ==="
echo "Mengirim: buat misi perbaiki file proposal-review.ts..."
curl -s -m 300 -b /tmp/qd.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi perbaiki file proposal-review.ts. CTO harus baca, analisis, lalu writeFile untuk perbaiki kode.","mode":"ceo"}' 2>&1 | grep -E "type.*tool|type.*done|type.*meta|type.*status.*CTO|writeFile|editFile|execCommand|APPROVED|DB#|implement|fix|perbaiki|finalText" | head -30
echo ""
echo "=== AFTER ==="
stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null
echo "=== DONE ==="`;
  c.exec(cmds, (err, stream) => {
    let o = "";
    if (err) { console.error("Error:", err.message); c.end(); return; }
    stream.on("data", d => o += d);
    stream.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
