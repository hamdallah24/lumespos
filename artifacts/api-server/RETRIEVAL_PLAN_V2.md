# RetrievalPlan v2 — Execution Contract

## Status: Accepted (Rev 2)


## Filosofi

RetrievalPlan v2 memperlakukan perencanaan retrieval sebagai **Execution Contract** antara Planner dan Grounding.

Bukan sekadar daftar "apa yang perlu diambil", tetapi **perintah eksekusi lengkap** yang mencakup:

| Dimensi | Makna |
|---|---|
| **Apa** | Provider mana yang harus dieksekusi? |
| **Bagaimana** | Timeout, retry, cache policy, limits? |
| **Kapan** | Dependency graph — task mana harus selesai dulu? |
| **Prioritas** | Critical, high, medium, low? |
| **Biaya** | Estimasi latency, token, api calls? |
| **Jika gagal** | Ignore, retry, degrade, atau abort? |

### Prinsip utama

**Planner memutuskan, Grounding mengeksekusi.**

Grounding Layer tidak boleh membuat keputusan sendiri tentang:

- Prioritas (Planner yang menentukan)
- Dependency (Planner yang menentukan)
- Timeout (Planner yang menentukan)
- Cache policy (Planner yang menentukan)
- Failure policy (Planner yang menentukan)

Grounding Layer hanya bertanggung jawab pada:

- Scheduling eksekusi berdasarkan dependency graph
- Timeout enforcement
- Retry sesuai konfigurasi task
- Cache lookup + store
- Provider execution
- Evidence collection


## Sebelum (v1)

```typescript
interface RetrievalPlan {
  knowledgeNeeds: RetrievalRequest[];
  repositoryNeeds: RepositoryRequest[];
  // ... 5 array terpisah
}

interface RetrievalRequest {
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  // tidak ada timeout, cost, failure policy
}

class GroundingLayer {
  // HARUS membuat keputusan sendiri:
  partitionByPriority();  // Planner tidak bilang prioritas
  executeHighPriority();  // Grounding menentukan sendiri
  executeWithConcurrency(); // Grounding menentukan strategi
}
```

Masalah: Grounding Layer melanggar SRP karena harus memahami dan memutuskan prioritas, dependency, dan strategi eksekusi.


## Sesudah (v2)

```typescript
interface RetrievalPlan {
  tasks: RetrievalTask[];   // unified — semua provider
  executionGraph: ExecutionGraph;  // untuk executive flow
  toolNeeds: ToolRequest[];       // untuk executive tool routing
}

interface RetrievalTask {
  id: string;
  provider: 'operational' | 'memory' | 'knowledge' | 'metadata' | 'repository';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependency: string[];      // task IDs yang harus selesai duluan
  reason: string;            // kenapa task ini diperlukan
  request: unknown;           // provider-specific request object
  timeout: number;            // ms
  estimatedLatency: number;   // ms
  estimatedCost: {
    latency: number;          // estimated ms
    tokens: number;           // estimated tokens
    apiCalls: number;         // estimated API calls
  };
  cachePolicy: 'allow' | 'refresh' | 'bypass';
  failurePolicy: 'ignore' | 'retry' | 'degrade' | 'abort';
  required: boolean;
  limits?: {
    maxSize?: string;          // e.g., "1MB"
    retries?: number;          // max retry attempts
    maxTokens?: number;
  };
}

class GroundingLayer {
  // TIDAK membuat keputusan sendiri:
  execute(tasks: RetrievalTask[]): Promise<GroundingResult> {
    // 1. Resolve dependency graph → execution layers
    // 2. Execute per layer (parallel in-layer, sequential across layers)
    // 3. Enforce timeout per task
    // 4. Apply failurePolicy per task
    // 5. Collect evidence
  }
}
```


## Data Flow

```
Planner (LLM)
    │
    │  "Saya perlu repository file X (critical, timeout 2s,
    │   retry 1, cache allow, dependency [] )"
    │
    ▼
RetrievalPlan { tasks: RetrievalTask[] }
    │
    ▼
GroundingLayer.execute(tasks)
    │
    ├── Resolve dependency levels
    ├── Level 0: [taskA, taskB] → Promise.all (parallel)
    │     ├── taskA: enforce timeout, retry, cache
    │     ├── taskB: enforce timeout, retry, cache
    ├── Level 1: [taskC] → (depends on taskA)
    │     └── taskC: enforce timeout, retry, cache
    │
    ▼
GroundingResult + Evidence[]
```


## Failure Policy

| Policy | Perilaku |
|---|---|
| `ignore` | Gagal → catat error, lanjut task lain |
| `retry` | Gagal → retry sesuai `limits.retries`, lalu `ignore` jika tetap gagal |
| `degrade` | Gagal → turunkan confidence, lanjut dengan data parsial |
| `abort` | Gagal → batalkan semua task yang depend on this |


## Cache Policy

| Policy | Perilaku |
|---|---|
| `allow` | Cek cache dulu, pakai jika ada |
| `refresh` | Abaikan cache, eksekusi provider, simpan hasil baru |
| `bypass` | Abaikan cache, jangan simpan hasil |


## Benefit

1. **SRP terpenuhi**: Planner = decision maker, Grounding = executor
2. **Observability**: Setiap task punya id unik, cost estimasi, timeout — trace jadi lebih informatif
3. **Resilience**: Failure policy memungkinkan grounding bereaksi sesuai skenario tanpa logic cabang
4. **Optimization**: Estimated cost memungkinkan budget enforcement sebelum eksekusi
5. **Testability**: Grounding bisa di-test tanpa LLM — cukup beri task list dan verifikasi hasil
6. **Backward compatibility**: `toolNeeds` dan `executionGraph` tetap di `RetrievalPlan` untuk executive routing


## Integrasi dengan Verification (Rev 4)

Verification Engine nantinya bisa memanfaatkan:

| Field | Untuk verifikasi |
|---|---|
| `failurePolicy` | Apakah task gagal sesuai policy? |
| `required` | Apakah task yang required berhasil? |
| `timeout` | Apakah task timeout mempengaruhi confidence? |
| `dependency` | Apakah rantai dependency intact? |
| `estimatedCost` | Apakah actual cost sesuai estimasi? |
