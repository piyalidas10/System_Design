# Order 4 B-Tree

## The tree

```
                 [ 20 | 40 | 60 ]                 <- Root
               /      |      |      \
      [10, 15]   [25, 30]   [45, 50]   [70, 80]
      Child 1    Child 2    Child 3    Child 4
```

**Question:** Why `20 | 40 | 60`? Why `10, 15`? Why `25, 30`?

Nobody picks these numbers randomly. They are the result of inserting data into the B-Tree while following its **sorting and splitting rules**.

---

## 1. Rules of an Order 4 B-Tree

- Maximum **4 children** per node.
- Maximum **3 keys** per node.
- Keys are always **sorted**.
- When a node exceeds 3 keys, it **splits**.
- The **middle key moves up** to the parent.

Example customer IDs to insert:

```
10, 15, 20, 25, 30, 40, 45, 50, 60, 70, 80
```

---

## 2. Inserting values step by step

**Step 1: Insert 10**

```
[10]
```

One node, one key.

**Step 2: Insert 15**

15 > 10, so it goes to the right.

```
[10 | 15]
```

**Step 3: Insert 20**

20 > 15.

```
[10 | 15 | 20]
```

Maximum capacity reached.

**Step 4: Insert 25**

Now there are four keys:

```
10 | 15 | 20 | 25
```

Order 4 allows only 3 keys, so the node must **split**.

This example uses the convention of promoting the **upper middle key**, `20`.

Before splitting:

```
[10 | 15 | 20 | 25]
```

After splitting:

```
        [20]
       /    \
 [10 | 15]  [25]
```

`20` moves to the root. Smaller values go left, larger values go right.

This is where the root value comes from: **it is created by the splitting operation.**

---

## 3. Continue inserting

Insert `30, 40, 45, 50, 60, 70, 80`.

The tree keeps splitting nodes whenever they exceed capacity. The promoted middle keys become separators in their parent nodes.

One possible final tree, for illustration:

```
                 [ 20 | 40 | 60 ]
               /      |      |      \
        [10 | 15] [25 | 30] [45 | 50] [70 | 80]
```

> **Important:** this tree is a valid illustrative arrangement, but it is **not** the exact result of the insertion sequence in Step 2. Different insertion orders and split conventions can produce different valid B-Trees.

---

## 4. Why these values in each child?

The root keys `20 | 40 | 60` divide all other values into four ranges:

| Child   | Rule                  | Values |
|---------|-----------------------|--------|
| Child 1 | Values less than 20   | 10, 15 |
| Child 2 | Values between 20 and 40 | 25, 30 |
| Child 3 | Values between 40 and 60 | 45, 50 |
| Child 4 | Values greater than 60 | 70, 80 |

This is the fundamental B-Tree search rule.

### Example: search for customer ID 45

1. Start at the root: `20, 40, 60`.
2. 45 is greater than 40 but less than 60.
3. Go to **Child 3**.
4. Search inside `[45 | 50]`.
5. Found!

You don't need to scan every customer record.

---

## 5. Try it yourself

Which child should you visit to find customer ID **35**?

<details>
<summary>Answer</summary>

**Child 2**, because 20 < 35 < 40.

</details>

---

## Key takeaways

- **Splitting** decides which values move up to the parent.
- **Parent keys** divide the data into ranges.
- **Each child** stores the values belonging to its range.

Once you understand these three rules, you can construct a B-Tree yourself rather than memorizing diagrams.
