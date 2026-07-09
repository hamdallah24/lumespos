import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`docker ps 2>&1 | head -5; echo "---"; docker exec lumespos-db psql -U postgres -d lumespos -c "SELECT id, title, status, SUBSTRING(result,1,500) as result_preview, error, completed_at FROM missions ORDER BY id DESC LIMIT 3;" 2>&1`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no output)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
