import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep -c "Output too short" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log("matches: " + o.trim()); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
