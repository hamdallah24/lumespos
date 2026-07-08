import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`cd /home/ubuntu/lumespos/artifacts/api-server && node -e "
    const https = require('https');
    const u = process.env.DATABASE_URL;
    if (!u) { console.log('NO URL'); process.exit(1); }
    
    // Try Neon Postgres directly using tls
    const { connect } = require('tls');
    const url = new URL(u);
    const host = url.hostname;
    const port = 5432;
    const user = url.username;
    const pw = url.password;
    const db = url.pathname.substring(1);
    
    console.log('Trying direct TLS to', host + ':' + port);
    const opts = { host, port, rejectUnauthorized: false };
    const sock = connect(opts, () => {
      console.log('Connected!');
      // StartupMessage
      const proto = 196608; // 3.0
      const params = { user, database: db };
      const paramStr = Object.entries(params).map(([k,v]) => k + '\\x00' + v).join('\\x00');
      const startup = Buffer.alloc(4 + 4 + paramStr.length + 1);
      startup.writeInt32BE(startup.length - 4, 0);
      startup.writeInt32BE(proto, 4);
      let off = 8;
      Object.entries(params).forEach(([k,v]) => {
        startup.write(k + '\\x00', off, 'utf8'); off += k.length + 1;
        startup.write(v + '\\x00', off, 'utf8'); off += v.length + 1;
      });
      startup.writeUInt8(0, off);
      sock.write(startup);
      
      let buf = Buffer.alloc(0);
      sock.on('data', d => {
        buf = Buffer.concat([buf, d]);
        // Try to read auth request
        if (buf.length >= 8) {
          const type = buf[0];
          const len = buf.readInt32BE(1);
          console.log('Msg type:', String.fromCharCode(type), 'len:', len);
          if (type === 82) {
            // AuthenticationRequest
            const authType = buf.readInt32BE(5);
            console.log('Auth type:', authType);
            if (authType === 5) {
              // MD5 - need to respond with md5(pw+user)
              const crypto = require('crypto');
              const md5inner = crypto.createHash('md5').update(pw + user).digest('hex');
              const md5final = 'md5' + crypto.createHash('md5').update(md5inner + db).digest('hex');
              const authResp = Buffer.alloc(4 + 4 + md5final.length + 1);
              authResp.writeInt32BE(authResp.length - 4, 0);
              authResp.writeInt32BE(5, 4);
              authResp.write(md5final + '\\x00', 8);
              sock.write(Buffer.concat([Buffer.from([112]), authResp]));
              console.log('Sent MD5 auth');
            } else if (authType === 0) {
              // Trust - no password needed
              const authResp = Buffer.alloc(4 + 4);
              authResp.writeInt32BE(8, 0);
              authResp.writeInt32BE(0, 4);
              sock.write(Buffer.concat([Buffer.from([112]), authResp]));
              console.log('Sent auth OK');
            } else if (authType === 3) {
              // Password
              const pwBuf = Buffer.alloc(4 + pw.length + 1);
              pwBuf.writeInt32BE(pwBuf.length - 4, 0);
              pwBuf.write(pw + '\\x00', 4);
              sock.write(Buffer.concat([Buffer.from([112]), pwBuf]));
              console.log('Sent cleartext password');
            }
          }
        }
      });
      sock.on('error', e => console.log('Sock err:', e.message));
    });
    sock.on('error', e => console.log('Conn err:', e.message));
    
    setTimeout(() => { console.log('Timeout'); sock.end(); process.exit(); }, 5000);
  " 2>&1`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => c.end()).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
