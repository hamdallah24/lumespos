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

const c = new Client();
c.on("ready", async () => {
  const files = [
    "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-strategy.ts",
    "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-governor.ts",
  ];
  for (const f of files) {
    const content = readFileSync(f, "utf8");
    const b64 = Buffer.from(content).toString("base64");
    const name = f.split("execution\\").pop();
    await exec(c, `echo "${b64}" | base64 -d > "${PROJECT}/artifacts/api-server/src/ai/runtime/execution/${name}"`);
  }
  console.log("Upload + Build...");
  await exec(c, `cd ${PROJECT}/artifacts/api-server && node build.mjs 2>&1 | tail -3`);
  await exec(c, `pm2 restart pos-api 2>&1 | tail -5`);
  await new Promise(r => setTimeout(r, 15000));
  console.log("Running test...");
  const r = await exec(c, `curl -s -m 10 -c /tmp/qa_debug.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null && curl -s -m 180 -b /tmp/qa_debug.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi cari dan perbaiki bug di file execution-pipeline.ts","mode":"ceo"}' 2>&1 | grep -E "finalText|type.*meta|APPROVED" | head -5 && echo "---LOGS---" && pm2 logs pos-api --nostream --lines 100 2>&1 | grep "STRATEGY:DEBUG" | tail -15`);
  console.log(r);
  c.end();
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 240000 });
