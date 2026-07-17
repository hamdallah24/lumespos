import pg from 'pg';
const { Client } = pg;
const c = new Client(process.env.DATABASE_URL);
await c.connect();
try {
  const r = await c.query(
    "INSERT INTO order_items (order_id, product_id, product_variant_id, product_name, quantity, price_at_sale, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
    [1, null, null, 'test manual', 1, '1000', '1000']
  );
  console.log('Inserted id:', r.rows[0].id);
  // Clean up
  await c.query("DELETE FROM order_items WHERE id = $1", [r.rows[0].id]);
} catch (e) {
  console.error('Error:', e.message);
}
await c.end();
