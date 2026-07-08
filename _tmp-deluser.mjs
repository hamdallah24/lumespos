import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Use PG directly to delete user 21
  c.exec(`grep DATABASE_URL /home/ubuntu/lumespos/artifacts/api-server/.env | head -1 | cut -d= -f2- > /tmp/pgurl.txt && curl -s -X POST "$(cat /tmp/pgurl.txt)/sql" -H "Content-Type: application/json" -d '{"statements":[{"statement":"DELETE FROM users WHERE id=21"}]}' 2>&1 | head -5`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => c.end()).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
