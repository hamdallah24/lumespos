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
    { local: "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-strategy.ts" },
    { local: "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-governor.ts" },
  ];
  for (const f of files) {
    const content = readFileSync(f.local, "utf8");
    const b64 = Buffer.from(content).toString("base64");
    const remote = "artifacts/api-server/src/ai/runtime/execution/" + f.local.split("execution\\").pop();
    await exec(c, `echo "${b64}" | base64 -d > "${PROJECT}/${remote}"`);
    console.log(`Uploaded ${remote}`);
  }
  console.log("Build...");
  const r = await exec(c, `cd ${PROJECT}/artifacts/api-server && node build.mjs 2>&1 | tail -5`);
  console.log(r);
  await exec(c, `pm2 restart pos-api 2>&1`);
  console.log("Deployed. Testing in 30s...");
  await new Promise(r => setTimeout(r, 30000));
  const test = await exec(c, `curl -s -m 10 -c /tmp/qa_final2.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null; echo "=== BEFORE ==="; stat -c "%Y" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null; curl -s -m 300 -b /tmp/qa_final2.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi perbaiki file proposal-review.ts - CTO harus baca, analisis, dan perbaiki kode. Gunakan writeFile untuk implementasi.","mode":"ceo"}' 2>&1 | grep -E "type.*tool.*writeFile|type.*tool.*editFile|type.*meta|status.*CTO|writeFile|editFile|APPROVED|DB#|finalText" | head -15; echo ""; echo "=== AFTER ==="; stat -c "%Y" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null`);
  console.log(test);
  c.end();
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
