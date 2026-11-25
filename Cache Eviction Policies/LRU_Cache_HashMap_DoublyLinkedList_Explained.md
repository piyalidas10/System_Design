# LRU Cache for Beginners: Array vs Doubly Linked List vs HashMap

Let's forget the technical terms for a moment.

Imagine you are building a small shopping website. You want to remember the **last 3 products** a customer viewed.

Your cache can store only **3 products**.

The rule is:

- When a customer views a product, mark it as **Most Recently Used (MRU)**.
- When the cache becomes full and a new product arrives, remove the **Least Recently Used (LRU)** product.

We will understand why we use **HashMap + Doubly Linked List** (and not just an Array + HashMap) by learning each concept from zero.

---

## 1. First, what is an Array?

An array is simply a collection of items stored in an ordered sequence.

Imagine 4 boxes placed next to each other (contiguous positions):

```
+---------+---------+---------+---------+
|    A    |    B    |    C    |    D    |
+---------+---------+---------+---------+
 Index 0   Index 1   Index 2   Index 3
```

Each item has a position (**index**).

In JavaScript:

```js
const products = ["A", "B", "C", "D"];

console.log(products[0]); // A
console.log(products[1]); // B
console.log(products[2]); // C
```

**Important:** An array lets us access an item directly if we know its index.

```js
products[2] // C
```

This is very fast: **O(1)**.

But what if we don't know the index and only know the product name?

```js
products.indexOf("D");
```

The computer may need to check:

1. Is A equal to D? No.
2. Is B equal to D? No.
3. Is C equal to D? No.
4. Is D equal to D? Yes!

It searches one by one. That is **O(n)**.

---

## 2. What is a Doubly Linked List?

Forget the array for a moment.

Imagine people standing in a queue. Each person knows two things:

- Who is standing immediately **before** them?
- Who is standing immediately **after** them?

That is the basic idea of a Doubly Linked List.

Each item is called a **Node**. A node contains three things:

- **Previous** — reference to the previous node.
- **Data** — the actual value.
- **Next** — reference to the next node.

```
Head -> A   (Node 1)
        B   (Node 2)
Tail -> C   (Node 3)

   null <- [A] <-> [B] <-> [C] -> null
```

The arrows go both ways: each node knows its previous and next neighbours.

In simple words:

- A knows B is next.
- B knows A is previous and C is next.
- C knows B is previous.

Unlike an array, these nodes **do not need to be stored next to each other in memory**. They are connected through references.

---

## 3. Now the magic: How do you remove a node?

Suppose we have:

```
A <-> B <-> C <-> D
```

We want to remove **B**.

With a Doubly Linked List, we only change **two connections**:

**Before removing B:**

```
A <-> B <-> C <-> D
      ^
      remove this
```

**After removing B:**

```
A <-> C <-> D
```

A and C are now connected directly!

What changed?

- A's `next` reference now points to C.
- C's `prev` reference now points to A.
- B is disconnected.

That's it! We did not move A, C or D anywhere.

This is the biggest advantage of a Doubly Linked List: **removing a node is very fast when you already know which node to remove.**

It takes **O(1)**, meaning constant time.

---

## 4. But how does it compare with an Array?

Let's remove B from an array:

```js
const items = ["A", "B", "C", "D"];

items.splice(1, 1);

console.log(items);
// ["A", "C", "D"]
```

The array must close the gap by **shifting** subsequent elements.

```
Before removing B:   [ A ][ B ][ C ][ D ]

Remove B:            [ A ][   ][ C ][ D ]

C and D shift left:  [ A ][ C ][ D ]
```

The remaining elements must be repositioned to keep the array contiguous.

For a small array, this is not a problem. But imagine a cache with 1 million items. Repeatedly moving elements around becomes expensive.

| Operation              | Array   | Doubly Linked List         |
| ---------------------- | ------- | -------------------------- |
| Find item by value     | O(n)    | O(n) without a reference   |
| Remove known item      | O(n)    | **O(1)**                   |
| Add at end             | O(1)*   | O(1) with tail             |
| Move known item to end | O(n)    | **O(1)**                   |

\* Array append is O(1) amortized.

You might now ask:

> If a Doubly Linked List is so good, why do we need a HashMap?

Excellent question!

Notice the catch: the Doubly Linked List is O(1) only **if we already have the node**. Finding the node by value is still O(n). The HashMap solves that.

---

## 5. What is a HashMap?

Imagine you have a school with 1,000 students. You want to find a student named Rahul.

Instead of checking every student one by one, you maintain a register:

| Student name | Classroom location |
| ------------ | ------------------ |
| Rahul        | Room A             |
| Priya        | Room B             |
| Amit         | Room C             |

You search for Rahul and immediately get his classroom location.

A HashMap works similarly. It stores information in **key-value pairs**.

```js
const students = new Map();

students.set("Rahul", "Room A");
students.set("Priya", "Room B");

console.log(students.get("Rahul"));
// Room A
```

In an LRU Cache, the HashMap stores:

- **Key** = Product ID
- **Value** = Address/reference of that product's node in the linked list.

For example:

| Key | Node reference |
| --- | -------------- |
| A   | Node A         |
| B   | Node B         |
| C   | Node C         |
| D   | Node D         |

Average lookup time: **O(1)**.

So if you search for B, the HashMap gives you the reference to Node B directly. You don't need to search through A, B, C and D.

---

## 6. Now combine HashMap + Doubly Linked List

This is the actual LRU Cache architecture. Each one has a separate responsibility:

| Structure          | Responsibility                                          |
| ------------------ | ------------------------------------------------------- |
| HashMap            | Find the node quickly (Product ID -> Node reference)    |
| Doubly Linked List | Maintain usage order (Least recently used -> Most recently used) |

Think of it this way:

- **HashMap** = Finding the person.
- **Doubly Linked List** = Changing the person's position in the queue.

```
HashMap                    Doubly Linked List
-------                    ------------------
A -> Node A  ------------>  [A] <-> [B] <-> [C]
B -> Node B  ------------>        (LRU)         (MRU)
C -> Node C  ------------>
```

---

## 7. A real LRU example, step by step

Suppose the cache capacity is **3**. We insert three products: A, B and C.

### STEP 1 — Insert A, B, C

```
LRU (oldest)                MRU (newest)
   [A] <-> [B] <-> [C]
```

A was used first. C was used most recently.

Now the customer views **A** again. What should happen? A becomes the most recently used product.

### STEP 2 — Customer accesses A

```
LRU                         MRU
   [B] <-> [C] <-> [A]
```

A was removed from its old position and moved to the end.

How did it happen?

1. HashMap finds A's node directly.
2. Doubly Linked List disconnects A from its old position.
3. Doubly Linked List connects A at the MRU end.

Only a few references are updated. **No shifting!**

Now a new product **D** arrives. Our cache capacity is already full.

### STEP 3 — Insert D

B is the least recently used. **Remove B!**

```
Before:   [B] <-> [C] <-> [A]
           ^ evict

After:    [C] <-> [A] <-> [D]
                          ^ new MRU
```

Final order: **C -> A -> D**. B is removed and D is inserted as MRU.

Notice something important: to remove B, we don't search through the linked list. The HashMap tells us exactly where B is, and the Doubly Linked List removes it in O(1).

---

## 8. The actual code

Here is a simplified JavaScript implementation. Don't worry if you don't understand every line yet.

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

    // Fast lookup
    this.map = new Map();

    // Linked list boundaries
    this.head = new Node(null, null);
    this.tail = new Node(null, null);

    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // Disconnect a node
  remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  // Insert node immediately before tail (MRU)
  addToEnd(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;

    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  get(key) {
    const node = this.map.get(key);

    if (!node) return -1;

    // Mark as recently used
    this.remove(node);
    this.addToEnd(node);

    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const oldNode = this.map.get(key);
      this.remove(oldNode);
    }

    const node = new Node(key, value);

    this.addToEnd(node);
    this.map.set(key, node);

    if (this.map.size > this.capacity) {
      const lru = this.head.next;

      this.remove(lru);
      this.map.delete(lru.key);
    }
  }
}
```

Try it:

```js
const cache = new LRUCache(3);

cache.put("A", 100);
cache.put("B", 200);
cache.put("C", 300);

cache.get("A");

cache.put("D", 400);
```

The final cache contains **C, A, D**. B has been evicted.

---

## 9. Test your understanding

**1. What does an Array use to identify an item's position?**

- Node reference
- Index
- Previous pointer

**2. What does a Doubly Linked List node contain?**

- Only data
- Data and index
- Previous, data and next

**3. How does a HashMap help an LRU Cache?**

- Finds a node quickly using its key
- Keeps items in usage order
- Shifts array elements

<details>
<summary>Answers</summary>

1. Index
2. Previous, data and next
3. Finds a node quickly using its key

</details>

---

## 10. The one thing to remember

| Data structure     | Its job in LRU                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| Array              | Stores items in positions, but moving/removing middle elements requires shifting |
| HashMap            | Finds a node quickly using its key                                          |
| Doubly Linked List | Moves and removes a known node without shifting other nodes                 |

**Why do we combine HashMap + Doubly Linked List?**

Because an LRU Cache needs two things at the same time:

1. **Find any product quickly** — HashMap gives average O(1).
2. **Move or remove that product quickly** — Doubly Linked List gives O(1) when we already have its node reference.

Together, they make lookup, updating recency and eviction **average O(1)**.

> **Suggestion:** Understand the A -> B -> C example until you can explain how B is removed and A is moved to the end without shifting any elements. Once that clicks, the LRU Cache code will become much easier.
