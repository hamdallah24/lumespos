import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Create owner user, then login, then chat
  c.exec(`echo "=== CLEAN & CREATE OWNER ==="; curl -s -m 10 -c /tmp/qa_cookie2.txt -X POST 'http://localhost:3000/api/auth/signup' -H 'Content-Type: application/json' -d '{"email":"qaadmin@test.com","name":"QA Admin","password":"test12345","inviteCode":"lumes123"}' 2>&1; echo ""; echo "=== LOGIN ==="; curl -s -m 10 -c /tmp/qa_cookie2.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"qaadmin@test.com","password":"test12345"}' 2>&1; echo ""; echo "=== CHAT ==="; curl -s -m 300 -b /tmp/qa_cookie2.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi analisis dan temukan bug di halaman produk","userId":2}' 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 360000 });
