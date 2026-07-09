import { Client } from "ssh2";
import { readFileSync } from "fs";
import { join } from "path";

const HOST = "43.157.227.205";
const USER = "ubuntu";
const PASS = "river-86%-falcon";
const PROJECT = "/home/ubuntu/lumespos";
const LOCAL_BASE = "D:\\web pos\\Point-Of-Sale\\artifacts\\pos-app";

async function writeRemote(client, remotePath, content) {
  const b64 = Buffer.from(content).toString("base64");
  const dir = remotePath.substring(0, remotePath.lastIndexOf("/"));
  await new Promise((resolve, reject) => {
    client.exec(`mkdir -p "${dir}"`, (err, s) => { s.on("close", resolve); });
  });
  await new Promise((resolve, reject) => {
    client.exec(`echo "${b64}" | base64 -d > "${remotePath}"`, (err, s) => { s.on("close", resolve); });
  });
}

const c = new Client();
c.on("ready", async () => {
  const files = ["src/pages/executive.tsx", "src/components/active-missions.tsx", "src/components/mission-detail.tsx"];
  for (const f of files) {
    const content = readFileSync(join(LOCAL_BASE, f), "utf8");
    await writeRemote(c, `${PROJECT}/artifacts/pos-app/${f}`, content);
    console.log(`Uploaded ${f}`);
  }
  console.log("Building frontend...");
  let out = "";
  c.exec(`cd ${PROJECT}/artifacts/pos-app && pnpm run build 2>&1 | tail -10`, (e, s) => {
    s.on("data", d => out += d);
    s.on("close", () => { console.log(out); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 120000 });
