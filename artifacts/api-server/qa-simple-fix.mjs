import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon", PROJECT = "/home/ubuntu/lumespos";

function exec(client, cmd) {
  return new Promise((resolve, reject) => {
    client.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let o = "";
      stream.on("data", d => o += d);
      stream.stderr.on("data", d => o += d);
      stream.on("close", () => resolve(o.trim()));
    });
  });
}

async function run() {
  const c = new Client();
  c.on("ready", async () => {
    // Inject bug
    await exec(c, `sed -i 's/Single entry point/Single entri point/' ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    
    // Login
    await exec(c, `curl -s -m 10 -c /tmp/qa_simple.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null`);
    
    // Get before
    const before = await exec(c, `stat -c %Y ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    console.log("BEFORE:", before);
    
    // Simple query
    const resp = await exec(c, `curl -s -m 300 -b /tmp/qa_simple.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi perbaiki typo di file execution-pipeline.ts - ganti \\"entri\\" jadi \\"entry\\" di baris 2. CTO harus gunakan writeFile untuk memperbaiki.","mode":"ceo"}' 2>&1 | grep -E "type.*meta|type.*done|APPROVED|writeFile|editFile|Selesai" | head -6`);
    console.log("RESP:", resp);
    
    // Get after
    const after = await exec(c, `stat -c %Y ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    console.log("AFTER:", after);
    
    // Check
    if (before !== after) {
      console.log("✅ FILE BERUBAH!");
      const check = await exec(c, `grep -n "entri\\|entry" ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
      console.log(check);
    } else {
      console.log("❌ FILE TIDAK BERUBAH");
      const logs = await exec(c, `pm2 logs pos-api --nostream --lines 200 2>&1 | grep -E "CONCLUDE.*EXECUTE|PERSETUJUAN|PIPELINE:.*cycle|EXECUTE" | tail -10`);
      console.log("LOGS:", logs);
    }
    
    // Restore
    await exec(c, `sed -i 's/Single entri point/Single entry point/' ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    c.end();
  });
  c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
}
run().catch(e => console.error(e));
