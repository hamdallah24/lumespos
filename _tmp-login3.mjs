import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`curl -s -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"owner@lumes.com","password":"owner123"}' -c /tmp/cookie.txt`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => {
      c.exec(`curl -s -b /tmp/cookie.txt "http://localhost:3000/api/ai/missions" 2>&1 | head -200`, (e2, s2) => {
        if (e2) { console.error(e2); c.end(); return; }
        s2.on("close", () => c.end()).on("data", d => process.stdout.write(d));
        s2.stderr.on("data", d => process.stderr.write(d));
      });
    }).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
