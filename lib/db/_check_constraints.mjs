import pg from 'pg';
const { Client } = pg;
const c = new Client(process.env.DATABASE_URL);
await c.connect();
try {
  // Check all constraints on order_items
  const r = await c.query(`
    SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) as def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'order_items'
  `);
  console.log('Constraints:', JSON.stringify(r.rows, null, 2));
  
  // Check column details
  const r2 = await c.query(`
    SELECT column_name, is_nullable, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'order_items'
    ORDER BY ordinal_position
  `);
  console.log('Columns:', JSON.stringify(r2.rows, null, 2));
} catch (e) {
  console.error('Error:', e.message);
}
await c.end();
