import { Client } from "ssh2";

const cmd = `
echo "=== LOGIN ==="
curl -s -m 10 -c /tmp/qa_e2e_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}'
echo ""
echo "=== CREATE MISSION ==="
curl -s -m 15 -b /tmp/qa_e2e_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d '{"title":"E2E Final: Full Pipeline","objective":"Analisis kode pada file src/ai/tools/tool-adapter.ts dan src/ai/runtime/execution/execution-pipeline.ts. Identifikasi potensi error handling issue dan rekomendasi perbaikan. Output minimal 500 karakter.","domains":["codebase"]}'
echo ""
echo "=== WAIT 120s ==="
for i in $(seq 1 24); do sleep 5; echo "  +5s ($((i*5))s)..."; done
echo "=== RESULTS ==="
psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result) as len, substring(result,1,100) as preview, completed_at FROM ai_missions ORDER BY id DESC LIMIT 6;"
echo ""
echo "=== CEO APPROVAL ==="
grep "CEO review result" /home/ubuntu/.pm2/logs/pos-api-out.log | tail -3
echo ""
echo "=== ERROR FREE? ==="
echo "searchRepoFiles errors: $(grep -c 'searchRepoFiles error' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
echo "Output too short retries: $(grep -c 'Output too short' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
echo "Perubahan tidak disetujui: $(grep -c 'Perubahan tidak disetujui' /home/ubuntu/.pm2/logs/pos-api-out.log 2>/dev/null || echo 0)"
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
