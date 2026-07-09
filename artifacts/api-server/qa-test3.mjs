import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Try login, then send chat
  c.exec(`echo "=== LOGIN TEST ==="; curl -s -m 10 -c /tmp/qa_cookies.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin"}' 2>&1; echo ""; curl -s -m 10 -c /tmp/qa_cookies2.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"owner@lumespos.com","password":"owner123"}' 2>&1; echo ""; curl -s -m 10 -c /tmp/qa_cookies3.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"test@test.com","password":"test123"}' 2>&1; echo ""; echo "=== DB CHECK ==="; cd /home/ubuntu/lumespos/artifacts/api-server && node -e "const{pool}=require('@workspace/db');pool.query('SELECT email FROM users LIMIT 5').then(r=>console.log(JSON.stringify(r.rows))).catch(e=>console.log(e.message))" 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
