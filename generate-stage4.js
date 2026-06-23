// Stage 4 JSON generator — run with: node generate-stage4.js
const fs = require('fs');
const path = require('path');

const js = (s) => s;

const workflow = {
  name: "Code Generator Stage 4 - Lume POS (FIXED)",
  nodes: [
    {
      parameters: { inputSource: "jsonExample", jsonExample: '{"user_message":"{{ $fromAI(\'user_message\') }}","repo_owner":"hamdallah24","repo_name":"pos-app","branch":"Staging","chat_id":"{{ $fromAI(\'chat_id\') }}"}' },
      type: "n8n-nodes-base.executeWorkflowTrigger", typeVersion: 1.2, position: [-3888, 4832],
      id: "s4-trigger", name: "When Executed by CTO Agent"
    },
    {
      parameters: { jsCode: js('const i=$input.first().json;\nif(!i.user_message||typeof i.user_message!=="string"||i.user_message.trim().length<3){throw new Error("user_message invalid (min 3 char):"+JSON.stringify(i));}\nreturn[{json:{user_message:i.user_message.trim(),repo_owner:i.repo_owner||"hamdallah24",repo_name:i.repo_name||"pos-app",branch:i.branch||"Staging",chat_id:i.chat_id||"7218843690",received_at:new Date().toISOString()}}];') },
      id: "s4-normalize", name: "Normalize Input (min 3)", type: "n8n-nodes-base.code", typeVersion: 2, position: [-3552, 4832]
    },
    {
      parameters: {
        model: { __rl: true, value: "deepseek-v4-flash", mode: "list", cachedResultName: "DEEPSEEK-V4-FLASH" },
        messages: { values: [
          { content: js('Kamu Intent Parser. Analisis pesan user output JSON rute.\n- route=direct_hit jika file SPESIFIK & perubahan JELAS\n- route=needs_analysis jika umum/ambigu\n- confidence=low paksa needs_analysis\n\nOutput ONLY JSON:\n{"route":"direct_hit|needs_analysis","confidence":"high|medium|low","target_file":null,"action_type":"update|create|delete|read_only","clarified_intent":"...","original_message":"..."}'), role: "system" },
          { content: "={{ $json.user_message }}", role: "user" }
        ]}, options: { temperature: 0.1 }
      },
      id: "s4-intent", name: "Intent Parser (Flash)", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1.3, position: [-3328, 4832],
      credentials: { openAiApi: { id: "a6DMiTwRmzjqacwH", name: "DeepSeek API" } }
    },
    {
      parameters: { jsCode: js('const r=$input.first().json.message?.content||$input.first().json.content||"";\nlet c=r.trim();c=c.replace(/^`{3}json\\s*/i,"").replace(/`{3}\\s*$/i,"");\nlet p;try{p=JSON.parse(c);}catch(e){const o=$("Normalize Input (min 3)").first().json;return[{json:{route:"needs_analysis",confidence:"low",target_file:null,action_type:"read_only",clarified_intent:o.user_message,original_message:o.user_message,repo_owner:o.repo_owner,repo_name:o.repo_name,branch:o.branch,chat_id:o.chat_id,parse_error:true}}];}\nconst o=$("Normalize Input (min 3)").first().json;\nreturn[{json:{route:p.route==="direct_hit"?"direct_hit":"needs_analysis",confidence:p.confidence||"low",target_file:p.target_file||null,action_type:p.action_type||"update",clarified_intent:p.clarified_intent||o.user_message,original_message:o.user_message,repo_owner:o.repo_owner,repo_name:o.repo_name,branch:o.branch,chat_id:o.chat_id,parse_error:false}}];') },
      id: "s4-parse-intent", name: "Parse Intent", type: "n8n-nodes-base.code", typeVersion: 2, position: [-2944, 4832]
    }
  ],
  connections: {
    "When Executed by CTO Agent": { main: [[{node:"Normalize Input (min 3)",type:"main",index:0}]] },
    "Normalize Input (min 3)": { main: [[{node:"Intent Parser (Flash)",type:"main",index:0}]] },
    "Intent Parser (Flash)": { main: [[{node:"Parse Intent",type:"main",index:0}]] }
  },
  active: true,
  settings: { executionOrder: "v1", binaryMode: "separate" },
  versionId: "v3-stage4",
  meta: { templateCredsSetupCompleted: true },
  id: "86eCJ8nbprRs0CUW-v3",
  tags: [{name:"code-gen",color:"#1565FF"}]
};

const outPath = path.join(__dirname, '..', 'n8n-workflows', '3-Code-Generator-Stage4.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2));
console.log("Written to", outPath);
