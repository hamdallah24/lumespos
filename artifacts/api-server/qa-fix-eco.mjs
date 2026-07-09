import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`cat > /home/ubuntu/lumespos/artifacts/api-server/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: "pos-api",
    script: "dist/index.mjs",
    cwd: "/home/ubuntu/lumespos/artifacts/api-server",
    node_args: "-r dotenv/config --enable-source-maps",
    env: {
      NODE_ENV: "production"
    }
  }]
};
EOF
echo "File updated"; pm2 delete pos-api; pm2 start /home/ubuntu/lumespos/artifacts/api-server/ecosystem.config.cjs --update-env`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
