import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`PGPASSWORD=river-86%-falcon psql -h 43.157.227.205 -U ubuntu -d postgres -c "SELECT id, email, role FROM users ORDER BY id LIMIT 10;" 2>&1 || node -r dotenv/config -e "
const{Client}=require('pg');
const c=new Client({connectionString:process.env.DATABASE_URL});
c.connect().then(()=>c.query('SELECT id,email,role FROM users ORDER BY id LIMIT 10').then(r=>console.log(JSON.stringify(r.rows,null,2))).catch(e=>console.log('ERR:',e.message)).finally(()=>c.end()))
" 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
