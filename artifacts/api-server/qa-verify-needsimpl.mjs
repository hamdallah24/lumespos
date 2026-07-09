import { Client } from "ssh2";

const cmd = `
echo "=== LOGIN ==="
curl -s -m 10 -c /tmp/qa_ni_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}'
echo ""
echo "=== CREATE MISSION (specific file) ==="
curl -s -m 15 -b /tmp/qa_ni_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d '{"title":"Verify needsImpl fix: specific file analysis","objective":"Analisis error handling pada file src/ai/tools/tool-adapter.ts. Identifikasi potensi bug dan berikan rekomendasi perbaikan. Output minimal 500 karakter.","domains":["codebase"]}'
echo ""
echo "=== WAIT 120s ==="
for i in $(seq 1 24); do sleep 5; echo "  +5s ($((i*5))s)..."; done
echo "=== FETCH RESULT ==="
r=$(psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result), completed_at FROM ai_missions ORDER BY id DESC LIMIT 1;")
echo "ROW:$r"
id=$(echo "$r" | cut -d'|' -f1)
st=$(echo "$r" | cut -d'|' -f2)
rl=$(echo "$r" | cut -d'|' -f3)
echo "MISSION: ID=$id STATUS=$st LEN=$rl"
if [ "$st" = "COMPLETED" ] && [ "$rl" -ge 500 ]; then
  echo "=== PASS: Output >= 500 chars ==="
elif [ "$st" = "FAILED" ]; then
  echo "=== FAIL: Check if it's Founder reject or CTO short ==="
fi
echo ""
echo "=== CEO APPROVAL TRACE ==="
grep "CEO review result" /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5
echo ""
echo "=== EXECUTE GATE TRACE ==="
grep -c "Perubahan tidak disetujui" /home/ubuntu/.pm2/logs/pos-api-out.log
echo ""
echo "=== LAST 5 MISSIONS ==="
psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result) as len, completed_at FROM ai_missions ORDER BY id DESC LIMIT 5;"
`;

const c = new Client();
c.on("ready", () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.error(e.message); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 240000 });
