import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== MISSIONS ==="; curl -s -m 10 -b /tmp/qa_fix_cookie.txt 'http://localhost:3000/api/ai/missions/active' 2>&1; echo ""; echo "=== HISTORY ==="; curl -s -m 10 -b /tmp/qa_fix_cookie.txt 'http://localhost:3000/api/ai/history?mode=ceo' 2>&1 | head -c 4000`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
