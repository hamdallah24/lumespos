import { Client } from "ssh2";

const cmd = `
echo "=== LOGIN ==="
curl -s -m 10 -c /tmp/qa_mem_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}'
echo ""
echo "=== CREATE MISSION 1 ==="
curl -s -m 15 -b /tmp/qa_mem_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d '{"title":"Memory Test 1: CEO Context","objective":"Analisis error handling pada file src/ai/tools/tool-adapter.ts. Identifikasi potensi bug dan berikan rekomendasi. Output minimal 500 karakter.","domains":["codebase"]}'
echo ""
echo "=== WAIT 120s ==="
for i in $(seq 1 24); do sleep 5; echo "  +5s ($((i*5))s)..."; done
echo "=== CHECK MISSION 1 ==="
r=$(psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result), completed_at FROM ai_missions ORDER BY id DESC LIMIT 1;")
echo "ROW:$r"
id=$(echo "$r" | cut -d'|' -f1)
st=$(echo "$r" | cut -d'|' -f2)
rl=$(echo "$r" | cut -d'|' -f3)
echo "MISSION_1: ID=$id STATUS=$st LEN=$rl"
echo ""
echo "=== CREATE MISSION 2 ==="
curl -s -m 15 -b /tmp/qa_mem_cookie.txt -X POST 'http://localhost:3000/api/ai/mission' -H 'Content-Type: application/json' -d '{"title":"Memory Test 2: CEO Should Remember","objective":"Analisis arsitektur pada folder src/ai/runtime/execution/. Evaluasi apakah pipeline eksekusi sudah sesuai dengan prinsip SOLID. Output minimal 500 karakter.","domains":["codebase"]}'
echo ""
echo "=== WAIT 120s ==="
for i in $(seq 1 24); do sleep 5; echo "  +5s ($((i*5))s)..."; done
echo "=== CHECK MISSION 2 ==="
r2=$(psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result), completed_at FROM ai_missions ORDER BY id DESC LIMIT 1;")
echo "ROW2:$r2"
id2=$(echo "$r2" | cut -d'|' -f1)
st2=$(echo "$r2" | cut -d'|' -f2)
rl2=$(echo "$r2" | cut -d'|' -f3)
echo "MISSION_2: ID=$id2 STATUS=$st2 LEN=$rl2"
echo ""
echo "=== CEO APPROVAL TRACE ==="
grep "CEO review result" /home/ubuntu/.pm2/logs/pos-api-out.log | tail -4
echo ""
echo "=== EXECUTIVE MEMORY CHECK ==="
grep "Executive Memory (CEO)" /home/ubuntu/.pm2/logs/pos-api-out.log | tail -3
echo ""
echo "=== ALL MISSION STATUS ==="
psql "postgresql://neondb_owner:npg_4c6itCXQDNSW@ep-plain-moon-aoco0f0i-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -t -A -c "SELECT id, status, length(result) as len, completed_at FROM ai_missions ORDER BY id DESC LIMIT 8;"
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
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 360000 });
