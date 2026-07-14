import { Client } from "ssh2";

const HOST = "43.157.227.205";
const PASS = "river-86%-falcon";

async function run() {
  const conn = new Client();
  conn.on("ready", () => {
    function execCmd(cmd) {
      return new Promise((resolve) => {
        conn.exec(cmd, (err, stream) => {
          if (err) { resolve({ code: -1, out: err.message }); return; }
          let out = "";
          stream.on("data", d => out += d.toString());
          stream.stderr.on("data", d => out += d.toString());
          stream.on("close", (code) => resolve({ code, out }));
        });
      });
    }

    (async () => {
      // 1. Install Redis
      console.log("=== Install Redis ===");
      let r = await execCmd(`sudo apt update -qq && sudo apt install -y -qq redis-server 2>&1 | tail -5`);
      console.log(r.out);

      // 2. Enable + start Redis
      console.log("\n=== Start Redis ===");
      r = await execCmd(`sudo systemctl enable redis-server && sudo systemctl start redis-server && sudo systemctl status redis-server --no-pager 2>&1 | head -15`);
      console.log(r.out);

      // 3. Verify
      console.log("\n=== Redis ping ===");
      r = await execCmd(`redis-cli ping 2>&1`);
      console.log(r.out);

      // 4. Add REDIS_HOST to .env if not already there
      console.log("\n=== Update .env ===");
      r = await execCmd(`grep -q "^REDIS_HOST" /home/ubuntu/lumespos/artifacts/api-server/.env && echo "EXISTS" || echo "MISSING"`);
      if (r.out.trim() === "MISSING") {
        r = await execCmd(`echo "REDIS_HOST=localhost" >> /home/ubuntu/lumespos/artifacts/api-server/.env`);
        r = await execCmd(`echo "REDIS_PORT=6379" >> /home/ubuntu/lumespos/artifacts/api-server/.env`);
        console.log("REDIS_HOST added to .env");
      } else {
        console.log("REDIS_HOST already in .env");
      }

      // 5. Show final .env (masked)
      r = await execCmd(`grep "^REDIS" /home/ubuntu/lumespos/artifacts/api-server/.env`);
      console.log("Redis env:", r.out);

      // 6. Restart PM2
      console.log("\n=== Restart PM2 ===");
      r = await execCmd(`cd /home/ubuntu/lumespos && pm2 restart pos-api --update-env 2>&1 | tail -10`);
      console.log(r.out);

      conn.end();
    })();
  });

  conn.on("error", e => { console.error("SSH error:", e.message); process.exit(1); });

  conn.connect({
    host: HOST,
    username: "ubuntu",
    password: PASS,
    readyTimeout: 60000,
  });
}

run();
