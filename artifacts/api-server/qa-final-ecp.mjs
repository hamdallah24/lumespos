import { Client } from "ssh2";

const cmd = `
echo "=== LOGIN ==="
curl -s -m 10 -c /tmp/qa_final2_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}'
echo ""
echo "=== CREATE MISSION ==="
curl -s -m 15 -b /tmp/qa_final2_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d '{"title":"Final ECP-Scale: AI Module Architecture + CEO approval","objective":"Lakukan analisis arsitektur pada folder src/ai/ dan src/intelligence/. Identifikasi dependensi antar modul, bottleneck, pola error handling, dan kesenjangan implementasi. Output minimal 1000 karakter.","domains":["codebase"]}'
echo ""
echo "=== WAIT 180s ==="
for i in $(seq 1 36); do sleep 5; echo "  +5s ($((i*5))s)..."; done
echo "=== FETCH RESULT ==="
r=$(psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result), completed_at FROM ai_missions ORDER BY id DESC LIMIT 1;")
echo "ROW:$r"
id=$(echo "$r" | cut -d'|' -f1)
st=$(echo "$r" | cut -d'|' -f2)
rl=$(echo "$r" | cut -d'|' -f3)
ca=$(echo "$r" | cut -d'|' -f4)
echo "MISSION_ID=$id STATUS=$st RESULT_LEN=$rl COMPLETED_AT=$ca"
if [ "$st" = "COMPLETED" ] && [ "$rl" -ge 1000 ]; then
  echo "=== PASS: Output >= 1000 chars ==="
elif [ "$st" = "COMPLETED" ]; then
  echo "=== MINOR: Output < 1000 chars ($rl) ==="
else
  echo "=== FAIL: status=$st len=$rl ==="
fi
echo ""
echo "=== LAST 5 MISSIONS ==="
psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result) as len, completed_at FROM ai_missions ORDER BY id DESC LIMIT 5;"
echo ""
echo "=== CEO APPROVAL TRACE ==="
grep -n "CEO review result" /home/ubuntu/.pm2/logs/pos-api-out.log | tail -3
echo ""
echo "=== DATA STORE VERIFICATION ==="
grep -c "DATA FILE" /home/ubuntu/.pm2/logs/pos-api-out.log
echo "=== ERROR COUNTS ==="
echo "searchRepoFiles errors: $(grep -c 'searchRepoFiles error' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
echo "Output too short retries: $(grep -c 'Output too short' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
`;

const c = new Client();
c.on("ready", () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.error("EXEC ERROR:", e.message); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error("SSH ERROR:", e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 300000 });
