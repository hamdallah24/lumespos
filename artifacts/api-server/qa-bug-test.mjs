import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  // 1. Inject a known bug into a real file that CTO can find and fix
  // 2. Run CTO implementation test
  // 3. Verify the fix
  const cmds = `
# Step 1: Inject bug - add a comment typo in execution-pipeline.ts
BEFORE=\\$(grep -n "Pipeline entry" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts 2>/dev/null)
echo "=== BEFORE BUG ==="
echo "$BEFORE"
echo ""
echo "=== INJECT BUG ==="
sed -i 's/Single entry point/Single entri point/' /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts
grep -n "entri point" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts
echo "Bug injected!"

# Step 2: Login + send CTO to fix
curl -s -m 10 -c /tmp/qa_bug.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null
echo ""
echo "=== TEST CTO IMPLEMENT ==="
echo "Waktu: \\$(date '+%H:%M:%S')"
FILE_BEFORE=\\$(stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts)
curl -s -m 300 -b /tmp/qa_bug.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi cari dan perbaiki typo atau issue di file execution-pipeline.ts - CTO harus baca file, analisis, lalu perbaiki menggunakan writeFile","mode":"ceo"}' 2>&1 | grep -E "type.*tool|type.*meta|type.*done|writeFile|editFile|APPROVED|DB#|Selesai|finalText" | head -20
echo ""
echo "=== VERIFY ==="
FILE_AFTER=\\$(stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts)
echo "File timestamp before: $FILE_BEFORE"
echo "File timestamp after:  $FILE_AFTER"
if [ "$FILE_BEFORE" != "$FILE_AFTER" ]; then
  echo "✅ FILE BERUBAH!"
  grep -n "entri point\\|entry point" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts
else
  echo "❌ FILE TIDAK BERUBAH"
fi
echo ""
echo "=== RESTORE BUG ==="
sed -i 's/Single entri point/Single entry point/' /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts
echo "Restored"`;
  c.exec(cmds, (err, stream) => {
    let out = "";
    if (err) { console.error("Error:", err.message); c.end(); return; }
    stream.on("data", d => out += d);
    stream.on("close", () => { console.log(out); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
