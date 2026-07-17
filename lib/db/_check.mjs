import pg from 'pg';
const { Client } = pg;
const c = new Client(process.env.DATABASE_URL);
await c.connect();
const r = await c.query("SELECT is_nullable FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_id'");
console.log('is_nullable:', r.rows[0].is_nullable);
await c.end();
