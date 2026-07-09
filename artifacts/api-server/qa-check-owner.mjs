import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`PGPASSWORD='npg_4c6itCXQDNSW' psql -h ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech -U neondb_owner -d neondb -c "SELECT id,email,role FROM users ORDER BY id LIMIT 10;" 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
