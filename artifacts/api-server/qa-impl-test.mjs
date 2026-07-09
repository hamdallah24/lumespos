import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  const cmd = `
# Login
curl -s -m 10 -c /tmp/qa_impl.txt -X POST 'http://localhost:3000/api/auth/login' \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null

echo "=== TEST CTO IMPLEMENTATION ==="
echo "Waktu mulai: \\$(date '+%H:%M:%S')"
echo ""

# Simpan timestamp file sebelum
BEFORE=\\$(stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null)

# Kirim perintah implementasi
curl -s -m 300 -b /tmp/qa_impl.txt -X POST 'http://localhost:3000/api/ai/chat' \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Analisis file proposal-review.ts dan execution-pipeline.ts lalu perbaiki masalah yang ditemukan. Gunakan writeFile atau editFile untuk implementasi.","mode":"cto"}' 2>&1 | grep -E "type.*status|type.*tool|type.*meta|type.*done|writeFile|editFile|execCommand|APPROVED" | head -40

echo ""
echo "=== VERIFIKASI ==="
AFTER=\\$(stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null)
if [ "$BEFORE" != "$AFTER" ]; then
  echo "✅ proposal-review.ts BERUBAH"
  echo "  Before: $BEFORE"
  echo "  After:  $AFTER"
else
  echo "❌ proposal-review.ts TIDAK BERUBAH"
fi

# Cek file kedua
BEFORE2=\\$(stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts 2>/dev/null)
if [ "$BEFORE2" != "" ]; then
  AFTER2=\\$(stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts 2>/dev/null)
  if [ "$BEFORE2" != "$AFTER2" ]; then
    echo "✅ execution-pipeline.ts BERUBAH"
  else
    echo "❌ execution-pipeline.ts TIDAK BERUBAH"
  fi
fi
echo ""
echo "=== SELESAI ==="`;
  c.exec(cmd, (err, stream) => {
    let out = "";
    if (err) { console.error("Error:", err.message); c.end(); return; }
    stream.on("data", d => out += d);
    stream.on("close", () => { console.log(out); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
