import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`cd /home/ubuntu/lumespos/artifacts/api-server && node -r dotenv/config -e "const{pool}=require('@workspace/db');pool.query('SELECT id,email,role FROM users ORDER BY id LIMIT 10').then(r=>console.log(JSON.stringify(r.rows,null,2))).catch(e=>console.log('ERR:',e.message))" 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
