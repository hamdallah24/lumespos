import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`rm -f /home/ubuntu/lumespos/artifacts/api-server/ecosystem.config.cjs; pm2 delete pos-api; cd /home/ubuntu/lumespos/artifacts/api-server && pm2 start dist/index.mjs --name pos-api --interpreter-args="-r dotenv/config --enable-source-maps" && sleep 5 && ss -tln | grep 3000 || echo "NOT YET"`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
