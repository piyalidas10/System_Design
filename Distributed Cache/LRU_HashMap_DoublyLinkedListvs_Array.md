# Why HashMap + Doubly Linked List Instead of an Array for LRU Cache?

> One of the most important implementation concepts in an LRU Cache interview.  
> Target: **O(1) time complexity** for lookup, recency update, insertion, and eviction.

<img src="./LRU Cache_ The Perfect Combo.png" width="100%" />

---

## Table of Contents

1. [The LRU Requirement](#1-the-lru-requirement)
2. [Why Not an Array?](#2-why-not-an-array)
3. [Why a Doubly Linked List?](#3-why-a-doubly-linked-list)
4. [Why HashMap + Doubly Linked List Together?](#4-why-hashmap--doubly-linked-list-together)
5. [Step-by-Step Operation Walkthrough](#5-step-by-step-operation-walkthrough)
6. [Final Comparison](#6-final-comparison)
7. [Interview-Ready Answer](#7-interview-ready-answer)

---

## 1. The LRU Requirement

An LRU Cache needs three operations to be very fast:

| # | Operation | Description |
|---|-----------|-------------|
| 1 | **Find** | Locate an element by key |
| 2 | **Update order** | Move an accessed element to the Most Recently Used (MRU) end |
| 3 | **Evict** | Remove the Least Recently Used (LRU) element when capacity is full |

**Target: O(1) for all three.**

### Cache Order Convention

```
LRU end (evict first)                   MRU end (recently accessed)
        │                                         │
        ▼                                         ▼
  ┌───┐   ┌───┐   ┌───┐   ┌───┐
  │ A │ ⇄ │ B │ ⇄ │ C │ ⇄ │ D │
  └───┘   └───┘   └───┘   └───┘
```

- **Left end = LRU** → evicted first when capacity is full.
- **Right end = MRU** → most recently accessed.

### Example: User Accesses A

Before access:
```
[A] ⇄ [B] ⇄ [C] ⇄ [D]
 ▲                    ▲
LRU                  MRU
```

After access — A moves to the MRU end:
```
[B] ⇄ [C] ⇄ [D] ⇄ [A]
 ▲                    ▲
LRU                  MRU
```

---

## 2. Why Not an Array?

Let's try to implement LRU using a plain Array and analyse the cost.

**Initial state:**

```js
let cache = ["A", "B", "C", "D"];
//            ▲                ▲
//           LRU              MRU
```

---

### Operation 1: Find A

```js
cache.indexOf("A");   // Scans from index 0
```

| Scenario       | Complexity |
|----------------|-----------|
| Best case (A at index 0) | O(1) |
| General case (A anywhere) | **O(n)** |

---

### Operation 2: Move A to MRU End

```js
cache.splice(0, 1);   // Remove A — shifts all remaining elements left
cache.push("A");      // Add A at end
```

```
Before splice:  [A, B, C, D]
After splice:   [B, C, C, D]  ← elements shift left
After push:     [B, C, D, A]
```

**Every element after A must be shifted one position left.**

| Operation | Complexity |
|-----------|-----------|
| `splice`  | **O(n)** — shifts elements |
| `push`    | O(1) amortized |

---

### Operation 3: Evict LRU (leftmost element)

```js
cache.shift();   // Removes index 0, shifts all elements left
```

```
Before: [A, B, C, D]
After:  [B, C, D]     ← every element shifts one position
```

| Operation | Complexity |
|-----------|-----------|
| `shift`   | **O(n)** — shifts elements |

---

### Array Summary

| Operation        | Complexity |
|------------------|-----------|
| Find element     | O(n)       |
| Move to MRU end  | O(n)       |
| Evict LRU        | O(n)       |

> **Problem:** In an LRU cache, access order updates happen on every read. With an Array, every access costs O(n) — unacceptable for a cache under real load.

---

## 3. Why a Doubly Linked List?

A Doubly Linked List allows removing and moving a node **without shifting any other elements**.

### Node Structure

```
┌──────────────────────────────┐
│  prev  │   value   │  next  │
└──────────────────────────────┘
```

Each node holds a reference to both its **previous** and **next** neighbour.

### Example: Move B to MRU End

**Before:**
```
[A] ⇄ [B] ⇄ [C] ⇄ [D]
```

**Step 1 — Unlink B** (update A's next and C's prev):
```
[A] ⇄ [C] ⇄ [D]
```

**Step 2 — Append B after D:**
```
[A] ⇄ [C] ⇄ [D] ⇄ [B]
```

**No other elements were shifted. Both steps are O(1)** — *provided we already hold a direct reference to node B*.

### The Remaining Problem

> A Doubly Linked List alone can **remove and reorder in O(1)**, but it cannot **find a node by key in O(1)**. Searching from the head takes O(n).

This is exactly what the HashMap solves.

---

## 4. Why HashMap + Doubly Linked List Together?

> **HashMap** solves the **search** problem.  
> **Doubly Linked List** solves the **ordering** problem.  
> Together they make every LRU operation O(1).

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LRU Cache                               │
│                                                                 │
│   HashMap                       Doubly Linked List             │
│   ┌─────────────────┐           ┌────────────────────────────┐ │
│   │  Key │   Node   │           │ LRU                    MRU │ │
│   │──────│──────────│   ┌──────►│[A] ⇄ [B] ⇄ [C] ⇄ [D]     │ │
│   │  "A" │ → Node A │───┘       │  ▲                    ▲   │ │
│   │  "B" │ → Node B │───────────│──┘                    │   │ │
│   │  "C" │ → Node C │───────────│───────────────────────┘   │ │
│   │  "D" │ → Node D │           └────────────────────────────┘ │
│   └─────────────────┘                                          │
│                                                                 │
│   HashMap:  O(1) lookup by key                                  │
│   DLL:      O(1) move-to-MRU and evict-from-LRU                │
└─────────────────────────────────────────────────────────────────┘
```

> **Key insight:** The HashMap stores **direct node references**, not values. This is what makes DLL operations O(1) — no traversal needed.

---

## 5. Step-by-Step Operation Walkthrough

### Scenario: Cache capacity = 4, current state

```
HashMap:  { A→nodeA, B→nodeB, C→nodeC, D→nodeD }

DLL (LRU → MRU):  [A] ⇄ [B] ⇄ [C] ⇄ [D]
```

---

### Operation A: GET "B" (cache hit)

```
Step 1 — HashMap lookup:
    node = map.get("B")      → O(1), returns direct reference to nodeB

Step 2 — Unlink nodeB from its current position:
    nodeB.prev.next = nodeB.next    (A.next = C)
    nodeB.next.prev = nodeB.prev    (C.prev = A)
    → O(1)

Step 3 — Insert nodeB at MRU end (after D):
    nodeB.prev = D
    nodeB.next = null
    D.next = nodeB
    → O(1)
```

**Result:**
```
DLL:  [A] ⇄ [C] ⇄ [D] ⇄ [B]
              ▲               ▲
             LRU             MRU
```

**Total: O(1)**

---

### Operation B: PUT "E" (cache full → evict LRU, then insert)

```
Step 1 — Cache is full (capacity = 4).

Step 2 — Evict LRU (tail of DLL):
    lruNode = dll.tail          → O(1)
    map.delete(lruNode.key)     → O(1) — remove from HashMap too
    dll.removeTail()            → O(1)

    Evicted: A

Step 3 — Insert new node E at MRU end:
    nodeE = new Node("E")
    dll.insertAtHead(nodeE)     → O(1)
    map.set("E", nodeE)         → O(1)
```

**Result:**
```
HashMap:  { B→nodeB, C→nodeC, D→nodeD, E→nodeE }

DLL:  [C] ⇄ [D] ⇄ [B] ⇄ [E]
       ▲                    ▲
      LRU                  MRU
```

**Total: O(1)**

---

### Operation Summary

| Operation         | HashMap step | DLL step        | Total    |
|-------------------|-------------|-----------------|----------|
| GET (cache hit)   | O(1) lookup  | O(1) move-to-MRU | **O(1)** |
| GET (cache miss)  | O(1) lookup  | —               | **O(1)** |
| PUT (no eviction) | O(1) insert  | O(1) insert-MRU  | **O(1)** |
| PUT (evict LRU)   | O(1) delete + insert | O(1) remove-tail + insert-MRU | **O(1)** |

---

## 6. Final Comparison

| Operation           | Array         | HashMap + DLL      |
|---------------------|---------------|--------------------|
| Find item by key    | O(n)          | **O(1)** average   |
| Move item to MRU    | O(n)          | **O(1)**           |
| Evict LRU           | O(n)          | **O(1)**           |
| Insert at MRU       | O(1) amortized | **O(1)**           |
| Extra memory        | Lower         | Higher (pointers + HashMap) |

> **DLL = Doubly Linked List.**

### Why not a Singly Linked List?

A singly linked list can remove a node from the front in O(1), but removing an **arbitrary node** (e.g., moving the accessed node to MRU) requires O(n) traversal to reach the node's **predecessor**. A doubly linked list gives each node direct access to its predecessor, making arbitrary removal O(1).

### Why not a Hash Set or Hash Map alone?

A HashMap alone provides O(1) access but has **no inherent ordering**. It cannot tell you which item was accessed least recently without additional bookkeeping.

---

## 7. Interview-Ready Answer

**Interview question:**

> "Why do you use HashMap with Doubly Linked List instead of an Array for implementing LRU Cache?"

**Model answer:**

> "We use a **HashMap** for O(1) average-time lookup by key, and a **Doubly Linked List** to maintain the recency order of cache entries.
>
> When an entry is accessed, we find its node directly via the HashMap and move it to the MRU end of the list in O(1), because each node holds references to both its previous and next neighbours, so no shifting is needed.
>
> When the cache reaches capacity, we remove the tail node of the DLL — which is the least recently used entry — also in O(1). We simultaneously remove it from the HashMap so both structures stay in sync.
>
> An Array would require scanning to find an element and shifting all subsequent elements whenever we update access order or evict an entry, giving O(n) for those operations.
>
> Therefore, HashMap + Doubly Linked List provides **O(1) average time complexity** for all four operations: lookup, recency update, insertion, and eviction."

---

> **Remember the responsibility split:**
> - The **HashMap** maintains fast lookup — it does NOT track recency order.
> - The **Doubly Linked List** maintains recency order — it does NOT provide fast lookup by key.
> - Both structures work together and must be kept **in sync** on every operation.

---

> **Practice this:** [LeetCode 146 – LRU Cache](https://leetcode.com/problems/lru-cache/) is one of the most common system design coding questions.
