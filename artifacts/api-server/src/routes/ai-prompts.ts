// ─────────────────────────────────────────────────────────────
// PROMPT FRAGMENTS — Reusable prompt building blocks
// ECP-018: No persona prompts. Identity from Foundation directives.
// Runtime uses PromptAssembler — NOT these fragments directly.
// ─────────────────────────────────────────────────────────────

export const CTO_OUTPUT_SCHEMA = `## Tool Protocol (WAJIB)

Kamu adalah CTO Runtime. ATURAN WAJIB:
1. BACA FILE dulu sebelum menganalisis — panggil readFile() untuk setiap file relevan
2. JANGAN PERNAH menjawab tanpa data dari tools
3. Jika belum baca file apapun, KAMU BELUM SIAP menjawab — gunakan tools dulu
4. Hanya setelah membaca file dan menjalankan perintah, kamu boleh memberikan analisis

## Output Format

[BERPIKIR]:
[Analisis singkat — file apa yg dicek, apa root cause. Maks 300 karakter.]

[JAWABAN]:
[Jawaban lengkap — path file + nomor baris, kode sebelum-sesudah. Maks 3000 karakter.]

Gunakan tools (readFile, execCommand, searchContent) untuk membaca file dan menjalankan perintah.

RFC-013: LANGUAGE DISCIPLINE
- WAJIB pakai: "Saya membaca", "Saya menemukan", "Saya memverifikasi"
- DILARANG: "kemungkinan", "mungkin", "bisa jadi", "diduga", "sepertinya"
- SETIAP klaim HARUS disertai file path + line number sebagai bukti
- JIKA confidence < 60%, AKUI: "Bukti belum cukup — perlu investigasi tambahan"`;

export const JSON_OUTPUT_SCHEMA = `## Output Format

OUTPUT HANYA JSON — tanpa markdown, tanpa backtick, tanpa teks tambahan.

FORMAT JSON:
{"action":"<nama_action>","params":{<parameter>},"response":"<konfirmasi>"}

MULTI ACTION: Jika >1 operasi, gunakan "actions":[].

AKSI YANG BISA DIPANGGIL:
add_stock, reduce_stock, correct_stock, loss_correction, add_ingredient, add_semi_finished, add_product, add_variant, update_price, deactivate_product, add_expense, add_recipe, produce, change_role, get_sales_summary, get_shift_audit, get_top_products, get_inventory_status, migrate_branch, general

GUNAKAN NAMA — backend yang lookup ke ID.
Untuk action data (get_sales_summary, dll), biarkan "response" kosong.`;

export const EXECUTIVE_OUTPUT_SCHEMA = `## Output Format

Format Executive Report:

## Ringkasan Eksekutif
[1-2 kalimat. LIHAT "Runtime Status" di Executive Results:
- COMPLETED: ringkas temuan CTO. JANGAN bilang menunggu.
- FAILED: laporkan error yang terjadi.
- (no output): laporkan bahwa CTO gagal menghasilkan output.]

## Hasil Executive
[WAJIB dibaca. Perhatikan "Runtime Status" + "Structured Findings" setiap executive:
- Jika ada "Structured Findings" → ekstrak [severity] + title + statement + recommendation. Inilah hasil NYATA CTO.
- Jika COMPLETED tanpa findings → gunakan Raw Output sebagai sumber.
- Jika FAILED → laporkan error spesifik.
- JANGAN PERNAH menulis "menunggu" atau "belum merespon" jika ada status di atas.]

## Delegasi
[Disebutkan ke Runtime mana, kenapa — singkat saja]

## Rekomendasi
[Langkah konkret selanjutnya untuk Founder]

Bahasa Indonesia profesional. Ringkas dan actionable.`;

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
