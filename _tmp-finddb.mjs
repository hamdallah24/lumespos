import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`which psql 2>/dev/null; which node 2>/dev/null; cat /home/ubuntu/lumespos/artifacts/api-server/.env | grep DATABASE_URL | head -1 | cut -d= -f2- | cut -c1-30`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => {
      c.exec(`cd /home/ubuntu/lumespos/artifacts/api-server && node -e "
        const { neon } = require('@neondatabase/serverless');
        require('dotenv').config();
        if (!process.env.DATABASE_URL) { console.log('NO DB URL'); process.exit(); }
        console.log('DB URL found, length:', process.env.DATABASE_URL.length);
      " 2>&1 || echo 'NEON NOT FOUND'`, (e2, s2) => {
        if (e2) { console.error(e2); c.end(); return; }
        s2.on("close", () => c.end()).on("data", d => process.stdout.write(d));
        s2.stderr.on("data", d => process.stderr.write(d));
      });
    }).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
