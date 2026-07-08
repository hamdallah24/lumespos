import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`cd /home/ubuntu/lumespos/artifacts/api-server && node -r dotenv/config -e "
    const u = process.env.DATABASE_URL;
    if (!u) { console.log('NO URL'); process.exit(); }
    const url = new URL(u);
    const pg = require(url.protocol.replace(':', '') === 'postgresql' ? 'net' : 'net');
    // Just test if we can use the Neon serverless HTTP endpoint
    const https = require('https');
    // Build Neon SQL API URL
    const projectId = url.hostname.split('.')[0];
    const apiKey = u.split('@')[0].split('://')[1].split(':')[1];
    console.log('Project:', projectId, 'User:', url.username);
    console.log('DB:', url.pathname.substring(1));
    console.log('Host:', url.hostname);
  " 2>&1`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => c.end()).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
