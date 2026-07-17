const { readFileSync } = require('fs');
const { Client } = require('ssh2');
const key = readFileSync('C:/Users/hamzy/.ssh/id_ed25519', 'utf8');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /home/ubuntu/lumespos/artifacts/api-server/.env 2>/dev/null || echo "NOFILE"', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '', errOut = '';
    stream.on('data', (d) => out += d);
    stream.stderr.on('data', (d) => errOut += d);
    stream.on('close', () => {
      console.log('STDOUT:', out);
      if (errOut) console.log('STDERR:', errOut);
      conn.end();
    });
  });
}).connect({ host: '43.157.227.205', username: 'ubuntu', privateKey: key, readyTimeout: 10000 });
