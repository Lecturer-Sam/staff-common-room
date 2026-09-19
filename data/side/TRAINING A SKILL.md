# Training Time Estimates for a SKILL.md-Based Model

This is a critical question, and the answer depends heavily on **what you mean by "training."** There are three very different approaches, each with wildly different timescales.

---

## The Three Approaches Compared

```
┌──────────────────────────────────────────────────────────────────┐
│                    APPROACH SPECTRUM                             │
│                                                                  │
│  No Training          Light Training         Heavy Training      │
│  (minutes)            (hours)                (days/weeks)        │
│                                                                  │
│  RAG / Prompt         Fine-Tuning            Pre-Training        │
│  Engineering          (LoRA/QLoRA)           from Scratch        │
│                                                                  │
│  ✅ START HERE        ⚠️ ONLY IF RAG         ❌ ALMOST NEVER     │
│                         FAILS                   JUSTIFIED        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Approach 1: RAG + System Prompt (No Training — Minutes to Hours)

**This is what you should do first.** For a `SKILL.md` like yours, this is likely **all you need.**

### Why it works for your case

Your `SKILL.md` is essentially a **structured instruction manual** — not novel knowledge that requires the model to learn new reasoning patterns. An LLM already knows:
- How React, Firebase, Tailwind, Vite, yarn work
- How to write Firestore rules
- How to generate shell commands
- How to follow structured instructions

What it *doesn't* know is your **specific project constraints** (G1–G14, your file paths, your curriculum layer system). That's what `SKILL.md` provides at runtime via the context window.

### Architecture

```
                    ┌─────────────────────────────┐
                    │       Your SKILL.md          │
                    │      (~8,000 tokens)         │
                    └──────────┬──────────────────┘
                               │
                               ▼
┌──────────┐    ┌──────────────────────────────┐    ┌─────────────┐
│          │    │       RETRIEVAL (RAG)         │    │             │
│  User    │───▶│                               │───▶│  LLM Brain  │
│  Query   │    │  1. Embed the query           │    │  (Ollama /  │
│          │    │  2. Search curriculum JSONs    │    │   HF model) │
│          │    │  3. Pull relevant chunks       │    │             │
└──────────┘    │  4. Inject into prompt         │    └─────────────┘
                └──────────────────────────────┘
```

### How the curriculum JSONs fit in

```python
# Index your thousands of curriculum JSONs into a vector store
import os, json
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveJsonSplitter

# 1. Load all curriculum files
docs = []
for f in os.listdir("public/curriculum/"):
    if f.endswith(".json"):
        with open(f"public/curriculum/{f}") as fh:
            data = json.load(fh)
            # Flatten each indicator into a searchable document
            for indicator in data.get("indicators", []):
                docs.append({
                    "content": json.dumps(indicator, indent=2),
                    "metadata": {
                        "file": f,
                        "grade": indicator.get("grade"),
                        "subject": indicator.get("subject"),
                        "code": indicator.get("code"),
                    }
                })

# 2. Create embeddings + vector store
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")  # From HF!
texts = [d["content"] for d in docs]
metadatas = [d["metadata"] for d in docs]
vectorstore = FAISS.from_texts(texts, embeddings, metadatas=metadatas)
vectorstore.save_local("curriculum_index")

# 3. At query time
relevant = vectorstore.similarity_search(
    "What are the B3 Mathematics strand 2 indicators?", k=5
)
```

### Full agent with RAG

```python
import requests, json, subprocess

# Load SKILL.md once
with open("SKILL.md") as f:
    skill_md = f.read()

# Load vector store once
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = FAISS.load_local("curriculum_index", embeddings,
                                allow_dangerous_deserialization=True)

ALLOWED_COMMANDS = [
    "yarn dev", "yarn lint", "yarn build", "yarn preview",
    "git status", "git add", "git commit", "git push",
    "firebase deploy", "python scripts/validate_app_curriculum.py",
    "python scripts/audit_questions.py", "ls", "cat", "wc",
]

def is_safe(cmd):
    return any(cmd.strip().startswith(allowed) for allowed in ALLOWED_COMMANDS)

def ask_agent(user_query):
    # 1. Retrieve relevant curriculum context
    relevant_docs = vectorstore.similarity_search(user_query, k=5)
    curriculum_context = "\n---\n".join(d.page_content for d in relevant_docs)

    # 2. Build the full prompt
    system = f"""{skill_md}

## Retrieved Curriculum Context (from {len(relevant_docs)} matching documents):
{curriculum_context}

## Response Format
If you need to execute a command, respond with EXACTLY:
{{"action": "run", "command": "<command>"}}
Otherwise respond in plain text.
Always explain what you're about to do before doing it."""

    # 3. Call Ollama
    resp = requests.post("http://localhost:11434/api/chat", json={
        "model": "qwen2.5-coder:14b",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_query}
        ],
        "stream": False
    })
    reply = resp.json()["message"]["content"]

    # 4. Parse and optionally execute
    try:
        parsed = json.loads(reply)
        if parsed.get("action") == "run":
            cmd = parsed["command"]
            if not is_safe(cmd):
                return f"🚫 BLOCKED: `{cmd}` is not in the allowed command list."
            print(f"⚡ Executing: {cmd}")
            confirm = input("Proceed? [y/N]: ")
            if confirm.lower() != "y":
                return "Cancelled by user."
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            output = result.stdout or result.stderr
            # Feed result back for interpretation
            followup = requests.post("http://localhost:11434/api/chat", json={
                "model": "qwen2.5-coder:14b",
                "messages": [
                    {"role": "system", "content": skill_md},
                    {"role": "user", "content": f"Command `{cmd}` returned:\n```\n{output}\n```\nSummarize the result and suggest next steps."}
                ],
                "stream": False
            })
            return followup.json()["message"]["content"]
    except (json.JSONDecodeError, KeyError):
        pass

    return reply

# Interactive loop
while True:
    q = input("\n🔶 You: ")
    if q.lower() in ("exit", "quit"):
        break
    print(f"\n🤖 Agent: {ask_agent(q)}")
```

### Time estimate

| Step | Time |
|---|---|
| Install Ollama + pull model | 5–15 minutes |
| Index 44 curriculum JSONs into FAISS | 30–60 seconds |
| Write the agent script | 1–2 hours |
| Test and iterate prompts | 2–4 hours |
| **Total** | **Half a day** |

---

## Approach 2: Fine-Tuning with LoRA/QLoRA (Hours to Days)

**Only do this if RAG doesn't follow your rules reliably enough** — e.g., the model keeps suggesting `npm`, using `@layer components`, or forgetting to stamp `authorId`.

### What fine-tuning does

You're not teaching the model *new knowledge* — you're **adjusting its behavioral tendencies** so it reflexively follows your conventions without needing them in the prompt every time.

### Training data preparation

You'd convert your SKILL.md + curriculum JSONs into **instruction-response pairs**:

```jsonl
{"messages": [
  {"role": "system", "content": "You are Beacon Agent..."},
  {"role": "user", "content": "Install the project dependencies"},
  {"role": "assistant", "content": "I'll install dependencies using yarn (never npm, per rule G1):\n\n```bash\nyarn install --frozen-lockfile\n```\n\nAfter installation, I'll verify the setup:\n```bash\nyarn lint && yarn build\n```"}
]}

{"messages": [
  {"role": "system", "content": "You are Beacon Agent..."},
  {"role": "user", "content": "Add a shared card style"},
  {"role": "assistant", "content": "Per rule G7, shared classes must use `@utility` (never `@layer components`) in Tailwind v4:\n\n```css\n@utility card-featured {\n  @apply card border-brand-600 shadow-md;\n}\n```"}
]}

{"messages": [
  {"role": "system", "content": "You are Beacon Agent..."},
  {"role": "user", "content": "How many indicators are there?"},
  {"role": "assistant", "content": "Per rule G9, I must name the layer when stating counts:\n\n- **L1** (curriculum DBs): 3,095 indicators\n- **L2** (enriched lessons): 13,140 slots\n- **L3** (app bundle): 4,040 indicators across 11 grades (KG1–B9)\n\n945 L3 indicators have no L1 counterpart."}
]}

{"messages": [
  {"role": "system", "content": "You are Beacon Agent..."},
  {"role": "user", "content": "Write a Firestore rule for a new 'announcements' collection"},
  {"role": "assistant", "content": "Per rule G6 and G13 (snake_case collections), here's the rule:\n\n```\nmatch /announcements/{id} {\n  allow read: if isApprovedOrAdmin();\n  allow create: if isApprovedOrAdmin()\n                && request.resource.data.authorId == request.auth.uid;\n  allow update, delete: if isAdmin()\n                        || (isApprovedOrAdmin() && resource.data.authorId == request.auth.uid);\n}\n```\n\nNote: Every write validates `authorId == request.auth.uid` (G6), and the collection uses snake_case (G13)."}
]}
```

### Training with Hugging Face + QLoRA

```python
# Fine-tune on your SKILL.md instruction pairs
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig

# 1. Load base model in 4-bit
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype="bfloat16",
)

model_name = "Qwen/Qwen2.5-Coder-7B-Instruct"
model = AutoModelForCausalLM.from_pretrained(model_name, quantization_config=bnb_config)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# 2. Apply LoRA adapters (only ~1-5% of parameters are trainable)
lora_config = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # ~1-3% of total

# 3. Load your training data
dataset = load_dataset("json", data_files="beacon_training_pairs.jsonl")

# 4. Train
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset["train"],
    args=SFTConfig(
        output_dir="./beacon-agent-lora",
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=10,
        save_strategy="epoch",
        bf16=True,
    ),
    tokenizer=tokenizer,
)

trainer.train()

# 5. Save the LoRA adapter (small — ~50-200 MB)
model.save_pretrained("./beacon-agent-lora")

# 6. Merge into full model for Ollama export
from peft import PeftModel
base = AutoModelForCausalLM.from_pretrained(model_name)
merged = PeftModel.from_pretrained(base, "./beacon-agent-lora")
merged = merged.merge_and_unload()
merged.save_pretrained("./beacon-agent-merged")
```

### Converting to Ollama after fine-tuning

```bash
# Convert merged model to GGUF (Ollama format)
pip install llama-cpp-python
python -m llama_cpp.convert \
    --outfile beacon-agent.gguf \
    --outtype q4_K_M \
    ./beacon-agent-merged

# Create Ollama model
cat > Modelfile <<EOF
FROM ./beacon-agent.gguf
SYSTEM """You are Beacon Agent, an autonomous developer for the Beacon
Educational Consult codebase. Follow all Ground Rules G1-G14 strictly."""
PARAMETER temperature 0.3
PARAMETER num_ctx 8192
EOF

ollama create beacon-agent -f Modelfile
ollama run beacon-agent "How do I add a new page to Beacon?"
```

### Time estimates for fine-tuning

| Factor | Details |
|---|---|
| **Training data preparation** | 2–5 days (creating 500–2000 high-quality instruction pairs from your SKILL.md + curriculum JSONs) |
| **Actual training (QLoRA, 7B model)** | |
| — Single RTX 3090/4090 (24GB) | **2–6 hours** for 3 epochs on ~1000 examples |
| — Single A100 (80GB) | **30–90 minutes** |
| — Google Colab (T4, free tier) | **4–10 hours** (may timeout) |
| — HF AutoTrain (cloud) | **1–3 hours** (paid) |
| **Larger model (14B–72B)** | 2x–10x the above |
| **Evaluation and iteration** | 1–3 days (multiple runs, testing, adjusting data) |
| **GGUF conversion + Ollama setup** | 1–2 hours |
| **Total realistic timeline** | **1–2 weeks** |

### The curriculum JSON challenge

With **thousands of curriculum JSON files**, you have a data preparation decision:

```
Option A: RAG (recommended)
  - Index all JSONs into vector store
  - Retrieved at query time
  - Model doesn't need to memorize them
  - Time: ~1 hour to set up

Option B: Fine-tune on curriculum content
  - Convert each JSON into Q&A pairs:
    "What are the B3 Math Strand 2 indicators?" → [list from JSON]
  - Model memorizes the curriculum
  - Time: 3-5 days data prep + 4-10 hours training
  - RISK: Model may hallucinate details it almost-but-not-quite remembers
  
Option C: Hybrid (best if you fine-tune at all)
  - Fine-tune on SKILL.md rules + behavioral patterns (~500 pairs)
  - RAG for curriculum JSON lookups at runtime
  - Model learns the rules; vector store supplies the facts
  - Time: 1-2 days data prep + 2-6 hours training + 1 hour RAG setup
```

**Strong recommendation: Option C if RAG alone isn't sufficient.** Never fine-tune a model to memorize factual data that changes — use retrieval for that.

---

## Approach 3: Pre-Training from Scratch (Weeks to Months — Don't Do This)

| Factor | Estimate |
|---|---|
| Data needed | Billions of tokens |
| Compute cost | $50K–$5M+ |
| Time | Weeks to months on a GPU cluster |
| Justification | You're building a new foundation model |

**This is never justified for a project-specific agent.** You'd be trying to teach a model English, coding, reasoning, AND your Beacon conventions from scratch. Use an existing model + RAG or fine-tuning.

---

## Decision Framework

```
START
  │
  ▼
Does the base model (Llama 3.1 / Qwen 2.5) already know
React, Firebase, Tailwind, Python, bash?
  │
  YES ──────────────────────────────────────────────┐
  │                                                  │
  ▼                                                  │
Can your SKILL.md + retrieved curriculum chunks       │
fit in the context window? (8K-128K tokens)          │
  │                                                  │
  YES ──────────────────────────┐                    │
  │                              │                    │
  ▼                              ▼                    │
Does the model follow your     USE RAG               │
rules (G1-G14) reliably        (Approach 1)          │
with just the prompt?          ⏱️ Half a day          │
  │                                                  │
  YES → DONE ✅                                       │
  │                                                  │
  NO                                                 │
  │                                                  │
  ▼                                                  │
FINE-TUNE on behavioral                              │
patterns only (Approach 2)                           │
Keep RAG for curriculum data                         │
⏱️ 1-2 weeks                                         │
  │                                                  │
  ▼                                                  │
DONE ✅                                               │
```

---

## Summary: Realistic Timeline for Your Beacon Agent

| Phase | What | Time | Cost |
|---|---|---|---|
| **Phase 1** | RAG agent with Ollama + SKILL.md in system prompt + curriculum JSONs in FAISS | **4–8 hours** | Free (local GPU) |
| **Phase 2** (only if needed) | Generate 500–1000 training pairs from SKILL.md rules | **2–3 days** | Free |
| **Phase 3** (only if needed) | QLoRA fine-tune on Qwen2.5-Coder-7B | **2–6 hours** GPU time | Free (own GPU) or ~$5–20 (cloud) |
| **Phase 4** (only if needed) | Convert to GGUF, create Ollama model, test | **2–4 hours** | Free |
| **Total (if everything)** | | **~1–2 weeks** | **$0–20** |

**My strong recommendation:** Start with Phase 1. Your SKILL.md is detailed and well-structured enough that a good model (Qwen2.5-Coder-14B or Llama 3.1-8B) with RAG will handle 90%+ of tasks correctly. Only fine-tune if you find the model repeatedly violating specific ground rules despite them being in the prompt.