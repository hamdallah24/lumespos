import { readFileSync } from "fs";
import { Client } from "ssh2";

const HOST = "43.157.227.205";
const REMOTE = "/home/ubuntu/lumespos/artifacts/api-server";

async function run() {
  const buf = readFileSync("src/ai/llm/llm-adapter.ts");
  console.log("Read local file:", buf.length, "bytes");

  const conn = new Client();
  conn.on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) { console.error(err); conn.end(); return; }
      const ws = sftp.createWriteStream(REMOTE + "/src/ai/llm/llm-adapter.ts");
      ws.on("close", () => {
        console.log("Uploaded");
        sftp.end();
        conn.exec(`cd ${REMOTE} && node build.mjs 2>&1`, (e, s) => {
          let o = "";
          s.on("data", d => o += d);
          s.on("close", () => {
            if (o.includes("ERROR")) {
              console.error("Build failed:", o.slice(0, 500));
              conn.end();
              return;
            }
            console.log("Build OK");
            conn.exec("pm2 restart pos-api --update-env 2>&1", (e2, s2) => {
              let o2 = "";
              s2.on("data", d => o2 += d);
              s2.on("close", () => {
                console.log("PM2 restarted");
                conn.end();
              });
            });
          });
        });
      });
      ws.write(buf);
      ws.end();
    });
  });

  conn.on("error", e => { console.error(e); process.exit(1); });
  conn.connect({ host: HOST, username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
}

run().catch(e => { console.error(e); process.exit(1); });
