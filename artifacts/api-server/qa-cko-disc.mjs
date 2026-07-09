import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`
# 1. Create data directory
mkdir -p /home/ubuntu/lumespos/data

# 2. Quick check: run discovery first by triggering translate via chat
echo "=== TRIGGER DISCOVERY VIA CHAT ==="
curl -s -c /tmp/qad1.txt -b /tmp/qad1.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa-test@lumes.com","password":"testpass123"}' > /dev/null

curl -s -c /tmp/qad1.txt -b /tmp/qad1.txt \
  -X POST http://localhost:3000/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"buat misi analisa inventory dashboard produk"}'

echo ""
echo "=== WAIT 90s ==="
sleep 90

# 3. Check if file map was created
echo "=== FILE MAP EXISTS? ==="
ls -la /home/ubuntu/lumespos/data/ 2>/dev/null

echo ""
echo "=== QA-CTO ==="
grep '\\[QA-CTO\\]' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -1

echo ""
echo "=== CKO TRANSLATE ==="
grep 'CKO:TRANSLATE' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -1

echo ""
echo "=== CTO END ==="
grep 'PIPELINE:CTO.*execute end' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -1
`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
