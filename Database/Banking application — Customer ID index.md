# Building an Order 4 B-Tree from Scratch — Banking Application

Let's build this exactly as a database would build an index, starting with an empty database.

Three things to understand:

1. How is the root node created?
2. When and why are child nodes created?
3. How does the database decide which customer ID goes into which node?

We will use a small dataset first. Once you understand it, the same logic applies to 1 million or 100 million customers.

---

## 1. Our banking application

```sql
CREATE TABLE customers (
    customer_id BIGINT PRIMARY KEY,
    customer_name VARCHAR(100),
    account_number BIGINT,
    balance DECIMAL(12,2)
);
```

Our customer IDs are:

```
10, 20, 30, 40, 50, 60, 70, 80, 90, 100
```

We want to find a customer using:

```sql
SELECT *
FROM customers
WHERE customer_id = 50;
```

Instead of scanning all customer records, the database creates a B-Tree index on `customer_id`. For learning, we will manually simulate that index.

---

## 2. Order 4 rules

| Property | Value |
|----------|-------|
| Maximum children | 4 |
| Maximum keys | 3 |

Every node can contain:

- At least one key (except a root that can temporarily be empty).
- At most three keys.
- At most four children.

A node is simply a container that stores sorted keys. For example:

```
[20 | 40 | 60]
```

This node has three keys and can have four children.

---

## 3. Step 1 — Database receives the first customer

```sql
INSERT INTO customers VALUES
(10, 'Rahul', 123456, 5000);
```

What does the database do?

- It creates the customer record.
- It creates the index structure if it does not already exist.
- Since this is the first indexed key, it creates the first B-Tree node.
- That first node becomes the root.

```
[10]      <- Root
```

There is no child yet because we only have one key.

> **Important:** the root is not created because we have a special customer ID. It is created because the first indexed value needs somewhere to be stored.

---

## 4. Step 2 — Second customer arrives

```sql
INSERT INTO customers VALUES
(20, 'Priya', 123457, 8000);
```

The database compares:

- Existing key: 10
- New key: 20

Since 20 is greater than 10, it is inserted to the right in sorted order.

```
[10 | 20]      <- Root
```

Still one node. No child creation is necessary.

---

## 5. Step 3 — Third customer arrives

```sql
INSERT INTO customers VALUES
(30, 'Amit', 123458, 9000);
```

30 is greater than 10 and 20, so the root becomes:

```
[10 | 20 | 30]      <- Root (full)
```

Three keys is the maximum allowed in Order 4. We cannot insert any more keys into this node without splitting.

---

## 6. Step 4 — Fourth customer arrives (the important moment!)

```sql
INSERT INTO customers VALUES
(40, 'Sneha', 123459, 12000);
```

Now we have four keys:

```
10 | 20 | 30 | 40
```

But our Order 4 node can only hold three keys. **The node splits.**

For this example, we use the **upper-middle promotion** convention:

- 10 and 20 go into the left node.
- 30 is promoted to become the root.
- 40 goes into the right node.

Before splitting:

```
[10 | 20 | 30 | 40]
```

After splitting:

```
          [30]            <- Root
         /    \
 [10 | 20]    [40]
 Left child   Right child
```

The original root split into two child nodes, and a new root was created containing 30.

This is the first time child nodes are created.

> Before the split, the root was itself the only node. After the split, that old root becomes two child nodes, and a new root is created.

---

## 7. Step 5 — Fifth customer arrives

```sql
INSERT INTO customers VALUES
(50, 'Ravi', 123460, 15000);
```

Where should 50 go? Start from the root:

- Root contains 30.
- 50 is greater than 30.
- Therefore, go to the right child.
- Right child currently contains 40.
- Insert 50 there.

After inserting 50:

```
          [30]
         /    \
 [10 | 20]    [40 | 50]
```

No new child is created. We simply insert into the appropriate existing child.

---

## 8. Step 6 — Sixth and seventh customers arrive

Insert 60, then 70.

- 60 goes into the right child.
- 70 also goes into the right child.
- After inserting 60, the child becomes full.
- Inserting 70 causes overflow.

Before splitting:

```
[40 | 50 | 60 | 70]
```

Split using the upper-middle promotion convention:

- 40, 50 remain in the left part.
- 60 moves up into the parent.
- 70 becomes the new right child.

After inserting 70 and splitting:

```
              [30 | 60]            <- Root
            /     |     \
   [10 | 20]  [40 | 50]  [70]
```

The root now has two separator keys and three children.

Notice how the root changed from `[30]` to `[30 | 60]`. Why? Because 60 was promoted from the overflowing child.

---

## 9. Step 7 — Insert 80 and 90

Both are greater than 60, so they go into the third child.

```
              [30 | 60]
            /     |     \
   [10 | 20]  [40 | 50]  [70 | 80 | 90]
                          (third child is full)
```

---

## 10. Step 8 — Insert 100

100 is greater than 60, so it goes into the third child:

```
[70 | 80 | 90 | 100]
```

It overflows again! Split it:

- 70 and 80 remain in the left node.
- 90 moves to the parent.
- 100 becomes the right node.

Final B-Tree:

```
                 [30 | 60 | 90]                <- Root (3 keys)
               /     |      |      \
      [10 | 20]  [40 | 50]  [70 | 80]  [100]
       Child 1    Child 2    Child 3   Child 4
```

All nodes satisfy the Order 4 capacity rules.

---

## 11. Search for customer ID 50

```sql
SELECT *
FROM customers
WHERE customer_id = 50;
```

The database traverses the index:

1. **Root:** `[30 | 60 | 90]` — 50 is greater than 30 but less than 60.
2. Go to **Child 2:** `[40 | 50]` — compare the keys.
3. **Found.** Customer ID 50 is found. The index entry provides the reference to the customer record.

---

## 12. Summary — watch how the tree grows

| Inserted customer IDs | Root | Number of children |
|-----------------------|------|--------------------|
| 10, 20, 30 | [10, 20, 30] | 0 |
| 40 | [30] | 2 |
| 50 | [30] | 2 |
| 60, 70 | [30, 60] | 3 |
| 80, 90 | [30, 60] | 3 |
| 100 | [30, 60, 90] | 4 |

Key lessons:

- The first insertion creates the root.
- Subsequent insertions fill the appropriate node.
- When a node overflows, it splits.
- The middle key is promoted to the parent.
- If the root splits, a new root is created.

> **Implementation detail:** this is a simplified educational B-Tree. PostgreSQL's actual B-Tree index is a B+Tree-style structure with internal separator keys and leaf pages containing index entries and row references. The underlying concepts of page capacity, splitting and balancing are closely related.

**Next learning step:** manually build an Order 4 B-Tree with the insertion sequence `10, 20, 30, 40, 50, 60, 70, 80, 90, 100` on paper. That exercise will make root creation and child splitting much easier to remember.
