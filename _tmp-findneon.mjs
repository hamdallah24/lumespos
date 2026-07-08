import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`ls /home/ubuntu/lumespos/artifacts/api-server/node_modules/@neondatabase 2>/dev/null || ls /home/ubuntu/lumespos/artifacts/api-server/node_modules/.pnpm/@neondatabase+serverless* 2>/dev/null || find /home/ubuntu/lumespos/artifacts/api-server/node_modules -name "*.mjs" -path "*/neon/*" 2>/dev/null | head -3 || echo "NEON NOT FOUND"`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => {
      c.exec(`ls /home/ubuntu/lumespos/node_modules/.pnpm/@neondatabase+serverless*/node_modules/@neondatabase/serverless/dist/index.mjs 2>/dev/null | head -3 || echo "NEON IN PNPM NOT FOUND"`, (e2, s2) => {
        if (e2) { console.error(e2); c.end(); return; }
        s2.on("close", () => c.end()).on("data", d => process.stdout.write(d));
        s2.stderr.on("data", d => process.stderr.write(d));
      });
    }).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
