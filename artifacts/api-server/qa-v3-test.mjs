import { Client } from "ssh2";
import { readFileSync } from "fs";
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
    const files = [
      "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\programs\\ceo-runtime.ts",
      "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-strategy.ts",
      "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-driver.ts",
      "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\goal-tree.ts",
    ];
    for (const f of files) {
      const content = readFileSync(f, "utf8");
      const b64 = Buffer.from(content).toString("base64");
      const name = f.split("api-server\\src\\").pop().replace(/\\/g, "/");
      await exec(c, `echo "${b64}" | base64 -d > "${PROJECT}/artifacts/api-server/src/${name}"`);
    }
    console.log("Uploaded");
    await exec(c, `cd ${PROJECT}/artifacts/api-server && node build.mjs 2>&1 | tail -3`);
    await exec(c, `pm2 restart pos-api 2>&1 | tail -3`);
    console.log("Restarted");
    await new Promise(r => setTimeout(r, 15000));
    
    await exec(c, `sed -i 's/Single entry point/Single entri point/' ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    await exec(c, `curl -s -m 10 -c /tmp/qa_v3.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null`);
    const before = await exec(c, `stat -c %Y ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    console.log("BEFORE:", before);
    
    const resp = await exec(c, `curl -s -m 300 -b /tmp/qa_v3.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi cari dan perbaiki bug di file execution-pipeline.ts - cari typo dan gunakan editFile untuk perbaiki","mode":"ceo"}' 2>&1 | grep -E "type.*meta|type.*done|editFile|writeFile|APPROVED" | head -6`);
    console.log("RESP:", resp);
    
    const after = await exec(c, `stat -c %Y ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    console.log("AFTER:", after);
    
    if (before !== after) {
      console.log("✅✅✅ FILE BERUBAH!");
      const check = await exec(c, `grep -n "entri\\|entry" ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
      console.log(check);
    } else {
      console.log("❌ FILE TIDAK BERUBAH");
      const logs = await exec(c, `pm2 logs pos-api --nostream --lines 200 2>&1 | grep -E "PIPELINE:.*cycle|EXECUTE|APPROVED|REJECTED|PERSETUJUAN|editFile|writeFile" | tail -15`);
      console.log("LOGS:", logs);
    }
    
    await exec(c, `sed -i 's/Single entri point/Single entry point/' ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    c.end();
  });
  c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
}
run();
