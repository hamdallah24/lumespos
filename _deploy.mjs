import { readFileSync } from 'fs';
import { Client } from 'ssh2';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const key = readFileSync('C:/Users/hamzy/.ssh/id_ed25519', 'utf8');
const projectDir = path.resolve(__dirname);
const distDir = path.join(projectDir, 'artifacts', 'pos-app', 'dist', 'public');

console.log('Building tar...');
execSync(`tar -czf /tmp/pos-app-dist.tar.gz -C "${path.join(distDir)}" .`, { stdio: 'inherit' });
console.log('Done building tar');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected');
  // Upload
  conn.sftp((err, sftp) => {
    if (err) { console.error(err); conn.end(); return; }
    sftp.fastPut('/tmp/pos-app-dist.tar.gz', '/tmp/pos-app-dist.tar.gz', (err) => {
      if (err) { console.error(err); conn.end(); return; }
      console.log('Uploaded tar');
      conn.exec('cd /home/ubuntu/lumespos/artifacts/pos-app/dist/public && tar -xzf /tmp/pos-app-dist.tar.gz && rm /tmp/pos-app-dist.tar.gz && echo "Deployed"', (err2, stream) => {
        if (err2) { console.error(err2); conn.end(); return; }
        stream.on('data', (d) => process.stdout.write(d));
        stream.stderr.on('data', (d) => process.stderr.write(d));
        stream.on('close', () => conn.end());
      });
    });
  });
}).connect({ host: '43.157.227.205', username: 'ubuntu', privateKey: key, readyTimeout: 10000 });
