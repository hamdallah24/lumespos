import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`# Check WHAT is listening
echo "=== fuser port 3000 ==="; fuser 3000/tcp 2>&1 || echo "fuser not found"
echo "=== whom port 3000 ==="; ss -tlnp '( sport = :3000 )' 2>&1
echo "=== All node processes ==="; ps aux | grep node | head -5
echo "=== PM2 monit ==="; pm2 jlist 2>&1 | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8');const j=JSON.parse(d);j.forEach(p=>console.log(p.name,p.pm_id,p.status,p.monit&&p.monit.cpu))" 2>&1 || echo "pm2 jlist failed"`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
