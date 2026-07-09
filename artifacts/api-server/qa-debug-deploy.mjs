import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Add debug logging directly in dist/index.mjs around the delegation line
  const cmds = [
    // Replace delegation line with debug version in the bundle
    `sed -i 's/const delegationLine = isDelegated/console.log("[DELEGATION_DEBUG] pipeline=",JSON.stringify(pipeline)," isMissionQuery=",isMissionQuery," isDelegated=",isDelegated); const delegationLine = isDelegated/' /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs`,
    `pm2 restart pos-api --update-env`,
    `sleep 3`,
    `echo "--- restart done ---"`,
  ].join("; ");
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
