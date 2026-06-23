STAGE 4 EDITS — WHAT TO CHANGE IN YOUR EXISTING WORKFLOW
===========================================================

EDIT 1: Normalize Input — change min char 5 → 3
  Node: "Normalize Input" (ID: 347407e8-cd7e-47f6-94aa-3062cc34f464)
  In JavaScript Code, change:
    line: input.user_message.trim().length < 5
    to:   input.user_message.trim().length < 3


EDIT 2: IF Direct Hit?1 (first one) — route check is OK, no change needed
  Node: "IF Direct Hit?1" (ID: a48c3dde-79e3-495e-88ef-366fefb46a6a)
  This checks $json.route === "direct_hit" — correct, keep as is.


EDIT 3: IF Direct Hit? (second one) — FIX TYPE MISMATCH
  Node: "IF Direct Hit?" (ID: 3ec12a39-360d-439c-8ea3-260703c6dfbc)
  Position: [368, 4656]
  CURRENT:  skip_analyzer === "direct_hit" (string) → ALWAYS FALSE
  CHANGE TO: skip_analyzer is true (boolean)
  In n8n UI: delete the condition, add new condition:
    Type: Boolean, Value 1: {{ $json.skip_analyzer }}, Operation: "is true"


EDIT 4: Delete 5 unused diagnostic nodes
  Delete these nodes and reconnect the wires AROUND them:
  - "Normalize Input1" (ID: 0658982b-c377-4b20-8b4c-7e1c047f0e1b)
  - "Parse Generator Output1" (ID: 81ccff2f-e4a9-4e0e-8ab3-9c24b1986cdf)
  - "Prepare Repair Attempt1" (ID: 2a9be7bb-2f74-4a6d-a692-9f19a50dc0bd)
  - "Prepare Repair Attempt2" (ID: ec9911b3-c889-4f53-969c-f6fda27fa4bb)
  - "Parse Analyzer Output1" (ID: 6d57952d-9626-454a-8507-69c76dd0f533)

  Reconnect: Remove the broken wire paths.
  Route directly: Intent Parser → Parse Intent → IF Direct Hit?1 (skip the diagnostic nodes)


EDIT 5: Model tiering — change 2 nodes to flash
  Node: "Intent Parser (AI)" (ID: 2dcbb0c0-b25e-495f-b480-be57ba8497a1)
    Model: change from "deepseek-v4-pro" to "deepseek-v4-flash"

  Node: "AI Analyzer" (ID: 6f79d210-e4a0-4c15-8123-cc611ac90cf4)
    Model: already "deepseek-v4-flash" — keep

  Node: "Code Generator (AI)" (ID: d2433a05-26eb-4699-b7b7-04ddac11d7eb)
    Model: keep as "deepseek-v4-pro" (PRO ONLY for code gen)


EDIT 6: ADD NEW NODE — Truncate Large Files
  Add a new Code node between "Init Generator Loop" and "Build Generator Context"
  Position: [x: -2080, y: 3984]
  Name: "Truncate Large Files"

  JavaScript Code:
  -------------------------------------------------------------
  const input = $input.first().json;
  const files = input.fetched_files || {};
  const MAX = 250;
  const truncated = {};
  for (const [p, c] of Object.entries(files)) {
    const l = String(c).split('\n');
    if (l.length > MAX) {
      truncated[p] = [...l.slice(0, 150), `\n/* ... ${l.length - MAX} lines skipped ... */\n`, ...l.slice(-100)].join('\n');
    } else {
      truncated[p] = c;
    }
  }
  return [{ json: { ...input, fetched_files: truncated } }];
  -------------------------------------------------------------

  Connections:
    Old: Init Generator Loop → Build Generator Context
    New: Init Generator Loop → Truncate Large Files → Build Generator Context


EDIT 7: ADD GUARDLINE — Confirm Before Commit
  After "IF Valid?" (true branch) and BEFORE "Prepare Commit Items",
  add a Telegram message node that sends a proposal and waits for user reply.

  Node to add: "Kirim Proposal ke User" (Telegram)
    Chat ID: ={{ $json.chat_id || '7218843690' }}
    Text: =📋 RINGKASAN PERUBAHAN:
    File yang akan di-commit:
    {{ JSON.stringify(Object.keys($json.patched_files || {}), null, 2) }}
    Permintaan: {{ $json.clarified_intent }}
    Lanjutkan commit? Balas: SETUJU / TIDAK SETUJU

  Then add a "Wait for Confirmation" node (Webhook Trigger or Wait node)
  Then check reply == "SETUJU" via IF node → then route to "Prepare Commit Items"


OPTIONAL: Install SSH node in n8n
  n8n community node: n8n-nodes-ssh
  npm install n8n-nodes-base (already built-in)
  Or use "Execute Command" node if n8n runs on the same VPS
