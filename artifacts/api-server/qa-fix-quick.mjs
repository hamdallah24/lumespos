import { Client } from "ssh2";
import { readFileSync } from "fs";
import { join } from "path";

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
  const content = readFileSync("D:\\web pos\\Point-Of-Sale\\artifacts\\pos-app\\src\\pages\\executive.tsx", "utf8");
  const b64 = Buffer.from(content).toString("base64");
  await exec(c, `mkdir -p "${PROJECT}/artifacts/pos-app/src/pages" && echo "${b64}" | base64 -d > "${PROJECT}/artifacts/pos-app/src/pages/executive.tsx"`);
  console.log("Uploaded");
  const r = await exec(c, `cd ${PROJECT}/artifacts/pos-app && pnpm run build 2>&1 | tail -5`);
  console.log(r);
  c.end();
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 120000 });
