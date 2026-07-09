import { Client } from "ssh2";

const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";

const c = new Client();
c.on("ready", () => {
  const cmd = `
echo "=== 1. CEK FILE SEBELUM ==="
grep -n "Math\\." /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>&1
echo ""
echo "=== 2. KIRIM PERINTAH IMPLEMENTASI ==="
echo "Meminta CTO untuk analisis + perbaiki file proposal-review.ts..."
echo "Ini bisa memakan waktu 3-5 menit..."
echo ""
OLDDATE=\\$(stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null)
curl -s -m 300 -b /tmp/qa_cto2.txt -X POST 'http://localhost:3000/api/ai/chat' \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Cari dan perbaiki bug di file /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts. Ada bug CRITICAL: ekspresi Math.r tidak lengkap. Baca file, analisis, lalu perbaiki kodenya. Gunakan writeFile atau editFile tool untuk implementasi.","mode":"cto"}' 2>&1 | grep -E "tool.*name|status.*CTO|type.*meta|type.*done|writeFile|editFile|fix|perbaiki|koreksi" | head -20
echo ""
echo "=== 3. CEK FILE SESUDAH ==="
NEWDATE=\\$(stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null)
grep -n "Math\\." /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>&1
echo ""
if [ "$OLDDATE" != "$NEWDATE" ]; then
  echo "✅ FILE TELAH BERUBAH (implementasi berhasil)"
  diff <(echo "$OLDDATE") <(echo "$NEWDATE")
else
  echo "❌ FILE TIDAK BERUBAH (implementasi GAGAL atau tidak dilakukan)"
fi
`;
  c.exec(cmd, (err, stream) => {
    let out = "";
    if (err) { console.error("Exec error:", err.message); c.end(); return; }
    stream.on("data", d => out += d);
    stream.on("close", () => { console.log(out); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
