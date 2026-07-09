import { Client } from "ssh2";

const cmd = `
echo "=== LOGIN ==="
curl -s -m 10 -c /tmp/qa_final_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}'
echo ""
echo "=== CREATE MISSION ==="
curl -s -m 10 -b /tmp/qa_final_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d '{"title":"Final QA: CTO output quality validation v10","objective":"Analisis kode pada file src/ai/tools/tool-adapter.ts, identifikasi potensi masalah keamanan, error handling, dan berikan rekomendasi perbaikan. Berikan analisis mendalam minimal 500 karakter.","domains":["codebase"]}'
echo ""
echo "=== WAIT 120s ==="
for i in $(seq 1 24); do sleep 5; echo "  +5s..."; done
echo "=== FETCH RESULT ==="
r=$(psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result), completed_at FROM ai_missions ORDER BY id DESC LIMIT 1;")
echo "ROW:$r"
id=$(echo "$r" | cut -d'|' -f1)
st=$(echo "$r" | cut -d'|' -f2)
rl=$(echo "$r" | cut -d'|' -f3)
ca=$(echo "$r" | cut -d'|' -f4)
echo "MISSION_ID=$id STATUS=$st RESULT_LEN=$rl COMPLETED_AT=$ca"
if [ "$st" = "COMPLETED" ] && [ "$rl" -ge 500 ]; then
  echo "=== PASS: Output >= 500 chars ==="
  txt=$(psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT result FROM ai_missions WHERE id='$id';")
  txtlen=$(echo "$txt" | wc -c)
  echo "FULL TEXT LEN: $txtlen"
  has_root=$(echo "$txt" | grep -c "## Root Cause")
  has_evidence=$(echo "$txt" | grep -c "## Verified Evidence")
  has_rekom=$(echo "$txt" | grep -c "## Rekomendasi")
  has_conf=$(echo "$txt" | grep -c "## Confidence")
  echo "FormatCheck: RootCause=$has_root Evidence=$has_evidence Rekomendasi=$has_rekom Confidence=$has_conf"
else
  echo "=== FAIL: status=$st len=$rl ==="
fi
echo ""
echo "=== LOG ERROR COUNTS ==="
echo "searchRepoFiles errors: $(grep -c 'searchRepoFiles error' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
echo "fetchGitHubDir errors: $(grep -c 'fetchGitHubDir error' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
echo "fetchContext errors: $(grep -c 'fetchContext error' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
echo "Output too short retries: $(grep -c 'Output too short' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
echo "CTO rejected (short): $(grep -c 'CTO output terlalu pendek' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
echo ""
echo "=== LAST 5 MISSIONS ==="
psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result) as len, completed_at FROM ai_missions ORDER BY id DESC LIMIT 5;"
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
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 210000 });
