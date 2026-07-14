import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Client } from "ssh2";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, "artifacts", "pos-app", "dist", "public");
const REMOTE = "/home/ubuntu/lumespos/artifacts/pos-app/dist/public";
const HOST = "43.157.227.205";

async function deploy() {
  const files = collectFiles(SOURCE);
  console.log(`Found ${files.length} files in ${SOURCE}`);

  const conn = new Client();
  conn.on("ready", () => {
    console.log("SSH connected");

    conn.sftp((err, sftp) => {
      if (err) { console.error("SFTP error:", err); conn.end(); process.exit(1); return; }

      let idx = 0;
      function uploadNext() {
        if (idx >= files.length) {
          console.log("All frontend files uploaded");
          sftp.end();
          conn.end();
          console.log("Frontend deploy complete!");
          return;
        }

        const f = files[idx];
        const localPath = join(SOURCE, f);
        const remotePath = `${REMOTE}/${f}`;
        const dir = remotePath.substring(0, remotePath.lastIndexOf("/"));
        conn.exec(`mkdir -p ${dir} 2>&1`, () => {
          sftp.fastPut(localPath, remotePath, (e2) => {
            if (e2) { console.error(`Failed to upload ${f}:`, e2.message); conn.end(); process.exit(1); return; }
            console.log(`Uploaded ${f}`);
            idx++;
            uploadNext();
          });
        });
      }
      uploadNext();
    });
  });

  conn.on("error", e => { console.error("SSH error:", e.message); process.exit(1); });

  conn.connect({
    host: HOST,
    username: "ubuntu",
    password: "river-86%-falcon",
    readyTimeout: 30000,
  });
}

function collectFiles(dir, prefix = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...collectFiles(full, `${prefix}${e.name}/`));
    else if (e.isFile()) files.push(`${prefix}${e.name}`);
  }
  return files;
}

deploy().catch(e => { console.error(e); process.exit(1); });
