const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = 'psql "$DATABASE_URL" -c "ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL;"';
  console.log('Running:', cmd);
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('exec err:', err); conn.end(); return; }
    let out = '', errOut = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { errOut += d.toString(); });
    stream.on('close', () => {
      if (out) console.log('STDOUT:', out);
      if (errOut) console.log('STDERR:', errOut);
      conn.end();
    });
  });
}).connect({
  host: '43.157.227.205',
  username: 'ubuntu',
  privateKey: require('fs').readFileSync('C:/Users/hamzy/.ssh/id_rsa')
});
