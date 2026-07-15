// ─────────────────────────────────────────────────────────────
// PROMPT FRAGMENTS — Reusable prompt building blocks
// ECP-018: No persona prompts. Identity from Foundation directives.
// Runtime uses PromptAssembler — NOT these fragments directly.
// ─────────────────────────────────────────────────────────────

export const CTO_OUTPUT_SCHEMA = `## Teknis Analisis (WAJIB)

### CYCLE 1 - EXPLORE
Gunakan tools untuk baca file yang relevan. WAJIB readFile setelah search.

### CYCLE 2 - ANALYZE
Baca file secara detail dan pahami kode.

### CYCLE 3 - CONCLUDE
Beri analisis dengan struktur:
1. Root Cause — jelaskan penyebab masalah
2. Analisis Detail — untuk setiap file yang dibaca
3. Rekomendasi — langkah selanjutnya

### CYCLE 4 - IMPLEMENT (JIKA DIMINTA)
Hanya jika user meminta. WAJIB melalui CEO approval callback.

## ATURAN DISIPLIN BAHASA
- Deskripsikan TEMUAN berdasarkan FILE yang sudah dibaca
- Jangan mengarang analisis tanpa membaca file
- Jika file yang dibaca tidak relevan, katakan "File ini tidak terkait dengan masalah"
- DILARANG: "kemungkinan", "mungkin", "bisa jadi", "sepertinya"
- DILARANG: output hanya daftar file path tanpa analisis
- SETIAP klaim WAJIB berdasarkan konten file yang sudah diverifikasi
- JIKA tidak yakin, AKUI: "Data tidak cukup"`;

export const JSON_OUTPUT_SCHEMA = `## JSON Output Format

OUTPUT HANYA JSON — tanpa markdown, tanpa backtick, tanpa teks tambahan.

FORMAT JSON:
{"action":"<nama_action>","params":{<parameter>},"response":"<konfirmasi>"}

MULTI ACTION: Jika >1 operasi, gunakan "actions":[].

AKSI YANG BISA DIPANGGIL:
add_stock, reduce_stock, correct_stock, loss_correction, add_ingredient, add_semi_finished, add_product, add_variant, add_product_with_variants_and_recipe, add_recipe_by_name, update_recipe, update_price, update_variant_price, deactivate_product, add_expense, add_recipe, produce, change_role, get_sales_summary, get_shift_audit, get_top_products, get_inventory_status, migrate_branch

GUNAKAN NAMA (bukan ID) — backend akan lookup otomatis.

PARAMS YANG DIDUKUNG:
- add_product_with_variants_and_recipe: {name, variants: [{name, price}], recipe: [{name, quantity, unit?}]}
- add_recipe_by_name: {productName, ingredients: [{name, quantity, unit?}]}
- update_recipe: {productName, ingredients: [{name, quantity, unit?}]} — ganti total resep
- update_price: {productName, price}
- update_variant_price: {productName, variantName, price}
- deactivate_product: {productName}
- add_variant: {productName, variantName, price}
- add_stock: {itemName, qty, unit?, itemType?, price?} — unit otomatis dikonversi ke base unit ingredient
- reduce_stock: {itemName, qty, unit?, itemType?}
- correct_stock: {itemName, target, unit?, itemType?}
- loss_correction: {itemName, qty, unit?, itemType?}
- produce: {itemName, producedWeight} — produksi semi_finished, hitung HPP
- add_product: {name, price}
- add_ingredient: {name, unit?}
- add_semi_finished: {name, unit?, yieldQuantity?, yieldUnit?}
- add_expense: {description, amount}
- get_sales_summary: {period?: "today"|"week"|"month"}
- get_top_products: {limit?: number}
- get_inventory_status: {}
- get_shift_audit: {}
- migrate_branch: {sourceBranchName, targetBranchName}
Untuk action data (get_sales_summary, dll), biarkan "response" kosong.`;

export const EXECUTIVE_OUTPUT_SCHEMA = `## Output Format

### ATURAN WAJIB
- Data misi sudah diberikan di ## Executive Results. ITULAH DATANYA. Jangan bilang tidak punya data.
- Jangan bilang "tidak bisa mengakses DB" atau "tidak punya shared memory" — datanya sudah ada di prompt ini.
- Jangan bilang "confidence terlalu rendah". Jawab langsung.
- Jika user minta data misi tertentu, ambil dari Executive Results.

### Format Executive Report

## Ringkasan Eksekutif
[1-2 kalimat]

## Hasil Executive
[Kutip/tempel data dari Executive Results. Jika status COMPLETED, laporkan output CTO-nya.]

## Rekomendasi
[Langkah selanjutnya untuk Founder]

Bahasa Indonesia. Ringkas.`;

export const STREAM_POLICY = `## Streaming Rules

Always complete your full response before stopping. Never truncate.
- Analysis request → cover ALL findings explicitly
- Bug report → list every bug with full explanation
- Code explanation → explain until fully clear
- End your response only when the user request is 100% fulfilled`;

export const ERROR_POLICY = `## Anti-Halusinasi

JANGAN MENGARANG ANGKA tanpa data dari tool.
WAJIB BACA FILE sebelum klaim root cause.
JANGAN MENDIAGNOSIS TANPA DATA.
Hindari frasa spekulatif: "kemungkinan besar", "biasanya sih".
Kalau tidak tahu, bilang tidak tahu.`;
