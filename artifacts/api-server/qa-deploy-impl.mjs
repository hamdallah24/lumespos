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
    { local: "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\programs\\cto-runtime.ts", remote: "artifacts/api-server/src/ai/programs/cto-runtime.ts" },
    { local: "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\llm\\llm-adapter.ts", remote: "artifacts/api-server/src/ai/llm/llm-adapter.ts" },
  ];
  for (const f of files) {
    const content = readFileSync(f.local, "utf8");
    const b64 = Buffer.from(content).toString("base64");
    await exec(c, `echo "${b64}" | base64 -d > "${PROJECT}/${f.remote}"`);
    console.log(`Uploaded ${f.remote}`);
  }
  console.log("Build...");
  await exec(c, `cd ${PROJECT}/artifacts/api-server && node build.mjs 2>&1 | tail -3`);
  await exec(c, `pm2 restart pos-api 2>&1`);
  console.log("Deployed");
  c.end();
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 60000 });
