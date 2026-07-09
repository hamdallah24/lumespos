import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`curl -s -m 5 -o /dev/null -w '%{http_code}' http://localhost:3000/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"test@test.com","password":"test"}' 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log("HTTP status: " + (o || "no response")); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
