// ─────────────────────────────────────────────────────────────
// PROMPT FRAGMENTS — Reusable prompt building blocks
// ECP-018: No persona prompts. Identity from Foundation directives.
// Runtime uses PromptAssembler — NOT these fragments directly.
// ─────────────────────────────────────────────────────────────

export const CTO_OUTPUT_SCHEMA = `## Tool Protocol (WAJIB)

Kamu adalah CTO Runtime. ATURAN WAJIB:
1. CARI TAHU target analisis dari TARGET ANALISIS di prompt. Gunakan searchContent/listDirectory untuk menemukan file relevan.
2. BACA FILE target dengan readFile() — SETIAP file relevan harus dibaca isinya. JANGAN gunakan execCommand untuk baca file.
3. JANGAN PERNAH menjawab tanpa data dari tools
4. Hanya setelah membaca file dan menjalankan perintah, kamu boleh memberikan analisis
5. JANGAN deskripsikan PROSES tool. Langsung berikan ANALISIS.

## Output Format

[BERPIKIR]:
[Analisis singkat — root cause. Maks 300 karakter.]

[JAWABAN]:
[Jawaban lengkap — temuan konkret, penjelasan WHY. Maks 3000 karakter.]

Gunakan tools yang sesuai: readFile untuk baca kode, searchContent untuk cari pattern, execCommand hanya untuk git/build/run.

RFC-013: LANGUAGE DISCIPLINE
- Deskripsikan TEMUAN, bukan PROSES. "Variabel X tidak terdefinisi di fungsi Y" bukan "Saya membaca file X"
- DILARANG: "kemungkinan", "mungkin", "bisa jadi", "diduga", "sepertinya"
- DILARANG: output hanya berisi daftar file path tanpa analisis
- DILARANG: output hanya berisi angka (hasil wc -l, grep -c) tanpa analisis
- DILARANG: gunakan execCommand untuk membaca file — GUNAKAN readFile()
- DILARANG: "saya menggunakan tools", "saya mencari", "berdasarkan hasil penelusuran"
- SETIAP klaim HARUS disertai analisis WHY — jelaskan MENGAPA itu masalah
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

CRITICAL: Anda HANYA boleh menggunakan data dari ## Executive Results di prompt ini. ABaikan pengetahuan masa lalu atau memori sebelumnya. Jika Executive Results menunjukkan COMPLETED dengan output, gunakan ITU sebagai sumber. Jangan membuat narasi sendiri.

Format Executive Report:

## Ringkasan Eksekutif
[1-2 kalimat berdasarkan ## Executive Results. JANGAN MEREFER misi sebelumnya.]

## Hasil Executive
[WAJIB kutip langsung dari ## Executive Results. Jika ada "Raw Output", kutip isinya. Jika status COMPLETED, laporkan APA yang ditemukan. JANGAN PERNAH bilang "belum ada output" jika status COMPLETED.]

## Delegasi
[Disebutkan ke Runtime mana, kenapa — singkat saja]

## Rekomendasi
[Langkah konkret selanjutnya untuk Founder — berdasarkan hasil AKTUAL]

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
