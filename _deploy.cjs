const { readFileSync } = require('fs');
const { Client } = require('ssh2');
const key = readFileSync('C:/Users/hamzy/.ssh/id_ed25519', 'utf8');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cd /home/ubuntu/lumespos && git pull 2>&1 && pnpm install 2>&1 && pnpm --filter ./artifacts/pos-app run build 2>&1 && pm2 restart lumes-pos-app 2>&1 && echo "DONE"', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '', errOut = '';
    stream.on('data', (d) => out += d);
    stream.stderr.on('data', (d) => errOut += d);
    stream.on('close', () => {
      if (out) console.log('OUT:', out);
      if (errOut) console.log('ERR:', errOut);
      conn.end();
    });
  });
}).connect({ host: '43.157.227.205', username: 'ubuntu', privateKey: key, readyTimeout: 30000 });
