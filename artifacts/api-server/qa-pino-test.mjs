import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Test pino in production mode
  c.exec(`cd /home/ubuntu/lumespos/artifacts/api-server && NODE_ENV=production node -e "const p=require('pino');const l=p({level:'info'});l.info({x:1},'hello');console.log('DONE')" 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
