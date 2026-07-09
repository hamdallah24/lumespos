import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmds = `curl -s -m 15 -b /tmp/qa_test2.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"Misi 53 ngapain aja?","mode":"ceo"}' 2>&1 | grep "status.*CTO\\|status.*CTO\\|status.*analisis\\|status.*File" | head -10`;
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(no status matches — mungkin langsung bypass ke direct DB)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
