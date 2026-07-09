import { Client } from "ssh2";

const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";

const c = new Client();
let allOutput = "";

c.on("ready", () => {
  const queries = [
    `curl -s -m 10 -c /tmp/qa_cto.txt -X POST 'http://localhost:3000/api/auth/login' \\
      -H 'Content-Type: application/json' \\
      -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null`,
    `echo "===TEST 1: CTO Analysis Only==="`,
    `curl -s -m 180 -b /tmp/qa_cto.txt -X POST 'http://localhost:3000/api/ai/chat' \\
      -H 'Content-Type: application/json' \\
      -d '{"message":"Analisis file execution-pipeline.ts dan execution-driver.ts, cari potensi bug atau masalah, berikan rekomendasi perbaikan","mode":"cto"}' 2>&1 | grep -E "finalText|tool|writeFile|editFile|execCommand|type.*done" | tail -10`,
    `echo ""`,
    `echo "===TEST 2: CTO Analysis + Implementation==="`,
    `curl -s -m 300 -b /tmp/qa_cto.txt -X POST 'http://localhost:3000/api/ai/chat' \\
      -H 'Content-Type: application/json' \\
      -d '{"message":"Analisis file execution-pipeline.ts, cari bug atau potensi masalah, lalu perbaiki langsung kodenya. Gunakan writeFile atau editFile tool untuk implementasi perbaikan.","mode":"cto"}' 2>&1 | grep -E "tool.*name|tool.*writeFile|tool.*editFile|exec_command|done.*finalText" | tail -10`,
  ];

  let idx = 0;
  function runNext() {
    if (idx >= queries.length) { console.log(allOutput); c.end(); return; }
    c.exec(queries[idx], (err, stream) => {
      let out = "";
      stream.on("data", d => out += d);
      stream.stderr.on("data", d => out += d);
      stream.on("close", () => {
        allOutput += out + "\n";
        idx++;
        setTimeout(runNext, 1000);
      });
    });
  }
  runNext();
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 600000 });
