const { Client } = require('pg');
const c = new Client(process.env.DATABASE_URL);
c.connect()
  .then(() => c.query("SELECT is_nullable FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_id'"))
  .then(r => { console.log('is_nullable:', r.rows[0].is_nullable); c.end(); })
  .catch(e => { console.error(e.message); c.end(); });
