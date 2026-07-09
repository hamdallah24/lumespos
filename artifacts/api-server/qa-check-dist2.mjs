import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`ls /home/ubuntu/lumespos/artifacts/api-server/dist/ 2>&1; echo "==="; ls /home/ubuntu/lumespos/artifacts/api-server/dist/ai/ 2>&1; echo "==="; ls /home/ubuntu/lumespos/artifacts/api-server/dist/ai/programs/ 2>&1; echo "==="; ls /home/ubuntu/lumespos/artifacts/api-server/dist/routes/ 2>&1`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no output)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
