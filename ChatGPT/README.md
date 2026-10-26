# Distributed Generative AI & LLM Inference Architecture (e.g., ChatGPT, Claude)

## 1. Overview
A **Generative AI Chat & LLM Inference Platform** serves Large Language Models (LLMs) to tens of millions of concurrent users, supporting real-time streaming token generation (Server-Sent Events), continuous batching, KV caching, GPU cluster orchestration, multi-turn conversational context management, and guardrails.

---

## 2. Requirements

### Functional Requirements
- **Conversational Chat**: Multi-turn dialogue with history retention and context compression.
- **Streaming Response**: Real-time token-by-token streaming (Time-to-First-Token < 500ms).
- **Tool Calling / Function Calling**: Model dynamically selects and invokes external APIs (calculators, web search, code interpreters).
- **Safety & Moderation Guardrails**: Input/output filtering to detect toxic prompts, prompt injections, and PII leaks.
- **Session & Conversation Management**: Create, list, fork, and rename conversation threads.

### Non-Functional Requirements
- **Low Latency**:
  - Time-to-First-Token (TTFT): $< 500\text{ms}$.
  - Inter-Token-Latency (ITL): $< 30\text{ms}$ per token.
- **High GPU Utilization & Throughput**: Maximize model FLOPS utilization (MFU) and batch concurrency across expensive GPU clusters (H100/A100).
- **Scalability**: Handle 100,000+ concurrent active generation streams.
- **High Availability**: 99.95% system availability with automated GPU failure recovery.

---

## 3. Capacity Estimation

### Assumptions
- **Daily Active Users (DAU)**: 100 Million.
- **Prompts per User / Day**: 10 queries $\implies 1 \text{ Billion queries/day}$.
- **Average Ingestion QPS**: $\approx 11,500 \text{ QPS}$ (Peak: 40,000 QPS).
- **Average Prompt Length**: 500 tokens (Input).
- **Average Completion Length**: 300 tokens (Output).
- **GPU Cluster Sizing**:
  - A 70B parameter FP16 model requires $\approx 140 \text{ GB}$ VRAM $\implies$ minimum 2 $\times$ 80GB H100 GPUs per model instance (via Tensor Parallelism $TP=2$ or $TP=4$).
  - At 40,000 peak QPS with continuous batching, cluster requires several thousand GPUs load-balanced dynamically.

---

## 4. High-Level Architecture (HLD)

```mermaid
graph TD
    Client[Web UI / Mobile App / API Client] -->|HTTPS / SSE (Server-Sent Events)| CDN[Edge CDN / WAF]
    CDN --> API_GW[API Gateway & Rate Limiter]

    subgraph Orchestration & Guardrails
        API_GW --> GuardrailsIn[Input Moderation / Prompt Injection Detector]
        GuardrailsIn --> ContextManager[Context Assembly & History Manager]
        ContextManager --> ConvDB[(Conversation History DB: PostgreSQL / Cassandra)]
        ContextManager --> VectorDB[(Vector DB: Pinecone / Milvus for RAG)]
        ContextManager --> Router[LLM Inference Router / Load Balancer]
    end

    subgraph Distributed GPU Inference Engine (vLLM / TensorRT-LLM / Triton)
        Router --> GPUNode1[GPU Worker Node 1: vLLM (TP=4 / PP=2)]
        Router --> GPUNode2[GPU Worker Node 2: vLLM (TP=4 / PP=2)]
        
        GPUNode1 <--> PagedKVCache[(PagedAttention KV Cache: GPU HBM Memory)]
        GPUNode2 <--> PagedKVCache
    end

    subgraph Output Streaming & Post-Processing
        GPUNode1 -->|Token Stream| GuardrailsOut[Output Moderation & Filter]
        GuardrailsOut -->|SSE HTTP Stream| Client
        GPUNode1 -->|Async Log| ConvDB
    end
```

---

## 5. Architectural Deep Dives

### 5.1 LLM Inference Lifecycle: Prefill vs. Decode Phase
LLM generation consists of two fundamentally distinct computational phases:

```
1. Prefill (Prompt Processing) Phase:
   • Compute-bound: Processes all prompt tokens in parallel using matrix multiplications (GEMM).
   • Generates the initial Key-Value (KV) cache for prompt tokens.
   • Determines Time-To-First-Token (TTFT).

2. Decode (Token Generation) Phase:
   • Memory-bandwidth-bound: Generates tokens autoregressively 1 by 1.
   • Reads large KV cache from high-bandwidth memory (HBM) for every single generated token.
   • Determines Inter-Token-Latency (ITL).
```

### 5.2 Optimizations: PagedAttention & Continuous Batching (vLLM)
- **Continuous (Iteration-Level) Batching**:
  - Traditional batching waits for the slowest request in the batch to finish.
  - Continuous batching immediately inserts newly arrived requests into the running batch at every decoding step and ejects finished requests as soon as they emit an `[EOS]` token.
- **PagedAttention (KV Cache Virtual Memory)**:
  - Traditional KV allocation causes up to 60–80% memory fragmentation.
  - PagedAttention divides the KV cache into fixed-size virtual memory pages (e.g., 16 tokens per block) stored in non-contiguous physical GPU memory, boosting GPU concurrency by $4\times$.

```
Virtual Memory Tokens: [T0, T1 ... T15] ──► Physical GPU Memory Block 4
                       [T16 ... T31]   ──► Physical GPU Memory Block 12 (Non-contiguous)
```

### 5.3 Streaming Tokens: Server-Sent Events (SSE)
- Standard HTTP request-response forces the user to wait 10–30 seconds for the entire 500-word response.
- **Server-Sent Events (`text/event-stream`)**:
  - HTTP connection remains open.
  - Server pushes each generated token immediately to the browser over the event stream.

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"token": "System"}

data: {"token": " Design"}

data: {"token": " is"}

data: [DONE]
```

### 5.4 Context Window Management & History Compression
- When conversation length exceeds the model context window (e.g., 128k tokens):
  - **Sliding Window**: Retain the last $N$ turns + System Prompt.
  - **Hierarchical Summarization**: Periodically summarize older conversation turns using a smaller, fast LLM model and inject the summary into the context header.

---

## 6. Database Schema Design

```sql
CREATE TABLE conversation_sessions (
    session_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) DEFAULT 'New Chat',
    model_name VARCHAR(64) NOT NULL, -- 'gpt-4o', 'claude-3-5-sonnet'
    system_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
    message_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES conversation_sessions(session_id),
    role VARCHAR(16) NOT NULL, -- 'system', 'user', 'assistant', 'tool'
    content TEXT NOT NULL,
    tokens_count INT NOT NULL,
    model_metadata JSONB, -- { "temperature": 0.7, "finish_reason": "stop" }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_session_messages ON messages(session_id, created_at ASC);
```

---

## 7. Key Takeaways
- Decouple **Prefill (Compute-heavy)** and **Decode (Memory-bandwidth-heavy)** phases for optimal GPU utilization.
- Adopt **Continuous Batching** and **PagedAttention** (vLLM / TensorRT-LLM) to maximize throughput per GPU.
- Deliver real-time perceived performance via **Server-Sent Events (SSE)** token streaming.
