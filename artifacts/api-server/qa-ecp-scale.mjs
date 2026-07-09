import { Client } from "ssh2";

const cmd = `
echo "=== LOGIN ==="
curl -s -m 10 -c /tmp/qa_ecp_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}'
echo ""
echo "=== CREATE MISSION (ECP-scale) ==="
curl -s -m 15 -b /tmp/qa_ecp_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d @- <<'ENDJSON'
{
  "title": "ECP-Scale: Full Architecture Analysis of AI Module",
  "objective": "Lakukan analisis arsitektur menyeluruh pada folder src/ai/ dan src/intelligence/. Identifikasi: 1) Semua dependensi antar modul dan potensi circular dependency, 2) Ketidakonsistenan pola error handling, 3) Potensi bottleneck pada pipeline eksekusi, 4) Kesenjangan implementasi dibanding arsitektur yang direncanakan. Minimal baca 15-20 file untuk analisis mendalam. Output minimal 1000 karakter.",
  "domains": ["codebase"]
}
ENDJSON
echo ""
echo "=== WAIT 180s (ECP-scale needs more time) ==="
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
elif [ "$st" = "COMPLETED" ] && [ "$rl" -ge 500 ]; then
  echo "=== MINOR: Output >= 500 but < 1000 chars ($rl) ==="
elif [ "$st" = "COMPLETED" ]; then
  echo "=== WARN: Output < 500 chars ($rl) ==="
else
  echo "=== FAIL: status=$st len=$rl ==="
fi
echo ""
echo "=== READ COUNT ==="
psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result) as len, metadata->'filesRead' as files_read, metadata FROM ai_missions ORDER BY id DESC LIMIT 1;"
echo ""
echo "=== LAST 6 MISSIONS ==="
psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result) as len, completed_at FROM ai_missions ORDER BY id DESC LIMIT 6;"
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
