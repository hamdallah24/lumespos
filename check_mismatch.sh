#!/bin/bash
echo "=== Items in current_inventory but NO stock_card entries ==="
PGPASSWORD=lumes_qy7isq5j_Pos2024 psql -h localhost -U postgres -d sayq_pos -c "
SELECT ci.item_type, ci.item_id, 
  CASE WHEN ci.item_type = 'ingredient' THEN (SELECT name FROM ingredients WHERE id = ci.item_id)
       WHEN ci.item_type = 'semi_finished' THEN (SELECT name FROM semi_finished WHERE id = ci.item_id)
       ELSE '?' END as name,
  ci.current_stock,
  (SELECT COUNT(*) FROM stock_card sc WHERE sc.item_type = ci.item_type AND sc.item_id = ci.item_id AND sc.branch_id = ci.branch_id) as stock_card_count
FROM current_inventory ci
WHERE ci.branch_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM stock_card sc 
    WHERE sc.item_type = ci.item_type 
      AND sc.item_id = ci.item_id 
      AND sc.branch_id = ci.branch_id
  )
ORDER BY ci.item_type, ci.item_id;
"

echo ""
echo "=== Items with NEGATIVE stock in current_inventory ==="
PGPASSWORD=lumes_qy7isq5j_Pos2024 psql -h localhost -U postgres -d sayq_pos -c "
SELECT ci.item_type, ci.item_id,
  CASE WHEN ci.item_type = 'ingredient' THEN (SELECT name FROM ingredients WHERE id = ci.item_id)
       WHEN ci.item_type = 'semi_finished' THEN (SELECT name FROM semi_finished WHERE id = ci.item_id)
       ELSE '?' END as name,
  ci.current_stock
FROM current_inventory ci
WHERE ci.branch_id = 1 AND ci.current_stock < 0
ORDER BY ci.item_type, ci.item_id;
"
