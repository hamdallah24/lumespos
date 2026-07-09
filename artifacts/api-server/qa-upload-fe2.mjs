import { Client } from "ssh2";
import { readFileSync } from "fs";
import { join } from "path";

const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon", PROJECT = "/home/ubuntu/lumespos";
const LOCAL = "D:\\web pos\\Point-Of-Sale\\artifacts\\pos-app";

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
  const files = ["src/pages/executive.tsx", "src/components/active-missions.tsx", "src/components/mission-detail.tsx"];
  for (const f of files) {
    const content = readFileSync(join(LOCAL, f), "utf8");
    const b64 = Buffer.from(content).toString("base64");
    const dir = `${PROJECT}/artifacts/pos-app/${f.substring(0, f.lastIndexOf("/"))}`;
    await exec(c, `mkdir -p "${dir}" && echo "${b64}" | base64 -d > "${PROJECT}/artifacts/pos-app/${f}"`);
    console.log(`Uploaded ${f}`);
  }
  console.log("Build frontend...");
  const r = await exec(c, `cd ${PROJECT}/artifacts/pos-app && pnpm run build 2>&1 | tail -10`);
  console.log(r);
  c.end();
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 120000 });
