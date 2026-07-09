import { Client } from "ssh2";

const cmd = `
echo "=== ASK: misi terakhir ==="
RESULT=$(curl -s -m 60 -b /tmp/qa_memtest_cookie.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"Apa hasil misi terakhir yang selesai?","mode":"ceo"}')
echo "$RESULT" | head -c 4000
`;

const c = new Client();
c.on("ready", () => {
  c.exec(`curl -s -m 10 -c /tmp/qa_memtest_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null && ${cmd}`, (e, s) => {
    if (e) { console.error(e.message); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 90000 });
