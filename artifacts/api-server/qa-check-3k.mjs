import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`ss -tlnp | grep 3000; echo "==="; curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>&1; echo ""; curl -s -m 3 -o /dev/null -w '%{http_code}' http://[::1]:3000/ 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
