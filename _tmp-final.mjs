import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmd = `curl -s -c /tmp/c2.txt -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"ctotester@test.com","password":"Test123456!"}' && \
  curl -s -b /tmp/c2.txt -X POST http://localhost:3000/api/ai/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"analisa file dashboard","mode":"ceo"}' \
    --max-time 30 | head -c 500`;
  c.exec(cmd, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => c.end()).on("data", d => process.stdout.write(d)).stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
