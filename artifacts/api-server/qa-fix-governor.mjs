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
    const files = [
      { local: "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\execution-governor.ts", remote: "ai/runtime/execution/execution-governor.ts" },
      { local: "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\runtime\\execution\\goal-tree.ts", remote: "ai/runtime/execution/goal-tree.ts" },
      { local: "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server\\src\\ai\\programs\\ceo-runtime.ts", remote: "../programs/ceo-runtime.ts" },
    ];
    for (const f of files) {
      const content = readFileSync(f.local, "utf8");
      const b64 = Buffer.from(content).toString("base64");
      await exec(c, `echo "${b64}" | base64 -d > "/home/ubuntu/lumespos/artifacts/api-server/src/${f.remote}"`);
    }
    console.log("Uploaded");
    await exec(c, `cd /home/ubuntu/lumespos/artifacts/api-server && node build.mjs 2>&1 | tail -3`);
    console.log("Built");
    const gov = await exec(c, `grep -c "GOV:DEBUG" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs`);
    console.log("GOV:DEBUG in dist:", gov);
    c.end();
  });
  c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 60000 });
}
run();
