import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`pm2 env 0 2>&1 | grep -i -E "DB|DATABASE|POSTGRES|PG|NEON|SUPABASE|TEMBO|SQL"`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no match)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
