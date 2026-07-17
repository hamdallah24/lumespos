const { readFileSync } = require('fs');
const { Client } = require('ssh2');
const key = readFileSync('C:/Users/hamzy/.ssh/id_ed25519', 'utf8');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3333/api/stock-adjustments/cashier -H "Content-Type: application/json" -d "{}"', (err, stream) => {
    if (err) { console.error(err.message); conn.end(); return; }
    let out = '';
    stream.on('data', (d) => out += d);
    stream.on('close', () => { console.log('Status:', out); conn.end(); });
  });
}).connect({ host: '43.157.227.205', username: 'ubuntu', privateKey: key, timeout: 15000 });
