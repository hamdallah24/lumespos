const { readFileSync } = require('fs');
const { Client } = require('ssh2');
const key = readFileSync('C:/Users/hamzy/.ssh/id_ed25519', 'utf8');
const conn = new Client();
conn.on('ready', () => {
  const cmds = [
    'grep -n "isCashier\\|Bahan Baku\\|Setengah Jadi\\|Produksi\\|stok" /home/ubuntu/lumespos/artifacts/pos-app/src/pages/inventory.tsx | head -20',
    'head -70 /home/ubuntu/lumespos/artifacts/pos-app/src/pages/inventory.tsx',
  ];
  let i = 0;
  function runNext() {
    if (i >= cmds.length) { conn.end(); return; }
    conn.exec(cmds[i], (err, stream) => {
      if (err) { console.error(err.message); i++; runNext(); return; }
      let out = '';
      stream.on('data', (d) => out += d);
      stream.on('close', () => {
        console.log('=== ' + i + ' ===');
        console.log(out.substring(0, 1000));
        i++;
        runNext();
      });
    });
  }
  runNext();
}).connect({ host: '43.157.227.205', username: 'ubuntu', privateKey: key, timeout: 15000 });
