import { Client } from "ssh2";
import { readFileSync } from "fs";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
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
    const BASE = "/home/ubuntu/lumespos/artifacts/api-server/src";
    const uploads = [
      ["D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-strategy.ts", `${BASE}/ai/runtime/execution/execution-strategy.ts`],
      ["D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-driver.ts", `${BASE}/ai/runtime/execution/execution-driver.ts`],
      ["D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-governor.ts", `${BASE}/ai/runtime/execution/execution-governor.ts`],
      ["D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\goal-tree.ts", `${BASE}/ai/runtime/execution/goal-tree.ts`],
      ["D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-pipeline.ts", `${BASE}/ai/runtime/execution/execution-pipeline.ts`],
      ["D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\prompt-assembler.ts", `${BASE}/ai/runtime/prompt-assembler.ts`],
      ["D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\programs\\ceo-runtime.ts", `${BASE}/ai/programs/ceo-runtime.ts`],
      ["D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\programs\\cto-runtime.ts", `${BASE}/ai/programs/cto-runtime.ts`],
    ];
    for (const [local, remote] of uploads) {
      const content = readFileSync(local, "utf8");
      const b64 = Buffer.from(content).toString("base64");
      await exec(c, `echo "${b64}" | base64 -d > "${remote}"`);
    }
    console.log("Uploaded");
    await exec(c, `cd /home/ubuntu/lumespos/artifacts/api-server && node build.mjs 2>&1 | tail -3`);
    await exec(c, `pm2 restart pos-api 2>&1 | tail -3`);
    await new Promise(r => setTimeout(r, 20000));

    await exec(c, `sed -i 's/Single entry point/Single entri point/' /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    await exec(c, `curl -s -m 10 -c /tmp/qa_fin.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null`);
    const before = await exec(c, `stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    console.log("BEFORE:", before);
    
    console.log("Running BGE (buat misi)...");
    const resp = await exec(c, `curl -s -m 300 -b /tmp/qa_fin.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi perbaiki typo di file execution-pipeline.ts - ganti \\"entri\\" jadi \\"entry\\"","mode":"ceo"}' 2>&1 | grep -E "type.*meta|type.*done|writeFile|editFile|execCommand|DRIVER:EXEC" | head -10`);
    console.log("RESP:", resp);
    
    const after = await exec(c, `stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    console.log("AFTER:", after);
    
    if (before !== after) {
      console.log("✅✅✅ FILE BERUBAH!");
      const check = await exec(c, `grep -n "entri\\|entry" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
      console.log(check);
    } else {
      console.log("❌ FILE TIDAK BERUBAH");
      const logs = await exec(c, `pm2 logs pos-api --nostream --lines 800 2>&1 | grep -E "PIPELINE:.*cycle|DRIVER:EXEC|DRIVER:SUMMARIZER|TOOL=|TOOL|EXECUTE|APPROVED|editFile|writeFile|needsImpl" | tail -20`);
      console.log("LOGS:", logs);
    }
    
    await exec(c, `sed -i 's/Single entri point/Single entry point/' /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`);
    console.log("Bug restored");
    c.end();
  });
  c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
}
run();
