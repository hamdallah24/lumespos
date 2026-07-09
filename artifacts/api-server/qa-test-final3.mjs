import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== LOGIN ==="; curl -s -m 10 -c /tmp/qa_fix3_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' 2>&1; echo ""; echo "=== CREATE MISSION ==="; curl -s -m 10 -b /tmp/qa_fix3_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d '{"title":"Test final fix format","objective":"Cari tahu bagaimana cara readFile bekerja dan apakah ada bug potensial","domains":["codebase"]}' 2>&1; echo ""; echo "=== WAIT 70s ==="; for i in $(seq 1 14); do sleep 5; echo "  +5s..."; done; echo "=== CHECK RESULT ==="; psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -c "SELECT id, status, SUBSTRING(result,1,1000) as result_start FROM ai_missions ORDER BY id DESC LIMIT 1;" 2>&1; echo ""; echo "=== CEO HISTORY ==="; curl -s -m 10 -b /tmp/qa_fix3_cookie.txt 'http://localhost:3000/api/ai/history?mode=ceo' 2>&1 | python3 -c "
import sys,json
d=json.load(sys.stdin)
for m in d.get('messages',[]):
    c = m.get('content','')
    if 'Test final' in c or 'Misi #41' in c or 'Misi #42' in c:
        print(f'[{m[\"role\"]}] {c[:500]}')
" 2>&1`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
