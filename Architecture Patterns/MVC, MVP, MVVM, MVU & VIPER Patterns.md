# UI Architecture Patterns - MVC, MVP, MVVM, MVU, VIPER Patterns

The central idea is that UI architecture exists to separate rendering, UI logic, business logic, and data handling, making applications cleaner, more maintainable, scalable, and testable.

| Pattern           | Main idea                                       | Best strength                            |
| ----------------- | ----------------------------------------------- | ---------------------------------------- |
| **MVC**           | Model + View + Controller                       | Simple, easy to start                    |
| **MVP**           | Passive View + Presenter                        | Strong UI testability                    |
| **MVVM**          | View binds to ViewModel                         | Declarative and reactive UI              |
| **MVU**           | Model → View → Message → Update                 | Predictable state management             |
| **VIPER**         | View + Interactor + Presenter + Entity + Router | Strict modular separation                |
| **Offline-First** | Local-first + async synchronization             | Works reliably with poor/no connectivity |

> **MVU/MVVM are strong fits for web UIs, MVVM/VIPER for mobile, and MVC/MVVM remain relevant for desktop applications.**

**For your Angular background, the most relevant parts to focus on are:**
- **MVVM** → Components/Templates as View + Services/Signals/State as ViewModel-like layers.
- **MVU** → Very relevant to NgRx, Redux, Actions, Reducers, and Signals-based state architecture.
- **Offline-first** → Especially useful for projects using IndexedDB, sync queues, retry logic, conflict resolution, and WebSockets.

The source also frames MVU as a loop where the View is derived from the Model and an Update function processes a message plus the current Model to produce a new Model.

## 1. MVC — Model View Controller
Diagram
```
             User
               │
               ▼
        ┌─────────────┐
        │    View     │
        │     UI      │
        └──────┬──────┘
               │ user action
               ▼
        ┌─────────────┐
        │ Controller  │
        └──────┬──────┘
               │
          updates / reads
               ▼
        ┌─────────────┐
        │    Model    │
        │ Data +      │
        │ Business    │
        │ Logic       │
        └──────┬──────┘
               │
               │ data
               ▼
        ┌─────────────┐
        │    View     │
        └─────────────┘
```

**Flow**
```
User
 ↓
View
 ↓
Controller
 ↓
Model
 ↓
View
```
The Controller handles user input, interacts with the Model, and decides how the View should be updated. The source notes that classic MVC has relatively tight coupling between View and Controller.

**Example**

Imagine:
```
[ Login Button ]
       ↓
   Controller
       ↓
 Authentication Model
       ↓
 [ Dashboard ]
Main problem
```

**As the application grows:**
```
Controller
 ├── validation
 ├── business rules
 ├── API calls
 ├── database logic
 ├── UI decisions
 └── navigation
```
This becomes the Fat/Massive Controller problem.

Best for
- Simple applications
- Traditional server-rendered applications
- Older/legacy architectures
- Situations where simplicity matters more than sophisticated UI state management

## 2. MVP — Model View Presenter

MVP moves the UI logic out of the View and into the Presenter.

**Diagram**
```
             User
               │
               ▼
        ┌─────────────┐
        │    View     │
        │  Passive UI │
        └──────┬──────┘
               │
          user event
               ▼
        ┌─────────────┐
        │  Presenter  │
        │  UI Logic   │
        └──────┬──────┘
               │
          reads/updates
               ▼
        ┌─────────────┐
        │    Model    │
        │ Data +      │
        │ Business    │
        │ Logic       │
        └──────┬──────┘
               │
             result
               ▼
        ┌─────────────┐
        │  Presenter  │
        └──────┬──────┘
               │
          View Interface
               ▼
        ┌─────────────┐
        │    View     │
        └─────────────┘
```

**Flow**
```
User
 ↓
View
 ↓
Presenter
 ↓
Model
 ↓
Presenter
 ↓
View
```
The important difference is:
> **The View is passive.**

The Presenter tells the View what to display. The source specifically highlights that this separation makes the Presenter easier to unit test in isolation.

**Example**
```
LoginView
    │
    │ login(username, password)
    ▼
LoginPresenter
    │
    │ authenticate()
    ▼
AuthModel
    │
    │ result
    ▼
LoginPresenter
    │
    │ showSuccess()
    ▼
LoginView
```
The Presenter can be tested without a real UI:
```
LoginPresenter
      │
      ├── Mock View
      │
      └── Mock Model
```

**Advantage**

Excellent testability.

**Disadvantage**

**More manual communication and boilerplate.**
```
View Interface
Presenter
View Implementation
Model
Callbacks
Manual Updates
```
The source identifies boilerplate as the major trade-off of MVP.

## 3. MVVM — Model View ViewModel

MVVM changes the communication model significantly.

Instead of the View constantly asking the ViewModel what to display, the View binds to the ViewModel.

**Diagram**
```
             User
               │
               ▼
        ┌─────────────┐
        │    View     │
        │     UI      │
        └──────┬──────┘
               │
            Binding
               │
               ▼
        ┌─────────────┐
        │  ViewModel  │
        │             │
        │ State       │
        │ UI Logic    │
        │ Commands    │
        └──────┬──────┘
               │
          reads/updates
               ▼
        ┌─────────────┐
        │    Model    │
        │ Data +      │
        │ Business    │
        │ Logic       │
        └─────────────┘
```
**The critical relationship:**
```
View ←──── Data Binding ────→ ViewModel
                               │
                               ▼
                             Model
```
The source describes the ViewModel as exposing data and behavior, with the View binding directly to it; importantly, the ViewModel has no explicit reference to the View.

**MVVM with reactive state**

Modern UI frameworks often look conceptually like:
```
             ┌──────────────┐
             │     View     │
             │   Template   │
             └───────┬──────┘
                     │
                  observes
                     │
                     ▼
             ┌──────────────┐
             │  ViewModel   │
             │              │
             │ State        │
             │ Commands     │
             │ UI Logic     │
             └───────┬──────┘
                     │
                     ▼
             ┌──────────────┐
             │    Model     │
             │              │
             │ API / Data   │
             │ Business     │
             └──────────────┘
```

For example:
```
API
 ↓
Service
 ↓
ViewModel / State
 ↓
Signal / Observable
 ↓
Angular Template
```
This is why MVVM is particularly relevant to Angular. Your Angular Components + Signals/Observables + Services can be organized in an MVVM-like manner, although Angular itself does not force you to implement a textbook MVVM architecture.

**Advantage**
```
Less glue code
      +
Reactive UI
      +
Good testability
      +
Declarative UI
```

**Disadvantage**

Two-way binding can make state changes difficult to trace.

The source explicitly warns about excessive two-way binding causing unpredictable state updates and harder debugging.

## 4. MVU — Model View Update

MVU is fundamentally different because it emphasizes unidirectional data flow.

Core diagram
```
             ┌─────────────┐
             │    Model    │
             │    State    │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │    View     │
             └──────┬──────┘
                    │
              User Event
                    │
                    ▼
             ┌─────────────┐
             │   Update    │
             └──────┬──────┘
                    │
              New Model
                    │
                    └──────────────┐
                                   │
                                   ▼
                              ┌─────────┐
                              │  Model  │
                              └─────────┘
```
Or, more simply:
```
       ┌─────────┐
       │  MODEL  │
       └────┬────┘
            │
            ▼
       ┌─────────┐
       │  VIEW   │
       └────┬────┘
            │
         Message
            │
            ▼
       ┌─────────┐
       │ UPDATE  │
       └────┬────┘
            │
         New State
            │
            ▼
       ┌─────────┐
       │  MODEL  │
       └─────────┘
```

**The source describes MVU as:**
```
Update(Message + Model)
            ↓
        New Model
```
and the View as a function of the Model.

## 5. VIPER - View, Interactor, Presenter, Entity, Router

VIPER in simple terms

Think of a feature such as “Order Details”:
```
              ┌──────────────┐
              │     View     │
              │ UI / Events  │
              └──────┬───────┘
                     │ User tap
                     ▼
              ┌──────────────┐
              │   Presenter  │
              │ UI logic     │
              └──────┬───────┘
                     │ Request
                     ▼
              ┌──────────────┐
              │  Interactor  │
              │ Business     │
              │ Logic        │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │    Entity    │
              │ Domain data  │
              └──────────────┘

                     │
                     │ Navigation
                     ▼
              ┌──────────────┐
              │    Router    │
              │ Navigation   │
              └──────────────┘
```

**Responsibility of each component**

| Component      | Responsibility                                  | Example             |
| -------------- | ----------------------------------------------- | ------------------- |
| **View**       | Displays UI and captures user interaction       | Button tap          |
| **Presenter**  | Converts business results into UI-friendly data | Format order status |
| **Interactor** | Executes business logic/use cases               | Fetch order         |
| **Entity**     | Represents domain data                          | `Order`, `Customer` |
| **Router**     | Handles navigation                              | Open Order Details  |

**VIPER flow**

For example, when the user taps “Cancel Order”:
```
User
 │
 │ Tap Cancel
 ▼
View
 │
 │ cancelOrder()
 ▼
Presenter
 │
 │ cancelOrder()
 ▼
Interactor
 │
 │ Cancel-order business logic
 ▼
Entity / Repository / API
 │
 │ Result
 ▼
Interactor
 │
 │ success / failure
 ▼
Presenter
 │
 │ Prepare UI model
 ▼
View
 │
 │ Display "Order cancelled"
 ▼
User
```

**If cancellation requires navigation:**
```
Presenter
    │
    ▼
 Router
    │
    ▼
Order Confirmation Screen
```

The key interview point

The biggest idea behind VIPER is:
```
Don't put everything inside the ViewController.
```

**Instead of a massive:**
```
OrderViewController
 ├── UI
 ├── API calls
 ├── business logic
 ├── data transformation
 ├── navigation
 └── validation
```

**VIPER separates those responsibilities:**
```
View
  ↓
Presenter
  ↓
Interactor
  ↓
Entity / Data layer

Router → Navigation
```

One subtle but important distinction

Your statement:
```
"Interactor updates Entity or fetches data."
```
is slightly simplified.

A more accurate description is:
```
Interactor executes the use case/business logic and coordinates with data/repository/services. Entities represent the domain data; they generally shouldn't be treated as the place where all business logic lives.
```

Also:
> **Clean Swift templates ≠ VIPER**

Clean Swift is commonly known as VIP (View–Interactor–Presenter) and adds components such as Worker and Router. VIPER is View–Interactor–Presenter–Entity–Router.

For an interview, I'd remember VIPER as:
```
V → UI
I → Business logic
P → Presentation
E → Data/domain model
R → Navigation
```

## The most important difference

Consider a button:
```
[ Add To Cart ]
```

### MVC
```
Button
  ↓
Controller
  ↓
Model
  ↓
View
MVP
Button
  ↓
Presenter
  ↓
Model
  ↓
Presenter
  ↓
View
```

### MVVM
```
Button
  ↓
ViewModel
  ↓
Model
  ↓
ViewModel State
  ↓
Binding
  ↓
View
```

### MVU
```
Button
  ↓
Message: AddToCart
  ↓
Update()
  ↓
New State
  ↓
View
```
That last one is the key.

MVU doesn't say "update this UI component."

It says:
> **"An event happened → calculate the new state → render the UI from that state."**

This is why MVU is associated with predictability, pure functions, testing, and easier tracing of state changes.

## Think of them as four generations

A useful mental model:
```
MVC
 │
 │ Move UI logic out of View
 ▼
MVP
 │
 │ Reduce manual View updates
 ▼
MVVM
 │
 │ Make state flow predictable
 ▼
MVU
```
But don't interpret this as "MVU is always better than MVC."

That's not the point of architecture patterns.

The source explicitly says the correct pattern depends on the framework, team experience, and UI complexity.


## Side-by-side comparison
| Concept             | MVC                   | MVP                  | MVVM                      | MVU                        |
| ------------------- | --------------------- | -------------------- | ------------------------- | -------------------------- |
| Full form           | Model View Controller | Model View Presenter | Model View ViewModel      | Model View Update          |
| UI                  | Active                | Passive              | Passive                   | State-driven               |
| Main logic          | Controller            | Presenter            | ViewModel                 | Update                     |
| Communication       | Controller-driven     | Presenter-driven     | Binding/reactive          | Unidirectional             |
| Data binding        | Manual                | Manual               | Yes                       | State → View               |
| Two-way binding     | Possible              | Usually manual       | Common                    | Avoided                    |
| State model         | Less centralized      | Presenter-managed    | ViewModel-managed         | Central model/state        |
| Testability         | Moderate              | High                 | High                      | Very high                  |
| Boilerplate         | Low–medium            | High                 | Low–medium                | Low–medium                 |
| Debugging           | Can become difficult  | Relatively clear     | Binding can complicate it | Very predictable           |
| Best characteristic | Simplicity            | Testability          | Reactivity                | Predictability             |
| Major risk          | Fat Controller        | Fat Presenter        | Binding complexity        | Bloated state/update logic |


## Angular perspective

Since you're working heavily with Angular, this is the most useful mapping:
```
                 ANGULAR
                    │
        ┌───────────┴───────────┐
        │                       │
     Template              Component
       View               ViewModel-ish
        │                       │
        │                ┌──────┴──────┐
        │                │             │
        │              Signals       RxJS
        │                │             │
        └────────────────┴─────────────┘
                         │
                         ▼
                     Services
                         │
                         ▼
                       API
```

**And if you introduce NgRx:**
```
User
 │
 ▼
Component
 │
 ▼
Action
 │
 ▼
┌─────────────┐
│   Reducer   │
└──────┬──────┘
       │
       ▼
     Store
       │
       ▼
    Selector
       │
       ▼
Component
```

**Conceptually, this is very close to MVU/unidirectional architecture:**
```
User Event
    ↓
Action / Message
    ↓
Update State
    ↓
Store
    ↓
View
```
The uploaded material specifically describes Redux in MVU terms: Actions = messages, Reducers = updates, and state is managed centrally.