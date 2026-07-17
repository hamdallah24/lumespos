import pg from 'pg';
const { Client } = pg;
const c = new Client(process.env.DATABASE_URL);
await c.connect();
try {
  await c.query('BEGIN');
  const o = await c.query(
    `insert into "orders" ("branch_id", "cashier_name", "total", "total_cogs", "amount_paid", "change", "payment_method", "status") values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [1, 'test', '2000', '0', '2000', '0', 'cash', 'completed']
  );
  const orderId = o.rows[0].id;
  console.log('Order created:', orderId);
  
  const r = await c.query({
    text: `insert into "order_items" ("id", "order_id", "product_id", "product_variant_id", "product_name", "quantity", "price_at_sale", "subtotal") values (default, $1, $2, $3, $4, $5, $6, $7) returning id`,
    values: [orderId, null, null, 'tth matcha', 1, '2000', '2000']
  });
  console.log('Order item created:', r.rows[0].id);
  
  await c.query('ROLLBACK');
  console.log('SUCCESS - rolled back');
} catch (e) {
  await c.query('ROLLBACK');
  console.error('FAILED:', e.message);
}
await c.end();
