import { Client } from "ssh2";

const cmd = `
curl -s -m 10 -c /tmp/qa_rawtest.txt -X POST 'http://localhost:3000/api/auth/login' \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null
echo "=== QUERY: misi 50 ==="
curl -s -m 60 -b /tmp/qa_rawtest.txt -X POST 'http://localhost:3000/api/ai/chat' \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Berikan laporan analisis full dari CTO untuk misi 50","mode":"ceo"}'
echo ""
echo "=== QUERY: misi terakhir ==="
curl -s -m 60 -b /tmp/qa_rawtest.txt -X POST 'http://localhost:3000/api/ai/chat' \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Apa hasil misi terakhir yang selesai? Berikan detail analisisnya.","mode":"ceo"}'
echo ""
echo "=== QUERY: misi 53 ==="
curl -s -m 60 -b /tmp/qa_rawtest.txt -X POST 'http://localhost:3000/api/ai/chat' \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Misi 53 ngapain aja?","mode":"ceo"}'
echo ""
echo "=== DONE ==="
`;

const c = new Client();
c.on("ready", () => {
  c.exec(cmd, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 120000 });
