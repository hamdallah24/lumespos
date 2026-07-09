import { Client } from "ssh2";

const cmd = `
echo "=== LOGIN ==="
curl -s -m 10 -c /tmp/qa_memtest_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' | head -c 100
echo ""
echo "=== ASK CEO about mission #50 ==="
curl -s -m 30 -b /tmp/qa_memtest_cookie.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"Berikan laporan analisis full dari CTO untuk misi 50","mode":"ceo"}' 2>&1 | head -c 2500
echo ""
echo ""
echo "=== ASK CEO about latest mission ==="
curl -s -m 30 -b /tmp/qa_memtest_cookie.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"Apa hasil misi terakhir yang selesai? Berikan detail analisisnya.","mode":"ceo"}' 2>&1 | head -c 2500
echo ""
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
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 90000 });
