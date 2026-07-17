import pg from 'pg';
const { Client } = pg;
const c = new Client(process.env.DATABASE_URL);
await c.connect();
try {
  // Exact same query as what the app sends
  const r = await c.query({
    text: `insert into "order_items" ("id", "order_id", "product_id", "product_variant_id", "product_name", "quantity", "price_at_sale", "subtotal") values (default, $1, $2, $3, $4, $5, $6, $7) returning id`,
    values: [451, null, null, 'tth matcha', 1, '2000', '2000']
  });
  console.log('SUCCESS, id:', r.rows[0].id);
  // Rollback
  await c.query('DELETE FROM order_items WHERE id = $1', [r.rows[0].id]);
} catch (e) {
  console.error('FAILED:', e.message);
}
await c.end();
