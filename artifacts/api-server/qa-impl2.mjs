import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  // Check files first, then run quick CTO test
  const cmd = `echo "=== FILE SEBELUM ===" && stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null && curl -s -m 10 -c /tmp/qb.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null && echo "=== CTO TEST (90s) ===" && curl -s -m 90 -b /tmp/qb.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"Analisis singkat file proposal-review.ts lalu perbaiki jika ada masalah. Gunakan writeFile jika perlu.","mode":"cto"}' 2>&1 | grep -E "type.*tool|type.*done|writeFile|editFile|execCommand|APPROVED|CYCLE|Ringkasan" | head -15`;
  c.exec(cmd, (err, stream) => {
    let out = "";
    if (err) { console.error("Error:", err.message); c.end(); return; }
    stream.on("data", d => out += d);
    stream.on("close", () => {
      console.log(out || "(no output)");
      // Check file after test
      c.exec(`stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null`, (e2, s2) => {
        let o2 = "";
        s2.on("data", d => o2 += d);
        s2.on("close", () => { console.log("=== FILE SESUDAH ===", o2); c.end(); });
      });
    });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 180000 });
