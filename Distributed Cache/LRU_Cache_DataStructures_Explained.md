# LRU Cache — Why HashMap + Doubly Linked List?

> Built around a shopping website analogy: remember the last 3 products a customer viewed.  
> We learn Array, Doubly Linked List, and HashMap from zero — then combine them to understand the LRU Cache architecture.

---

## The Problem

You are building a small shopping website. You want to remember the **last 3 products** a customer viewed.

**Rules:**
- Cache capacity = **3 products**.
- When a customer views a product → mark it as **Most Recently Used (MRU)**.
- When the cache is full and a new product arrives → remove the **Least Recently Used (LRU)** product.

---

## Table of Contents

1. [What is an Array?](#1-what-is-an-array)
2. [What is a Doubly Linked List?](#2-what-is-a-doubly-linked-list)
3. [How Do You Remove a Node from a Doubly Linked List?](#3-how-do-you-remove-a-node-from-a-doubly-linked-list)
4. [Array vs Doubly Linked List](#4-array-vs-doubly-linked-list)
5. [What is a HashMap?](#5-what-is-a-hashmap)
6. [Combine HashMap + Doubly Linked List](#6-combine-hashmap--doubly-linked-list)
7. [Real LRU Example — Step by Step](#7-real-lru-example--step-by-step)
8. [JavaScript Implementation](#8-javascript-implementation)
9. [The One Thing to Remember](#9-the-one-thing-to-remember)
10. [Test Your Understanding](#10-test-your-understanding)

---

## 1. What is an Array?

An array is a collection of items stored in an **ordered sequence** — think of it as boxes placed next to each other.

```
ARRAY — FOUR CONTIGUOUS POSITIONS
┌───────────┬───────────┬───────────┬───────────┐
│     A     │     B     │     C     │     D     │
│  Index 0  │  Index 1  │  Index 2  │  Index 3  │
└───────────┴───────────┴───────────┴───────────┘
```

```js
const products = ["A", "B", "C", "D"];

console.log(products[0]); // A
console.log(products[2]); // C
```

### Access by Index — O(1)

When you know the index, access is instant:

```js
products[2]; // C  →  O(1)
```

### Search by Value — O(n)

When you only know the product name, the computer must scan one by one:

```js
products.indexOf("D");
```

```
Check index 0: Is A === D?  No.
Check index 1: Is B === D?  No.
Check index 2: Is C === D?  No.
Check index 3: Is D === D?  Yes! ✓
```

That is **O(n)** — proportional to the array size.

---

## 2. What is a Doubly Linked List?

Imagine people standing in a queue. Each person knows two things:
- **Who is immediately before them?**
- **Who is immediately after them?**

That is a Doubly Linked List.

Each item is called a **Node** and contains three things:

```
┌────────────────────────────────────┐
│  prev  │      data / value      │  next  │
└────────────────────────────────────┘
```

### Example — Three Nodes

```
         Head                           Tail
          │                              │
          ▼                              ▼
        ┌───┐       ┌───┐       ┌───┐
  null ←│ A │ ↔ ↔ ↔│ B │ ↔ ↔ ↔│ C │→ null
        └───┘       └───┘       └───┘
        Node 1      Node 2      Node 3
```

The arrows go **both ways**. Each node knows its previous and next neighbours:
- **A** knows B is next.
- **B** knows A is previous and C is next.
- **C** knows B is previous.

> Unlike an array, nodes **do not need to be stored next to each other in memory**. They are connected through references (pointers).

---

## 3. How Do You Remove a Node from a Doubly Linked List?

Starting state:

```
[A] ↔ [B] ↔ [C] ↔ [D]
```

We want to remove **B**. We only change **two connections**:

```
BEFORE removing B:
          ┌──────────────────┐
[A] ──next──► [B] ──next──► [C] ──next──► [D]
[A] ◄──prev── [B] ◄──prev── [C] ◄──prev── [D]
```

```
AFTER removing B:
[A] ──────────────────────next──► [C] ──next──► [D]
[A] ◄──────────────────────prev── [C] ◄──prev── [D]

B is disconnected — it no longer belongs to the list.
```

**What changed?**
- `A.next` now points to C (was B).
- `C.prev` now points to A (was B).

We did **not move** A, C, or D anywhere. This is the biggest advantage:

> **Removing a node takes O(1)** — when you already hold a direct reference to it.

---

## 4. Array vs Doubly Linked List

### Removing B from an Array

```js
const items = ["A", "B", "C", "D"];
items.splice(1, 1);
// ["A", "C", "D"]
```

```
BEFORE:
┌───┬───┬───┬───┐
│ A │ B │ C │ D │
└───┴───┴───┴───┘
  0   1   2   3

Remove B → C and D must shift left to close the gap:

AFTER:
┌───┬───┬───┐
│ A │ C │ D │
└───┴───┴───┘
  0   1   2
```

For a cache with 1 million items, repeatedly shifting elements is expensive.

### Comparison Table

| Operation               | Array              | Doubly Linked List             |
|-------------------------|--------------------|-------------------------------|
| Find item by value      | O(n)               | O(n) without a direct reference |
| Remove a known item     | O(n) — shifts elements | **O(1)** — update two pointers |
| Add at end              | O(1) amortized     | O(1) with tail pointer         |
| Move known item to end  | O(n)               | **O(1)** — unlink + relink     |

> **Gap:** A Doubly Linked List cannot **find** a node by key quickly. That is what the HashMap solves.

---

## 5. What is a HashMap?

Imagine a school with 1,000 students. Instead of checking every student to find Rahul, you maintain a register:

```
┌──────────────┬────────────────────┐
│ Student Name │ Classroom Location │
├──────────────┼────────────────────┤
│ Rahul        │ Room A             │
│ Priya        │ Room B             │
│ Amit         │ Room C             │
└──────────────┴────────────────────┘
```

Search for Rahul → immediately get Room A. A HashMap works the same way.

```js
const students = new Map();

students.set("Rahul", "Room A");
students.set("Priya", "Room B");

console.log(students.get("Rahul")); // Room A  →  O(1) average
```

### In an LRU Cache, the HashMap stores:

```
Key   = Product ID
Value = Direct reference to that product's node in the linked list
```

```
HASHMAP — Find a node quickly
┌─────────┬─────────────────────┐
│   Key   │    Node Reference   │
├─────────┼─────────────────────┤
│   "A"   │ → Node A            │
│   "B"   │ → Node B            │
│   "C"   │ → Node C            │
│   "D"   │ → Node D            │
└─────────┴─────────────────────┘

Average lookup: O(1)
```

Search for "B" → HashMap returns a direct reference to Node B. No scanning.

---

## 6. Combine HashMap + Doubly Linked List

This is the actual LRU Cache architecture. Each structure has a **separate responsibility**:

```
┌──────────────────────────────────────────────────────────────────┐
│                          LRU CACHE                               │
│                                                                  │
│   HashMap                          Doubly Linked List            │
│   ┌──────────────────────┐         ┌──────────────────────────┐ │
│   │  Key  │  Node ref    │         │ LRU end          MRU end │ │
│   │───────│──────────────│    ┌───►│ [A] ↔ [B] ↔ [C] ↔ [D]   │ │
│   │  "A"  │ ──────────── │────┘    └──────────────────────────┘ │
│   │  "B"  │ ──────────── │──────────────► ▲                     │
│   │  "C"  │ ──────────── │────────────────────► ▲               │
│   │  "D"  │ ──────────── │──────────────────────────► ▲         │
│   └──────────────────────┘                                      │
│                                                                  │
│   HashMap  → Find the node quickly     (O(1) average)           │
│   DLL      → Move/remove the node      (O(1))                   │
└──────────────────────────────────────────────────────────────────┘
```

> Think of it this way:
> - **HashMap = Finding the person in the crowd.**
> - **Doubly Linked List = Changing that person's position in the queue.**

---

## 7. Real LRU Example — Step by Step

**Cache capacity = 3.** Convention: left = LRU (evict first), right = MRU (most recent).

---

### Step 1 — Insert A, B, C

```
HashMap:  { "A"→nodeA, "B"→nodeB, "C"→nodeC }

DLL:
LRU end                         MRU end
  │                               │
  ▼                               ▼
[A] ↔ ─────────────────────── ↔ [C]
       [A] ↔ [B] ↔ [C]
```

```
LRU ──► [A] ↔ [B] ↔ [C] ◄── MRU

A was inserted first. C was used most recently.
```

---

### Step 2 — Customer Views A Again

A must move to the MRU end.

```
1. HashMap finds nodeA directly.             → O(1)
2. DLL unlinks A from its position.          → O(1)
   Before: [A] ↔ [B] ↔ [C]
   After unlink: [B] ↔ [C]
3. DLL inserts A at the MRU end.             → O(1)
   Result: [B] ↔ [C] ↔ [A]
```

```
LRU ──► [B] ↔ [C] ↔ [A] ◄── MRU

No other nodes were shifted!
```

---

### Step 3 — Insert New Product D (cache is full)

Cache has 3 items: B, C, A. Capacity = 3 → must evict LRU.

```
LRU is B (leftmost node).

1. DLL removes B (head node).                → O(1)
2. HashMap deletes "B".                      → O(1)
3. DLL inserts D at MRU end.                 → O(1)
4. HashMap adds "D" → nodeD.                 → O(1)
```

```
BEFORE:  LRU ──► [B] ↔ [C] ↔ [A] ◄── MRU
                  ▲
               evicted

AFTER:   LRU ──► [C] ↔ [A] ↔ [D] ◄── MRU
```

```
HashMap:  { "C"→nodeC, "A"→nodeA, "D"→nodeD }
```

> To remove B, we never search through the linked list. The HashMap tells us exactly where B's node is, and the DLL removes it in O(1).

---

## 8. JavaScript Implementation

```js
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;

    // Fast lookup: key → node reference
    this.map = new Map();

    // Sentinel nodes — simplify edge cases at head and tail
    this.head = new Node(null, null); // LRU side
    this.tail = new Node(null, null); // MRU side

    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // Disconnect a node from its current position
  remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  // Insert a node immediately before the tail (MRU end)
  addToEnd(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return -1;           // cache miss

    // Mark as most recently used
    this.remove(node);
    this.addToEnd(node);

    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      // Update existing entry — remove from current position
      this.remove(this.map.get(key));
    }

    const node = new Node(key, value);
    this.addToEnd(node);
    this.map.set(key, node);

    if (this.map.size > this.capacity) {
      // Evict LRU — the node right after the head sentinel
      const lru = this.head.next;
      this.remove(lru);
      this.map.delete(lru.key);
    }
  }
}
```

### Try It

```js
const cache = new LRUCache(3);

cache.put("A", 100);   // Cache: [A]
cache.put("B", 200);   // Cache: [A, B]
cache.put("C", 300);   // Cache: [A, B, C]

cache.get("A");        // Cache: [B, C, A]  — A becomes MRU

cache.put("D", 400);   // Cache: [C, A, D]  — B evicted (LRU)
```

Final cache: **C, A, D**. B was evicted.

---

## 9. The One Thing to Remember

| Data Structure     | Its job in LRU Cache                                              |
|--------------------|-------------------------------------------------------------------|
| **Array**          | Stores items in positions — but moving/removing middle elements requires shifting (O(n)) |
| **HashMap**        | Finds a node by key in **O(1) average**                          |
| **Doubly Linked List** | Moves and removes a known node **without shifting** other nodes — O(1) |

### Why combine HashMap + Doubly Linked List?

Because an LRU Cache needs **two things simultaneously**:

1. **Find any product quickly** — HashMap gives O(1) average.
2. **Move or remove that product quickly** — Doubly Linked List gives O(1) once you have the node reference.

### Responsibility Split

```
┌─────────────────────┬──────────────────────────────────────────┐
│   HashMap           │  Doubly Linked List                      │
├─────────────────────┼──────────────────────────────────────────┤
│ Answers: WHERE      │ Answers: HOW to reorder                  │
│ is node B?          │ the nodes without shifting               │
│                     │                                          │
│ Does NOT track      │ Does NOT find nodes by key               │
│ recency order       │                                          │
└─────────────────────┴──────────────────────────────────────────┘
Both structures must be kept IN SYNC on every get() and put().
```

---

## 10. Test Your Understanding

**Q1.** What does an Array use to identify an item's position?

<details>
<summary>Show Answer</summary>

✅ **Index** — e.g. `products[0]`. Direct access by index is O(1), but searching by value is O(n).

</details>

---

**Q2.** What does a Doubly Linked List node contain?

<details>
<summary>Show Answer</summary>

✅ **Previous reference, data/value, and next reference.**  
Each node stores its value and pointers to both its previous and next neighbours.

</details>

---

**Q3.** How does a HashMap help an LRU Cache?

<details>
<summary>Show Answer</summary>

✅ **It maps a key to the node's direct reference, so we can find that node in O(1) average — without traversing the linked list.**

</details>

---

> **My suggestion:** Trace through the A → B → C example until you can explain aloud how B is removed and A is moved to the MRU end **without shifting any other elements**. Once that clicks, the LRU Cache code will feel straightforward.

---

> **Practice:** [LeetCode 146 – LRU Cache](https://leetcode.com/problems/lru-cache/) is one of the most common system design coding problems.
