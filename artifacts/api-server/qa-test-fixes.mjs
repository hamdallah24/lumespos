import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== LOGIN ==="; curl -s -m 10 -c /tmp/qa_fix_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' 2>&1; echo ""; echo "=== CREATE MISSION ==="; curl -s -m 10 -b /tmp/qa_fix_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d '{"title":"Test analisis fetchContext","objective":"Cari tahu bagaimana fetchContext mendapatkan konteks file dari CKO","domains":["codebase"]}' 2>&1; echo ""; echo "=== WAIT 45s ==="; sleep 45; echo "=== CHECK MISSIONS ==="; curl -s -m 10 -b /tmp/qa_fix_cookie.txt 'http://localhost:3000/api/ai/missions/active' 2>&1 | head -c 3000; echo ""; echo "=== MISSION HISTORY ==="; curl -s -m 10 -b /tmp/qa_fix_cookie.txt 'http://localhost:3000/api/ai/history?mode=ceo' 2>&1 | head -c 3000`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
