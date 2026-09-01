# Domain-Centric Architecture

A comprehensive guide to the four domain-centric architecture patterns — Clean Architecture, Hexagonal Architecture, Onion Architecture, and Domain-Driven Design — including every building block, their differences, how they combine, and a fully worked E-Commerce Order Management System example.

---

## Table of Contents

1. [What Is Domain-Centric Architecture?](#1-what-is-domain-centric-architecture)
2. [Clean Architecture](#2-clean-architecture)
3. [Hexagonal Architecture — Ports and Adapters](#3-hexagonal-architecture--ports-and-adapters)
4. [Onion Architecture](#4-onion-architecture)
5. [Domain-Driven Design (DDD)](#5-domain-driven-design-ddd)
6. [Strategic DDD](#6-strategic-ddd)
7. [Tactical DDD Building Blocks](#7-tactical-ddd-building-blocks)
8. [DDD Building Block Deep Dives](#8-ddd-building-block-deep-dives)
9. [Pattern Comparison: Clean vs Hexagonal vs Onion vs DDD](#9-pattern-comparison-clean-vs-hexagonal-vs-onion-vs-ddd)
10. [How They Combine](#10-how-they-combine)
11. [E-Commerce Order Management System — Full Example](#11-e-commerce-order-management-system--full-example)
12. [Interview Questions](#12-interview-questions)

---

## 1. What Is Domain-Centric Architecture?

Traditional **layered architecture** organises code by technical concern (Presentation → Business → Persistence). The problem: the **database drives the design**. Schema changes ripple up through all layers, and the "business logic" is often just data transformation code for the ORM.

**Domain-centric architecture** inverts this. The **domain model** (business logic) is at the centre and depends on nothing. Every other concern — databases, UIs, message queues, external APIs — is pushed to the **outer edges** and depends on the domain.

```
LAYERED (database-centric)        DOMAIN-CENTRIC
──────────────────────────        ──────────────────────────────
UI        ← depends on →          UI, DB, API, Queue
Service   ← depends on →               ↓
Repository ← depends on →         Application Layer
Database  ← drives the design     Domain Layer ← CENTRE
                                       ↑
                                  Everything depends on Domain
                                  Domain depends on nothing
```

### The Dependency Rule (Core Principle)

> **Dependencies always point inward — toward the domain. The domain has zero outward dependencies.**

This means:
- The Domain Layer **never imports** a database driver, HTTP library, or framework
- Outer layers (infrastructure, UI) **import** and depend on domain interfaces
- You can replace the entire database without touching a single domain class

---

## 2. Clean Architecture

### What It Is

**Clean Architecture**, coined by Robert C. Martin ("Uncle Bob") in 2012, organises code into concentric rings. Inner rings define policy (business rules). Outer rings define mechanisms (frameworks, databases, UI). **Dependencies only point inward.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLEAN ARCHITECTURE                           │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  FRAMEWORKS & DRIVERS  (outermost — most changeable)        │   │
│   │  Web, DB Drivers, UI Frameworks, External APIs              │   │
│   │                                                             │   │
│   │   ┌─────────────────────────────────────────────────────┐   │   │
│   │   │  INTERFACE ADAPTERS                                 │   │   │
│   │   │  Controllers, Presenters, Gateways, Repositories    │   │   │
│   │   │                                                     │   │   │
│   │   │   ┌─────────────────────────────────────────────┐   │   │   │
│   │   │   │  APPLICATION BUSINESS RULES                 │   │   │   │
│   │   │   │  Use Cases (Application Services)           │   │   │   │
│   │   │   │                                             │   │   │   │
│   │   │   │   ┌─────────────────────────────────────┐   │   │   │   │
│   │   │   │   │   ENTERPRISE BUSINESS RULES         │   │   │   │   │
│   │   │   │   │   Entities, Domain Objects          │   │   │   │   │
│   │   │   │   │   Business Rules (innermost)        │   │   │   │   │
│   │   │   │   └─────────────────────────────────────┘   │   │   │   │
│   │   │   └─────────────────────────────────────────────┘   │   │   │
│   │   └─────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ← — Dependencies only flow INWARD — →                            │
└─────────────────────────────────────────────────────────────────────┘
```

### The Four Rings

| Ring | Contents | Dependencies |
|---|---|---|
| **Entities** (inner) | Enterprise-wide business rules, domain objects | None — pure business logic |
| **Use Cases** | Application-specific business rules, orchestration | → Entities only |
| **Interface Adapters** | Controllers, Presenters, Repository implementations | → Use Cases, Entities |
| **Frameworks & Drivers** (outer) | DB, Web framework, UI, external services | → Interface Adapters |

### The Dependency Inversion at the Boundary

The key mechanism: when a Use Case needs to talk to the database, it defines an **interface (port)** that the outer layer implements.

```typescript
// Use Case layer defines the interface (inward-pointing)
// infrastructure/repository does NOT live here
export interface IOrderRepository {          // lives in Application/Domain layer
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// Use Case depends on the interface — never the implementation
export class PlaceOrderUseCase {
  constructor(private orderRepo: IOrderRepository) {}  // injected at runtime

  async execute(command: PlaceOrderCommand): Promise<OrderId> {
    const order = Order.create(command);
    await this.orderRepo.save(order);
    return order.id;
  }
}

// Outer layer (Infrastructure) implements the interface
export class PostgresOrderRepository implements IOrderRepository {
  async findById(id: OrderId): Promise<Order | null> { /* SQL */ }
  async save(order: Order): Promise<void> { /* SQL */ }
}
```

### When to Use Clean Architecture

- Large enterprise applications with **complex, long-lived business rules**
- Applications that may need to **change databases or frameworks**
- Teams that need **maximum testability** at the domain and use-case level
- Codebases where business logic must be **free of framework contamination**

---

## 3. Hexagonal Architecture — Ports and Adapters

### What It Is

**Hexagonal Architecture** (coined by Alistair Cockburn in 2005, also called Ports and Adapters) visualises the application as a hexagon. The **application core** sits in the middle. The outside world communicates with the core via **Ports** (interfaces). **Adapters** implement those ports for specific technologies.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HEXAGONAL ARCHITECTURE                           │
│                                                                     │
│         REST API        CLI          Test Driver                   │
│            │             │                │                        │
│            ▼             ▼                ▼                        │
│      ┌─────────────────────────────────────────┐                   │
│      │         DRIVING ADAPTERS                │                   │
│      │   (Left side — callers of the app)      │                   │
│      └──────────────┬──────────────────────────┘                   │
│                     │ calls via                                     │
│                     ▼                                               │
│             ┌──────────────┐                                        │
│             │  INPUT PORTS │ (interfaces defined by the app)        │
│             └──────┬───────┘                                        │
│                    │                                                │
│      ┌─────────────▼────────────────────────────┐                  │
│      │                                          │                  │
│      │         APPLICATION CORE                 │                  │
│      │   (Use Cases + Domain Model)             │                  │
│      │   No framework, no DB, no HTTP           │                  │
│      │                                          │                  │
│      └─────────────┬────────────────────────────┘                  │
│                    │                                                │
│             ┌──────▼───────┐                                        │
│             │ OUTPUT PORTS │ (interfaces defined by the app)        │
│             └──────┬───────┘                                        │
│                    │ implemented by                                 │
│      ┌─────────────▼──────────────────────────┐                    │
│      │        DRIVEN ADAPTERS                 │                    │
│      │  (Right side — called by the app)      │                    │
│      └────────────────────────────────────────┘                    │
│             │              │             │                          │
│             ▼              ▼             ▼                          │
│         PostgreSQL       Redis       Stripe API                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Ports vs Adapters

| Concept | Definition | Example |
|---|---|---|
| **Input Port** | Interface the application **exposes** to the outside world (driven by callers) | `IOrderService`, `IPlaceOrderUseCase` |
| **Output Port** | Interface the application **requires** from the outside world (calls dependencies) | `IOrderRepository`, `IPaymentGateway`, `IEmailSender` |
| **Driving Adapter** | Translates external input into calls to Input Ports | `OrderController` (REST), `OrderConsumer` (Kafka), `OrderCLI` |
| **Driven Adapter** | Implements Output Ports for specific technology | `PostgresOrderRepository`, `StripePaymentAdapter`, `SendGridEmailAdapter` |

### The Key Insight: Two Sides

- **Left side (Driving/Primary Adapters)**: *Actors that drive the application* — REST controllers, CLI commands, message consumers, test drivers. They call the application's Input Ports.
- **Right side (Driven/Secondary Adapters)**: *Actors driven by the application* — databases, external APIs, email services. The application calls them through Output Ports.

```typescript
// ── Input Port (defined by application) ────────────────────────────
export interface IPlaceOrderUseCase {
  execute(command: PlaceOrderCommand): Promise<PlaceOrderResult>;
}

// ── Driving Adapter (REST) ──────────────────────────────────────────
@Controller('/orders')
export class OrderController {
  constructor(
    @Inject(IPlaceOrderUseCase) private useCase: IPlaceOrderUseCase
  ) {}

  @Post()
  async placeOrder(@Body() dto: PlaceOrderDto): Promise<PlaceOrderResult> {
    return this.useCase.execute(new PlaceOrderCommand(dto));
  }
}

// ── Driving Adapter (Kafka Consumer) ──────────────────────────────────
export class OrderKafkaConsumer {
  constructor(private useCase: IPlaceOrderUseCase) {}

  async onMessage(message: KafkaMessage): Promise<void> {
    const command = PlaceOrderCommand.fromKafkaMessage(message);
    await this.useCase.execute(command);
  }
}

// ── Output Port (defined by application) ───────────────────────────
export interface IOrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
}

// ── Driven Adapter (PostgreSQL) ────────────────────────────────────
export class PostgresOrderRepository implements IOrderRepository {
  constructor(private db: DatabaseConnection) {}

  async save(order: Order): Promise<void> {
    await this.db.query(
      'INSERT INTO orders (id, status, total) VALUES ($1, $2, $3)',
      [order.id.value, order.status.value, order.total.amount]
    );
  }

  async findById(id: OrderId): Promise<Order | null> {
    const row = await this.db.query('SELECT * FROM orders WHERE id = $1', [id.value]);
    return row ? OrderMapper.toDomain(row) : null;
  }
}

// ── The Application Core (Use Case) — no framework, no DB ─────────
export class PlaceOrderUseCase implements IPlaceOrderUseCase {
  constructor(
    private orderRepo: IOrderRepository,         // Output Port
    private inventoryPort: IInventoryPort,        // Output Port
    private paymentPort: IPaymentPort             // Output Port
  ) {}

  async execute(command: PlaceOrderCommand): Promise<PlaceOrderResult> {
    // Pure domain logic — no SQL, no HTTP, no framework
    const order = Order.create(command.items, command.customerId);
    await this.inventoryPort.reserve(order.items);
    await this.orderRepo.save(order);
    return new PlaceOrderResult(order.id);
  }
}
```

---

## 4. Onion Architecture

### What It Is

**Onion Architecture** (coined by Jeffrey Palermo in 2008) is similar to Clean Architecture but adds explicit concentric layers named after DDD concepts. Like peeling an onion — inner layers have no knowledge of outer layers.

```
┌──────────────────────────────────────────────────────────────────┐
│                       ONION ARCHITECTURE                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  INFRASTRUCTURE (outermost)                                │  │
│  │  UI, DB, File System, External Services, Tests             │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  APPLICATION SERVICES                                │  │  │
│  │  │  Use Cases, Orchestration, DTO Mapping               │  │  │
│  │  │                                                      │  │  │
│  │  │  ┌────────────────────────────────────────────────┐  │  │  │
│  │  │  │  DOMAIN SERVICES                               │  │  │  │
│  │  │  │  Domain logic spanning multiple Aggregates     │  │  │  │
│  │  │  │                                                │  │  │  │
│  │  │  │  ┌──────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │        DOMAIN MODEL (innermost)          │  │  │  │  │
│  │  │  │  │  Entities, Value Objects, Aggregates     │  │  │  │  │
│  │  │  │  │  Repository Interfaces                   │  │  │  │  │
│  │  │  │  │  Domain Events                           │  │  │  │  │
│  │  │  │  │  NO external dependencies                │  │  │  │  │
│  │  │  │  └──────────────────────────────────────────┘  │  │  │  │
│  │  │  └────────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  All dependencies point toward the CENTRE.                      │
└──────────────────────────────────────────────────────────────────┘
```

### Onion Layers from Inside Out

| Layer | Contents | Rule |
|---|---|---|
| **Domain Model** | Entities, Value Objects, Aggregates, Domain Events, Repository interfaces | Zero external dependencies |
| **Domain Services** | Domain logic requiring multiple aggregates or coordination | Depends only on Domain Model |
| **Application Services** | Use cases, orchestration, DTO mapping, transaction boundaries | Depends on Domain Model + Domain Services |
| **Infrastructure** | Controllers, DB adapters, external APIs, UI, test harnesses | Depends on Application Services (for DI) and implements domain interfaces |

---

## 5. Domain-Driven Design (DDD)

### What It Is

**Domain-Driven Design** (coined by Eric Evans in his 2003 "Blue Book") is a software development approach, not just an architecture pattern. It focuses on building software that deeply reflects the **business domain** it models, using a **Ubiquitous Language** shared by developers and domain experts.

DDD has two levels:
- **Strategic DDD** — *where* to draw boundaries (Bounded Contexts, Context Maps)
- **Tactical DDD** — *how* to model within a boundary (Aggregates, Entities, Value Objects, etc.)

### Core Philosophy

```
Traditional approach:
  Developer asks: "How do I store this in a database?"
  Domain becomes: "User", "Record", "Row", "CRUD"

DDD approach:
  Developer asks: "What does the business expert call this?"
  Domain becomes: "Order", "Customer", "Shipment", "Invoice", "PlaceOrder"

The code reads like the business speaks.
```

### Ubiquitous Language

The **Ubiquitous Language** is a shared vocabulary between developers and domain experts used consistently in code, documentation, conversations, and tests.

```
❌ Without Ubiquitous Language:
   DB: user_order_records table
   Code: class OrderDTO
   Business: "The purchase confirmation"
   → Everyone means the same thing but uses different words

✅ With Ubiquitous Language:
   DB: orders table
   Code: class Order
   Business: "Order"
   Tests: "When a customer places an order..."
   → Same word everywhere
```

---

## 6. Strategic DDD

### Bounded Context

A **Bounded Context** is an explicit boundary within which a specific domain model applies. The same word (e.g., "Customer") may mean completely different things in different Bounded Contexts.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    E-COMMERCE BOUNDED CONTEXTS                       │
│                                                                      │
│  ┌───────────────────┐    ┌───────────────────┐    ┌──────────────┐  │
│  │  ORDER CONTEXT    │    │  INVENTORY CONTEXT│    │ PAYMENT CTX  │  │
│  │                   │    │                   │    │              │  │
│  │  Customer:        │    │  Customer:        │    │  Customer:   │  │
│  │  name, address,   │    │  not a concept    │    │  billing     │  │
│  │  order history    │    │  here             │    │  address,    │  │
│  │                   │    │                   │    │  card info   │  │
│  │  Order:           │    │  Product:         │    │              │  │
│  │  items, status,   │    │  SKU, stock level,│    │  Payment:    │  │
│  │  shipping addr    │    │  warehouse loc    │    │  amount,     │  │
│  │                   │    │                   │    │  status,     │  │
│  │  Product:         │    │  StockReservation │    │  gateway ref │  │
│  │  name, price,     │    │                   │    │              │  │
│  │  display image    │    │                   │    │              │  │
│  └─────────┬─────────┘    └─────────┬─────────┘    └──────┬───────┘  │
│            │                        │                      │          │
│            └────────────────────────┴──────────────────────┘          │
│                        Context Map / Integration                       │
└──────────────────────────────────────────────────────────────────────┘

"Product" in Order Context = display data (name, price)
"Product" in Inventory Context = stock data (SKU, warehouse)
Same word — completely different model — different Bounded Context
```

### Context Map

A **Context Map** documents how Bounded Contexts relate to each other:

| Relationship Pattern | Meaning |
|---|---|
| **Shared Kernel** | Two contexts share a subset of the domain model (risky — tight coupling) |
| **Customer-Supplier** | Downstream context (customer) depends on upstream context (supplier) |
| **Conformist** | Downstream adopts upstream's model without translation |
| **Anti-Corruption Layer (ACL)** | Downstream translates upstream's model into its own language (recommended) |
| **Published Language** | Upstream publishes a well-defined integration language (events, API schema) |
| **Separate Ways** | Contexts have no integration — fully independent |
| **Open Host Service** | Upstream provides a protocol/API for multiple downstreams |

```
Order Context ──────(Customer-Supplier)──────► Inventory Context
     │                                                 │
     │         Anti-Corruption Layer                   │
     └──── translates InventoryEvent ────► into ───────┘
           StockReservedEvent (Order Context language)
```

---

## 7. Tactical DDD Building Blocks

```
┌─────────────────────────────────────────────────────────────────────┐
│                   TACTICAL DDD BUILDING BLOCKS                      │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                     AGGREGATE                               │  │
│   │   Consistency boundary — all changes go through the root    │  │
│   │                                                             │  │
│   │   ┌─────────────────────┐    ┌─────────────────────────┐   │  │
│   │   │   AGGREGATE ROOT    │    │       ENTITY             │   │  │
│   │   │   (Entity + Entry   │    │   Has identity (ID)      │   │  │
│   │   │    point)           │    │   Lifecycle, mutable     │   │  │
│   │   │   Order             │────│   OrderLine              │   │  │
│   │   └─────────────────────┘    └─────────────────────────┘   │  │
│   │                                                             │  │
│   │   ┌──────────────────────┐   ┌──────────────────────────┐   │  │
│   │   │    VALUE OBJECT      │   │      DOMAIN EVENT        │   │  │
│   │   │  No identity         │   │  Something that happened │   │  │
│   │   │  Immutable           │   │  OrderPlaced             │   │  │
│   │   │  Money, Address,     │   │  PaymentReceived         │   │  │
│   │   │  OrderId             │   │  ItemShipped             │   │  │
│   │   └──────────────────────┘   └──────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   REPOSITORY ──► persists and retrieves Aggregates                 │
│   DOMAIN SERVICE ──► logic spanning multiple Aggregates            │
│   APPLICATION SERVICE ──► orchestrates use cases (thin layer)      │
│   FACTORY ──► complex Aggregate construction logic                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. DDD Building Block Deep Dives

### Entity

An **Entity** has a **unique identity** that persists through its entire lifecycle. Two entities with the same attributes but different IDs are different entities.

```typescript
// ── Entity Base Class ─────────────────────────────────────────────
export abstract class Entity<TId> {
  constructor(public readonly id: TId) {}

  equals(other: Entity<TId>): boolean {
    return this.id === other.id;      // identity-based equality
  }
}

// ── OrderLine Entity ──────────────────────────────────────────────
export class OrderLine extends Entity<OrderLineId> {
  private _quantity: Quantity;
  private _unitPrice: Money;

  constructor(
    id: OrderLineId,
    public readonly productId: ProductId,
    quantity: Quantity,
    unitPrice: Money
  ) {
    super(id);
    this._quantity = quantity;
    this._unitPrice = unitPrice;
  }

  get subtotal(): Money {
    return this._unitPrice.multiply(this._quantity.value);
  }

  updateQuantity(newQty: Quantity): void {
    if (newQty.value <= 0) throw new DomainError('Quantity must be positive');
    this._quantity = newQty;
  }

  get quantity(): Quantity { return this._quantity; }
  get unitPrice(): Money { return this._unitPrice; }
}
```

### Value Object

A **Value Object** has **no identity** — it is defined entirely by its attributes. Two Value Objects with the same attributes are equal. Value Objects are **immutable** — operations return new instances.

```typescript
// ── Money Value Object ────────────────────────────────────────────
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    if (amount < 0) throw new DomainError('Amount cannot be negative');
    if (!currency || currency.length !== 3) throw new DomainError('Invalid currency code');
    Object.freeze(this);    // immutable
  }

  static of(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);  // new instance
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.amount > this.amount) throw new DomainError('Insufficient funds');
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency)
      throw new DomainError(`Currency mismatch: ${this.currency} vs ${other.currency}`);
  }

  toString(): string { return `${this.currency} ${this.amount.toFixed(2)}`; }
}

// ── Address Value Object ──────────────────────────────────────────
export class Address {
  private constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly postcode: string,
    public readonly country: string
  ) {
    Object.freeze(this);
  }

  static create(street: string, city: string, postcode: string, country: string): Address {
    if (!street || !city || !postcode || !country)
      throw new DomainError('All address fields are required');
    return new Address(street, city, postcode, country);
  }

  equals(other: Address): boolean {
    return this.street === other.street &&
           this.city === other.city &&
           this.postcode === other.postcode &&
           this.country === other.country;
  }

  withUpdatedPostcode(postcode: string): Address {
    return new Address(this.street, this.city, postcode, this.country); // new instance
  }
}

// ── Strongly-typed ID Value Object ─────────────────────────────────
export class OrderId {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static generate(): OrderId {
    return new OrderId(crypto.randomUUID());
  }

  static from(value: string): OrderId {
    if (!value || value.trim().length === 0) throw new DomainError('OrderId cannot be empty');
    return new OrderId(value);
  }

  equals(other: OrderId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
```

### Aggregate

An **Aggregate** is a cluster of Entities and Value Objects treated as a single consistency unit. It has an **Aggregate Root** — the only entry point for external code. All business invariants (rules) within the Aggregate are enforced by the Root.

```typescript
// ── Order Aggregate ───────────────────────────────────────────────
export class Order extends Entity<OrderId> {
  private _lines: OrderLine[] = [];
  private _status: OrderStatus;
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    id: OrderId,
    public readonly customerId: CustomerId,
    public readonly shippingAddress: Address,
    status: OrderStatus
  ) {
    super(id);
    this._status = status;
  }

  // ── Factory method (named constructor) ───────────────────────────
  static create(customerId: CustomerId, shippingAddress: Address): Order {
    const order = new Order(
      OrderId.generate(),
      customerId,
      shippingAddress,
      OrderStatus.PENDING
    );
    order._domainEvents.push(new OrderCreatedEvent(order.id, customerId));
    return order;
  }

  static reconstitute(
    id: OrderId,
    customerId: CustomerId,
    shippingAddress: Address,
    status: OrderStatus,
    lines: OrderLine[]
  ): Order {
    const order = new Order(id, customerId, shippingAddress, status);
    order._lines = lines;
    return order;
  }

  // ── Business behaviour (invariants enforced) ─────────────────────
  addItem(productId: ProductId, quantity: Quantity, unitPrice: Money): void {
    this.assertStatus(OrderStatus.PENDING, 'Can only add items to a pending order');

    const existingLine = this._lines.find(l => l.productId.equals(productId));
    if (existingLine) {
      existingLine.updateQuantity(Quantity.of(existingLine.quantity.value + quantity.value));
    } else {
      const line = new OrderLine(
        OrderLineId.generate(), productId, quantity, unitPrice
      );
      this._lines.push(line);
    }
  }

  removeItem(productId: ProductId): void {
    this.assertStatus(OrderStatus.PENDING, 'Can only remove items from a pending order');
    const index = this._lines.findIndex(l => l.productId.equals(productId));
    if (index === -1) throw new DomainError('Item not found in order');
    this._lines.splice(index, 1);
  }

  confirm(): void {
    this.assertStatus(OrderStatus.PENDING, 'Only pending orders can be confirmed');
    if (this._lines.length === 0) throw new DomainError('Cannot confirm an empty order');
    this._status = OrderStatus.CONFIRMED;
    this._domainEvents.push(new OrderConfirmedEvent(this.id, this.customerId, this.total));
  }

  ship(): void {
    this.assertStatus(OrderStatus.CONFIRMED, 'Only confirmed orders can be shipped');
    this._status = OrderStatus.SHIPPED;
    this._domainEvents.push(new OrderShippedEvent(this.id));
  }

  cancel(): void {
    if (this._status === OrderStatus.SHIPPED)
      throw new DomainError('Cannot cancel a shipped order');
    this._status = OrderStatus.CANCELLED;
    this._domainEvents.push(new OrderCancelledEvent(this.id, this.customerId));
  }

  // ── Computed properties ───────────────────────────────────────────
  get total(): Money {
    return this._lines.reduce(
      (sum, line) => sum.add(line.subtotal),
      Money.of(0, 'GBP')
    );
  }

  get lines(): ReadonlyArray<OrderLine> { return [...this._lines]; }
  get status(): OrderStatus { return this._status; }

  // ── Domain Events ─────────────────────────────────────────────────
  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  // ── Private invariant guard ────────────────────────────────────────
  private assertStatus(expected: OrderStatus, message: string): void {
    if (this._status !== expected) throw new DomainError(message);
  }
}
```

### Domain Events

**Domain Events** represent something that happened in the domain — past tense, immutable facts.

```typescript
// ── Base Domain Event ─────────────────────────────────────────────
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: string;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = crypto.randomUUID();
  }
}

// ── Specific Domain Events ────────────────────────────────────────
export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: OrderId,
    public readonly customerId: CustomerId
  ) { super(); }
}

export class OrderConfirmedEvent extends DomainEvent {
  constructor(
    public readonly orderId: OrderId,
    public readonly customerId: CustomerId,
    public readonly total: Money
  ) { super(); }
}

export class OrderShippedEvent extends DomainEvent {
  constructor(public readonly orderId: OrderId) { super(); }
}

export class OrderCancelledEvent extends DomainEvent {
  constructor(
    public readonly orderId: OrderId,
    public readonly customerId: CustomerId
  ) { super(); }
}
```

### Domain Service

A **Domain Service** contains domain logic that **doesn't naturally belong to any single Aggregate** — typically because it involves multiple Aggregates or requires coordination.

```typescript
// ── Pricing Domain Service ─────────────────────────────────────────
// Applies discount rules that involve both the Customer and the Order
export class OrderPricingService {
  constructor(
    private readonly discountPolicy: IDiscountPolicy
  ) {}

  calculateDiscount(order: Order, customer: Customer): Money {
    // Logic involves both Order AND Customer → belongs in Domain Service
    if (customer.isPremium() && order.total.amount > 100) {
      return this.discountPolicy.getPremiumDiscount(order.total);
    }
    if (order.lines.length > 10) {
      return this.discountPolicy.getBulkDiscount(order.total);
    }
    return Money.of(0, order.total.currency);
  }
}

// ── Inventory Allocation Service ───────────────────────────────────
// Spans Order + Inventory aggregates (different contexts → via port)
export class InventoryAllocationService {
  constructor(private inventoryPort: IInventoryPort) {}

  async allocateStock(order: Order): Promise<void> {
    for (const line of order.lines) {
      const available = await this.inventoryPort.getAvailableStock(line.productId);
      if (available < line.quantity.value) {
        throw new DomainError(
          `Insufficient stock for product ${line.productId.value}: ` +
          `need ${line.quantity.value}, have ${available}`
        );
      }
    }
    await this.inventoryPort.reserve(
      order.lines.map(l => ({ productId: l.productId, quantity: l.quantity.value }))
    );
  }
}
```

### Application Service

An **Application Service** (Use Case) **orchestrates** the domain — it has no business logic of its own. It fetches Aggregates from repositories, calls domain methods, publishes domain events, and persists results. It is the entry point for use cases.

```typescript
// ── Place Order Application Service ──────────────────────────────
export class PlaceOrderApplicationService {
  constructor(
    private orderRepository: IOrderRepository,
    private customerRepository: ICustomerRepository,
    private inventoryAllocationService: InventoryAllocationService,
    private pricingService: OrderPricingService,
    private eventPublisher: IDomainEventPublisher
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderResult> {
    // 1. Fetch required aggregates
    const customer = await this.customerRepository.findById(command.customerId);
    if (!customer) throw new ApplicationError('Customer not found');

    // 2. Create the Order Aggregate
    const order = Order.create(
      command.customerId,
      Address.create(command.street, command.city, command.postcode, command.country)
    );

    // 3. Add items (domain logic enforced inside Aggregate)
    for (const item of command.items) {
      order.addItem(
        ProductId.from(item.productId),
        Quantity.of(item.quantity),
        Money.of(item.unitPrice, 'GBP')
      );
    }

    // 4. Apply pricing (Domain Service)
    const discount = this.pricingService.calculateDiscount(order, customer);

    // 5. Allocate inventory (Domain Service)
    await this.inventoryAllocationService.allocateStock(order);

    // 6. Confirm the order
    order.confirm();

    // 7. Persist the aggregate
    await this.orderRepository.save(order);

    // 8. Publish domain events
    const events = order.pullDomainEvents();
    await this.eventPublisher.publishAll(events);

    return new PlaceOrderResult(order.id.value, order.total.amount, discount.amount);
  }
}
```

### Repository

A **Repository** provides the **illusion of an in-memory collection** for Aggregates. It abstracts all persistence details. The interface lives in the Domain layer; the implementation lives in Infrastructure.

```typescript
// ── Repository Interface (Domain Layer) ──────────────────────────
export interface IOrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: CustomerId): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  save(order: Order): Promise<void>;
  remove(id: OrderId): Promise<void>;
  nextId(): OrderId;
}

// ── Repository Implementation (Infrastructure Layer) ─────────────
export class PostgresOrderRepository implements IOrderRepository {
  constructor(private db: Pool) {}

  async findById(id: OrderId): Promise<Order | null> {
    const result = await this.db.query(
      `SELECT o.*, ol.id as line_id, ol.product_id, ol.quantity, ol.unit_price
       FROM orders o
       LEFT JOIN order_lines ol ON o.id = ol.order_id
       WHERE o.id = $1`,
      [id.value]
    );
    if (result.rows.length === 0) return null;
    return OrderMapper.toDomain(result.rows);
  }

  async save(order: Order): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO orders (id, customer_id, status, street, city, postcode, country, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (id) DO UPDATE SET status = $3`,
        [order.id.value, order.customerId.value, order.status.value,
         order.shippingAddress.street, order.shippingAddress.city,
         order.shippingAddress.postcode, order.shippingAddress.country]
      );
      // Delete and re-insert lines (simple approach)
      await client.query('DELETE FROM order_lines WHERE order_id = $1', [order.id.value]);
      for (const line of order.lines) {
        await client.query(
          `INSERT INTO order_lines (id, order_id, product_id, quantity, unit_price, currency)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [line.id.value, order.id.value, line.productId.value,
           line.quantity.value, line.unitPrice.amount, line.unitPrice.currency]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findByCustomerId(customerId: CustomerId): Promise<Order[]> {
    const result = await this.db.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId.value]
    );
    return Promise.all(result.rows.map(row => this.findById(OrderId.from(row.id))));
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> { /* similar */ return []; }
  async remove(id: OrderId): Promise<void> {
    await this.db.query('DELETE FROM orders WHERE id = $1', [id.value]);
  }
  nextId(): OrderId { return OrderId.generate(); }
}
```

---

## 9. Pattern Comparison: Clean vs Hexagonal vs Onion vs DDD

### Visual Mapping

```
┌──────────────────────────────────────────────────────────────────────┐
│         HOW THE FOUR PATTERNS MAP TO EACH OTHER                      │
│                                                                      │
│   CLEAN ARCH          HEXAGONAL              ONION           DDD    │
│   ───────────         ─────────────          ──────          ──── │
│                                                                      │
│   Entities        =  App Core (Domain)   =  Domain Model  = Entities+│
│                                                               VOs+   │
│                                                               Aggregates│
│                                                                      │
│   Use Cases       =  App Core (UseCases) =  App Services  = Application│
│                                                               Services │
│                                                                      │
│   Interface       =  Adapters            =  Infrastructure = Repositories│
│   Adapters                                                  (implementations)│
│                                                                      │
│   Frameworks      =  Adapters (outer)    =  Infrastructure = Infrastructure│
│   & Drivers                                                           │
│                                                                      │
│   Dependency      =  Ports               =  Interfaces     = Repository│
│   Inversion                                defined in       Interfaces│
│   Abstractions                            Domain            in Domain │
└──────────────────────────────────────────────────────────────────────┘
```

### Side-by-Side Comparison Table

| Dimension | Clean Architecture | Hexagonal / Ports & Adapters | Onion Architecture | DDD |
|---|---|---|---|---|
| **Primary focus** | Dependency rule — concentric rings | Input/Output ports symmetry | Layered rings with DDD naming | Domain modelling language and patterns |
| **Origin** | Robert C. Martin, 2012 | Alistair Cockburn, 2005 | Jeffrey Palermo, 2008 | Eric Evans, 2003 |
| **Key insight** | Dependencies only point inward | Driving vs Driven adapters | Domain at centre, infrastructure outermost | Ubiquitous Language + Bounded Contexts |
| **Defines architecture structure?** | Yes (4 rings) | Yes (hexagon + ports) | Yes (4 concentric rings) | No — defines modelling vocabulary |
| **Defines modelling vocabulary?** | No | No | Partially (uses DDD terms) | Yes (Entity, VO, Aggregate, etc.) |
| **Prescribes DB design?** | No | No | No | Yes — DB is implementation detail |
| **Can they be combined?** | Yes — use DDD tactics inside | Yes — ports are DDD repositories/services | Yes — naturally uses DDD tactics | Yes — DDD tactics fit inside all three |
| **Language/framework agnostic?** | Yes | Yes | Yes | Yes |
| **Strategic design?** | No | No | No | Yes (Bounded Contexts, Context Maps) |
| **Best used with** | Large enterprise apps | Pluggable infrastructure | DDD-flavoured Clean Arch | Any of the three patterns above |

### Key Differences Explained

**Clean Architecture** vs **Hexagonal**:
> They are **very similar in spirit**. Clean Architecture uses the term "Interface Adapters" and organises code in concentric rings. Hexagonal explicitly names the two sides (Driving/Driven) and uses the Port metaphor. Hexagonal has a richer vocabulary for distinguishing who initiates communication.

**Hexagonal** vs **Onion**:
> Onion Architecture explicitly uses DDD terminology (Domain Model, Domain Services, Application Services). Hexagonal is more general — the App Core can be anything. Onion is Hexagonal with DDD naming.

**Clean/Hexagonal/Onion** vs **DDD**:
> The first three are **architecture patterns** (how to structure and layer code). DDD is a **design approach** (how to model the domain). DDD provides the vocabulary (Entities, Aggregates, Value Objects) that lives inside the inner ring of Clean/Hexagonal/Onion.

---

## 10. How They Combine

The most powerful approach combines all four:

```
STRATEGIC DDD  →  defines Bounded Contexts (service/module boundaries)
     +
CLEAN ARCHITECTURE → defines the ring structure within each Bounded Context
     +
HEXAGONAL  →  defines how external systems connect (Ports + Adapters)
     +
TACTICAL DDD  →  defines what lives in the Domain ring (Entities, VOs, Aggregates)

Result: A well-bounded, deeply modelled, infrastructure-independent system
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│            COMBINED ARCHITECTURE (per Bounded Context)                  │
│                                                                         │
│  DRIVING ADAPTERS (Hexagonal left side)                                 │
│  REST Controller │ Kafka Consumer │ GraphQL Resolver │ CLI │ Tests      │
│        │                │               │             │      │          │
│        └────────────────┴───────────────┴─────────────┴──────┘          │
│                                    │ calls via Input Ports               │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              APPLICATION LAYER (Clean Arch Use Cases)           │    │
│  │  PlaceOrderUseCase │ CancelOrderUseCase │ GetOrderUseCase       │    │
│  │  ─── orchestrates, no business logic, thin ───                  │    │
│  │                    │                                            │    │
│  │  ┌─────────────────▼───────────────────────────────────────┐   │    │
│  │  │           DOMAIN LAYER (Tactical DDD)                   │   │    │
│  │  │  ┌───────────────────────────────────────────────────┐  │   │    │
│  │  │  │  AGGREGATES                                       │  │   │    │
│  │  │  │  Order ─── OrderLine (Entity)                     │  │   │    │
│  │  │  │  Customer (in Customer context)                   │  │   │    │
│  │  │  └───────────────────────────────────────────────────┘  │   │    │
│  │  │  ┌───────────────────────────────────────────────────┐  │   │    │
│  │  │  │  VALUE OBJECTS                                    │  │   │    │
│  │  │  │  Money  │  Address  │  OrderId  │  Quantity       │  │   │    │
│  │  │  └───────────────────────────────────────────────────┘  │   │    │
│  │  │  ┌───────────────────────────────────────────────────┐  │   │    │
│  │  │  │  DOMAIN SERVICES                                  │  │   │    │
│  │  │  │  OrderPricingService │ InventoryAllocationService  │  │   │    │
│  │  │  └───────────────────────────────────────────────────┘  │   │    │
│  │  │  ┌───────────────────────────────────────────────────┐  │   │    │
│  │  │  │  OUTPUT PORTS (Hexagonal / Repository interfaces) │  │   │    │
│  │  │  │  IOrderRepository │ IPaymentPort │ IInventoryPort  │  │   │    │
│  │  │  └───────────────────────────────────────────────────┘  │   │    │
│  │  │  ┌───────────────────────────────────────────────────┐  │   │    │
│  │  │  │  DOMAIN EVENTS                                    │  │   │    │
│  │  │  │  OrderCreated │ OrderConfirmed │ OrderShipped      │  │   │    │
│  │  │  └───────────────────────────────────────────────────┘  │   │    │
│  │  └─────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │ calls via Output Ports              │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │           DRIVEN ADAPTERS (Hexagonal right side / Infrastructure)│    │
│  │  PostgresOrderRepository │ StripePaymentAdapter │ EmailAdapter  │    │
│  │  RedisInventoryAdapter   │ KafkaEventPublisher  │ S3FileStorage │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│        │                │               │             │                  │
│        ▼                ▼               ▼             ▼                  │
│   PostgreSQL         Stripe API      Redis         Kafka                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. E-Commerce Order Management System — Full Example

### System Overview

A realistic E-Commerce Order Management System built using the combined approach:

```
Customer places order via:
 - REST API (web browser checkout)
 - Event (from Shopping Cart service)
 - CLI (admin override)

The system must:
 - Validate order items
 - Check inventory
 - Apply pricing / discounts
 - Process payment
 - Persist the order
 - Notify customer
 - Publish events for downstream services
```

### Complete Folder Structure

```
src/
├── order-context/                          ← Bounded Context (Strategic DDD)
│   ├── domain/                             ← Domain Ring (Tactical DDD)
│   │   ├── aggregates/
│   │   │   └── order/
│   │   │       ├── order.aggregate.ts      ← Aggregate Root
│   │   │       ├── order-line.entity.ts    ← Entity
│   │   │       └── order.status.ts        ← Enum / Value Object
│   │   ├── value-objects/
│   │   │   ├── money.vo.ts
│   │   │   ├── address.vo.ts
│   │   │   ├── order-id.vo.ts
│   │   │   └── quantity.vo.ts
│   │   ├── events/
│   │   │   ├── order-created.event.ts
│   │   │   ├── order-confirmed.event.ts
│   │   │   └── order-shipped.event.ts
│   │   ├── services/
│   │   │   ├── order-pricing.service.ts    ← Domain Service
│   │   │   └── inventory-allocation.service.ts
│   │   └── ports/                          ← Output Ports (Hexagonal)
│   │       ├── order-repository.port.ts    ← IOrderRepository
│   │       ├── payment.port.ts             ← IPaymentPort
│   │       ├── inventory.port.ts           ← IInventoryPort
│   │       └── event-publisher.port.ts     ← IDomainEventPublisher
│   │
│   ├── application/                        ← Application Ring (Use Cases)
│   │   ├── use-cases/
│   │   │   ├── place-order/
│   │   │   │   ├── place-order.command.ts
│   │   │   │   ├── place-order.result.ts
│   │   │   │   └── place-order.use-case.ts
│   │   │   ├── cancel-order/
│   │   │   │   └── cancel-order.use-case.ts
│   │   │   └── get-order/
│   │   │       └── get-order.use-case.ts
│   │   └── ports/                          ← Input Ports (Hexagonal)
│   │       ├── place-order.port.ts         ← IPlaceOrderUseCase
│   │       └── cancel-order.port.ts
│   │
│   └── infrastructure/                     ← Outer Ring / Adapters
│       ├── driving/                        ← Driving Adapters
│       │   ├── http/
│       │   │   └── order.controller.ts     ← REST Adapter
│       │   ├── kafka/
│       │   │   └── cart-checkout.consumer.ts ← Kafka Adapter
│       │   └── cli/
│       │       └── order-admin.cli.ts      ← CLI Adapter
│       └── driven/                         ← Driven Adapters
│           ├── persistence/
│           │   ├── postgres-order.repository.ts  ← DB Adapter
│           │   └── order.mapper.ts
│           ├── payment/
│           │   └── stripe-payment.adapter.ts
│           ├── inventory/
│           │   └── redis-inventory.adapter.ts
│           └── events/
│               └── kafka-event-publisher.ts
│
└── shared-kernel/                          ← Shared across contexts
    ├── domain-event.base.ts
    ├── entity.base.ts
    ├── value-object.base.ts
    └── aggregate.base.ts
```

### End-to-End Request Flow

```
UI (React Checkout Page)
    │
    │  POST /api/orders
    │  { customerId, items: [{productId, qty, price}], address }
    │
    ▼
[DRIVING ADAPTER] OrderController (infrastructure/driving/http)
    │
    │  validates HTTP request shape (DTO validation)
    │  translates DTO → PlaceOrderCommand
    │
    ▼
[INPUT PORT] IPlaceOrderUseCase.execute(command)
    │
    ▼
[APPLICATION SERVICE] PlaceOrderApplicationService
    │
    ├── customerRepository.findById(customerId)   ← OUTPUT PORT call
    │       └── PostgresCustomerRepository         ← DRIVEN ADAPTER
    │
    ├── Order.create(customerId, address)          ← DOMAIN (Aggregate)
    │
    ├── order.addItem(productId, qty, price)       ← DOMAIN (invariant check)
    │   order.addItem(...)                         ← DOMAIN
    │
    ├── pricingService.calculateDiscount(order, customer) ← DOMAIN SERVICE
    │
    ├── inventoryAllocationService.allocateStock(order)   ← DOMAIN SERVICE
    │       └── inventoryPort.reserve(items)        ← OUTPUT PORT call
    │               └── RedisInventoryAdapter        ← DRIVEN ADAPTER
    │
    ├── order.confirm()                            ← DOMAIN (status change + event)
    │
    ├── orderRepository.save(order)                ← OUTPUT PORT call
    │       └── PostgresOrderRepository            ← DRIVEN ADAPTER
    │               └── BEGIN TRANSACTION
    │               └── INSERT orders
    │               └── INSERT order_lines
    │               └── COMMIT
    │
    ├── eventPublisher.publishAll(order.pullDomainEvents())  ← OUTPUT PORT
    │       └── KafkaEventPublisher                ← DRIVEN ADAPTER
    │               └── Publishes: OrderConfirmedEvent
    │                   → Inventory Context subscribes (reduces stock)
    │                   → Notification Context subscribes (sends email)
    │                   → Shipping Context subscribes (creates shipment)
    │
    └── returns PlaceOrderResult { orderId, total, discount }
    │
    ▼
[DRIVING ADAPTER] OrderController
    │  maps result → HTTP response DTO
    │
    ▼
HTTP 201 Created
{ orderId: "uuid", total: 149.99, discount: 15.00 }
    │
    ▼
UI (shows order confirmation to customer)
```

### Domain Events Propagation

```
OrderConfirmedEvent published to Kafka
    │
    ├── Inventory Context
    │   KafkaConsumer → ReduceStockUseCase → InventoryAggregate.deductStock()
    │
    ├── Notification Context
    │   KafkaConsumer → SendOrderConfirmationUseCase → EmailAdapter → SendGrid
    │
    └── Shipping Context
        KafkaConsumer → CreateShipmentUseCase → ShipmentAggregate.create()
```

### Unit Testing the Domain (Zero dependencies)

```typescript
// order.aggregate.spec.ts — tests domain logic with NO framework, NO DB
describe('Order Aggregate', () => {
  const customerId = CustomerId.from('cust-1');
  const address = Address.create('1 High St', 'London', 'EC1A 1BB', 'GB');
  const productId = ProductId.from('prod-1');

  describe('addItem', () => {
    it('should add an item to a pending order', () => {
      const order = Order.create(customerId, address);
      order.addItem(productId, Quantity.of(2), Money.of(25.00, 'GBP'));
      expect(order.lines).toHaveLength(1);
      expect(order.total).toEqual(Money.of(50.00, 'GBP'));
    });

    it('should consolidate duplicate product lines', () => {
      const order = Order.create(customerId, address);
      order.addItem(productId, Quantity.of(2), Money.of(25.00, 'GBP'));
      order.addItem(productId, Quantity.of(1), Money.of(25.00, 'GBP'));
      expect(order.lines).toHaveLength(1);
      expect(order.lines[0].quantity.value).toBe(3);
    });
  });

  describe('confirm', () => {
    it('should transition to CONFIRMED and emit OrderConfirmedEvent', () => {
      const order = Order.create(customerId, address);
      order.addItem(productId, Quantity.of(1), Money.of(50.00, 'GBP'));
      order.confirm();
      expect(order.status).toBe(OrderStatus.CONFIRMED);
      const events = order.pullDomainEvents();
      expect(events).toContainEqual(expect.any(OrderConfirmedEvent));
    });

    it('should throw when confirming an empty order', () => {
      const order = Order.create(customerId, address);
      expect(() => order.confirm()).toThrow('Cannot confirm an empty order');
    });

    it('should throw when confirming a non-pending order', () => {
      const order = Order.create(customerId, address);
      order.addItem(productId, Quantity.of(1), Money.of(50.00, 'GBP'));
      order.confirm();
      expect(() => order.confirm()).toThrow('Only pending orders can be confirmed');
    });
  });

  describe('cancel', () => {
    it('should not allow cancellation of a shipped order', () => {
      const order = Order.reconstitute(
        OrderId.generate(), customerId, address, OrderStatus.SHIPPED, []
      );
      expect(() => order.cancel()).toThrow('Cannot cancel a shipped order');
    });
  });
});

// money.vo.spec.ts — Value Object tests
describe('Money Value Object', () => {
  it('should add same-currency amounts', () => {
    const a = Money.of(10, 'GBP');
    const b = Money.of(5, 'GBP');
    expect(a.add(b)).toEqual(Money.of(15, 'GBP'));
  });

  it('should throw on currency mismatch', () => {
    const gbp = Money.of(10, 'GBP');
    const usd = Money.of(5, 'USD');
    expect(() => gbp.add(usd)).toThrow('Currency mismatch');
  });

  it('should be immutable', () => {
    const money = Money.of(10, 'GBP');
    const newMoney = money.add(Money.of(5, 'GBP'));
    expect(money.amount).toBe(10);     // original unchanged
    expect(newMoney.amount).toBe(15);  // new instance
  });
});
```

---

## 12. Interview Questions

### Clean Architecture

- *"What is the Dependency Rule and why does it matter?"*
  > Source code dependencies must point inward — toward higher-level policies. Outer rings (DB, UI, frameworks) depend on inner rings (domain, use cases). This means you can replace the database or UI without touching a single domain class.

- *"How do you call a database from a Use Case without depending on it?"*
  > Define a repository interface (IOrderRepository) in the Use Case layer. The Use Case depends on the interface. At runtime, dependency injection provides the concrete PostgresOrderRepository (outer layer). The inner ring never imports the outer ring.

### Hexagonal Architecture

- *"What is the difference between a Port and an Adapter?"*
  > A Port is an interface — the contract the application defines for communication with the outside world. An Adapter is the concrete implementation of that contract for a specific technology (e.g., PostgresOrderRepository implements IOrderRepository).

- *"What is a Driving Adapter vs a Driven Adapter?"*
  > A Driving Adapter initiates the interaction — it calls the application's Input Port (e.g., REST Controller calls PlaceOrderUseCase). A Driven Adapter is called by the application through an Output Port (e.g., the application calls IOrderRepository, which is implemented by PostgresOrderRepository).

### DDD

- *"What is the difference between an Entity and a Value Object?"*
  > An Entity has a unique identity (ID) that persists through its lifecycle — two Orders with the same contents but different IDs are different entities. A Value Object is defined entirely by its attributes — two Money objects with amount=10 and currency=GBP are equal and interchangeable. Value Objects are immutable.

- *"Why use Aggregates? Why not just save individual entities?"*
  > Aggregates define consistency boundaries. All changes go through the Aggregate Root, which enforces invariants. For example, an OrderLine cannot exist without an Order, and adding an OrderLine must check the Order's status — so they belong in the same aggregate.

- *"What is the difference between a Domain Service and an Application Service?"*
  > A Domain Service contains **domain logic** that doesn't fit in any single Aggregate (e.g., pricing logic involving both Order and Customer). An Application Service (Use Case) **orchestrates** the domain — it fetches aggregates, calls domain methods, persists, and publishes events, but has zero domain logic of its own.

- *"What is a Bounded Context and why do you need it?"*
  > A Bounded Context is an explicit boundary within which a specific domain model applies. The same word ("Customer") can mean different things in different contexts (billing address in Payment, order history in Orders). Without boundaries, a single "Customer" class becomes a God Object satisfying every context.

- *"What is an Anti-Corruption Layer?"*
  > A translation layer between two Bounded Contexts that prevents one context's model from leaking into another. When the Order Context needs inventory data, it doesn't use the Inventory Context's model directly — it translates through an ACL into Order Context's own language.

- *"When would you choose a Shared Kernel over an Anti-Corruption Layer?"*
  > A Shared Kernel is appropriate when two teams genuinely share a subset of the domain and will evolve it together (high coordination). An ACL is preferred when teams are independent — it gives each team freedom to evolve their model without affecting others.

---

## Summary

```
┌──────────────────────────────────────────────────────────────────────────┐
│              DOMAIN-CENTRIC ARCHITECTURE — AT A GLANCE                  │
│                                                                          │
│  WHAT                  PURPOSE                   MECHANISM              │
│  ─────────────────────────────────────────────────────────────────────  │
│  Clean Architecture    Dependency rule           Concentric rings        │
│  Hexagonal             Pluggable I/O             Ports + Adapters        │
│  Onion                 DDD-named layers          Concentric rings        │
│  Strategic DDD         Boundary definition       Bounded Contexts        │
│  Tactical DDD          Domain modelling          Aggregates, Entities,  │
│                                                  VOs, Domain Services   │
│                                                                          │
│  COMBINED:                                                               │
│  Strategic DDD  →  defines WHAT modules exist                           │
│  Clean/Hexagonal/Onion  →  defines HOW each module is structured        │
│  Tactical DDD  →  defines WHAT lives in the domain ring                 │
│                                                                          │
│  GOLDEN RULE:                                                            │
│  The Domain depends on nothing.                                          │
│  Everything depends on the Domain.                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

*Related: Microservices Architecture, CQRS, Event Sourcing, Event-Driven Architecture, Saga Pattern, Strangler Fig Pattern, Outbox Pattern*
