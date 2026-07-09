import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  console.log("SSH connected");
  c.exec("echo HELLO_WORLD; hostname", (e, s) => {
    if (e) { console.error("exec error:", e.message); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log("OUTPUT:", o.trim()); c.end(); });
    s.stderr.on("data", d => console.error("STDERR:", d.toString().trim()));
  });
});
c.on("error", e => console.error("SSH error:", e.message));
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
