import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // First check server health
  c.exec(`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health 2>&1 || echo "no health"; curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>&1 || echo "no root"`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
