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
  const content = readFileSync("D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\routes\\ai-prompts.ts", "utf8");
  const b64 = Buffer.from(content).toString("base64");
  await exec(c, `mkdir -p "${PROJECT}/artifacts/api-server/src/routes" && echo "${b64}" | base64 -d > "${PROJECT}/artifacts/api-server/src/routes/ai-prompts.ts"`);
  console.log("Uploaded ai-prompts.ts");
  const r = await exec(c, `cd ${PROJECT}/artifacts/api-server && node build.mjs 2>&1 | tail -5`);
  console.log(r);
  await exec(c, `pm2 restart pos-api 2>&1`);
  console.log("Restarted");
  c.end();
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 60000 });
