// Fix Stage 4 Workflow — applies all 7 edits
const fs = require('fs');

const wf = JSON.parse(fs.readFileSync(__dirname + '/n8n-workflows/0-ORIGINAL-Stage4.json', 'utf8'));

// EDIT 1: Normalize Input — change min char 5 → 3
const ni = wf.nodes.find(n => n.id === '347407e8-cd7e-47f6-94aa-3062cc34f464');
if (ni) {
  ni.parameters.jsCode = ni.parameters.jsCode.replace(/length < 5/, 'length < 3');
  ni.name = 'Normalize Input (min 3)';
}

// EDIT 2: Model tiering — Intent Parser flash, Analyzer flash, Generator stays pro
const intentParser = wf.nodes.find(n => n.id === '2dcbb0c0-b25e-495f-b480-be57ba8497a1');
if (intentParser && intentParser.parameters.model) {
  intentParser.parameters.model.value = 'deepseek-v4-flash';
  intentParser.parameters.model.cachedResultName = 'DEEPSEEK-V4-FLASH';
  intentParser.name = 'Intent Parser (Flash)';
}

const aiAnalyzer = wf.nodes.find(n => n.id === '6f79d210-e4a0-4c15-8123-cc611ac90cf4');
if (aiAnalyzer && aiAnalyzer.parameters.model) {
  aiAnalyzer.parameters.model.value = 'deepseek-v4-flash';
  aiAnalyzer.parameters.model.cachedResultName = 'DEEPSEEK-V4-FLASH';
  aiAnalyzer.name = 'AI Analyzer (Flash)';
}

// EDIT 3: Delete 5 unused diagnostic nodes
const deleteIds = [
  '0658982b-c377-4b20-8b4c-7e1c047f0e1b', // Normalize Input1
  '81ccff2f-e4a9-4e0e-8ab3-9c24b1986cdf', // Parse Generator Output1
  '2a9be7bb-2f74-4a6d-a692-9f19a50dc0bd', // Prepare Repair Attempt1
  'ec9911b3-c889-4f53-969c-f6fda27fa4bb', // Prepare Repair Attempt2
  '6d57952d-9626-454a-8507-69c76dd0f533', // Parse Analyzer Output1
];

wf.nodes = wf.nodes.filter(n => !deleteIds.includes(n.id));

// Remove connections referencing deleted nodes
for (const key of Object.keys(wf.connections)) {
  for (const type of Object.keys(wf.connections[key])) {
    wf.connections[key][type] = wf.connections[key][type].filter(arr => {
      return !arr.some(conn => deleteIds.includes(conn.node));
    });
    if (wf.connections[key][type].length === 0) {
      delete wf.connections[key][type];
    }
  }
}

// EDIT 4: IF Direct Hit? (second one) — fix type mismatch
const ifDirectHit2 = wf.nodes.find(n => n.id === '3ec12a39-360d-439c-8ea3-260703c6dfbc');
if (ifDirectHit2 && ifDirectHit2.parameters.conditions) {
  ifDirectHit2.parameters.conditions.conditions[0].operator.type = 'boolean';
  ifDirectHit2.parameters.conditions.conditions[0].operator.operation = 'true';
  ifDirectHit2.parameters.conditions.conditions[0].rightValue = true;
  delete ifDirectHit2.parameters.conditions.conditions[0].rightValue;
  // Fix: change to boolean is true
  ifDirectHit2.parameters.conditions.options.typeValidation = 'strict';
  ifDirectHit2.parameters.conditions.conditions = [
    {
      id: "cond-fixed",
      leftValue: "={{ $json.skip_analyzer }}",
      rightValue: true,
      operator: { type: "boolean", operation: "true" }
    }
  ];
  ifDirectHit2.name = 'IF Skip Analyzer? (FIXED)';
}

// EDIT 5: Add Truncate Large Files node
const truncNode = {
  parameters: {
    jsCode: 'const i=$input.first().json;\nconst files=i.fetched_files||{};\nconst MAX=250;\nconst tr={};\nfor(const[p,c]of Object.entries(files)){\n  const l=String(c).split("\\n");\n  if(l.length>MAX)tr[p]=[...l.slice(0,150),\n`/* ... ${l.length-MAX} lines truncated ... */\n`,...l.slice(-100)].join("\\n");\n  else tr[p]=c;\n}\nreturn[{json:{...i,fetched_files:tr}}];'
  },
  id: 'trunc-large-files-v3',
  name: 'Truncate Large Files',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-2080, 3984]
};
wf.nodes.push(truncNode);

// Update connections: Init Generator Loop → Truncate → Build Generator Context
const iglId = 'e740346a-d7cd-4abb-98e9-d70310305156';
const bgcId = '1fb7e9d6-05eb-424f-8474-21e587c15df4';

if (wf.connections[iglId]) {
  wf.connections[iglId] = { main: [[{ node: 'Truncate Large Files', type: 'main', index: 0 }]] };
}
wf.connections['Truncate Large Files'] = { main: [[{ node: 'Build Generator Context', type: 'main', index: 0 }]] };

// EDIT 6: Fix IF Direct Hit Path? — already boolean correct, just rename
const ifDirectHitPath = wf.nodes.find(n => n.id === '4d8d36dc-9227-4309-882b-4fc666a2f93b');
if (ifDirectHitPath) {
  ifDirectHitPath.name = 'IF Direct Hit Path? (FIXED)';
}

// EDIT 7: Add Guardline Telegram message before commit
const guardNode = {
  parameters: {
    chatId: '={{ $json.chat_id || $json.telegram_chat_id || "7218843690" }}',
    text: '=📋 PROPOSAL PERUBAHAN\n\nFile yang akan di-commit:\n{{ JSON.stringify(Object.keys($json.patched_files||{}),null,2) }}\n\nPerubahan: {{ $json.clarified_intent }}\n\n⚠️ Lanjutkan commit? Balas: SETUJU / TIDAK SETUJU',
    additionalFields: {}
  },
  id: 'guard-proposal-tg',
  name: 'Send Proposal to User',
  type: 'n8n-nodes-base.telegram',
  typeVersion: 1.2,
  position: [-784, 3744],
  webhookId: 'guard-proposal-webhook',
  credentials: { telegramApi: { id: 'A4JQuid6W9BzisPl', name: 'Telegram Bot' } }
};
wf.nodes.push(guardNode);

// Wire: IF Valid? (true) → Send Proposal instead of Prepare Commit Items
const ifValidId = '290891b7-9989-4edf-a2d7-09ba25ceca1d';
const pciId = '98f2ab0b-36d4-4a9f-a542-63309d204fd7';
if (wf.connections[ifValidId] && wf.connections[ifValidId].main) {
  // Change first output (true branch) to go to guard proposal
  wf.connections[ifValidId].main[0] = [{ node: 'Send Proposal to User', type: 'main', index: 0 }];
}
wf.connections['Send Proposal to User'] = { main: [[{ node: 'Prepare Commit Items', type: 'main', index: 0 }]] };

// Update name
wf.name = 'Code Generator Stage 4 - Lume POS (FIXED + GUARDLINE)';
wf.versionId = 'v3-fixed-guardline';
wf.id = '86eCJ8nbprRs0CUW-v3';

// Write
const outPath = __dirname + '\\n8n-workflows\\3-Code-Generator-Stage4-FIXED.json';
fs.writeFileSync(outPath, JSON.stringify(wf, null, 2));
console.log('Saved:', outPath);
console.log('Nodes:', wf.nodes.length);
