# UI Architecture Patterns: MVC, MVP, MVVM

A comprehensive guide to the three most widely used UI architecture patterns — their structure, responsibilities, data flow, differences, and real-world usage in modern frontend frameworks.

---

## Table of Contents

1. [Why Architecture Patterns Matter](#1-why-architecture-patterns-matter)
2. [MVC — Model View Controller](#2-mvc--model-view-controller)
3. [MVP — Model View Presenter](#3-mvp--model-view-presenter)
4. [MVVM — Model View ViewModel](#4-mvvm--model-view-viewmodel)
5. [Side-by-Side Comparison](#5-side-by-side-comparison)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [MVC in Practice — Angular / Express](#7-mvc-in-practice--angular--express)
8. [MVP in Practice — Android / React](#8-mvp-in-practice--android--react)
9. [MVVM in Practice — Angular with NgRx / RxJS](#9-mvvm-in-practice--angular-with-ngrx--rxjs)
10. [Choosing the Right Pattern](#10-choosing-the-right-pattern)
11. [Common Mistakes](#11-common-mistakes)

---

## 1. Why Architecture Patterns Matter

As UI applications grow, mixing UI logic, business rules, and data access in the same file leads to:

- **Untestable code** — UI and logic are tightly coupled
- **Hard to maintain** — changing one thing breaks another
- **No reusability** — logic is buried inside components
- **Slow onboarding** — new developers can't find where things live

Architecture patterns solve this by defining **clear responsibilities** for each layer and **explicit rules for how layers communicate**.

| Problem | Solution via pattern |
|---|---|
| Business logic inside components | Move to Controller / Presenter / ViewModel |
| UI directly fetching data | Model layer abstracts data access |
| Hard to unit test UI logic | Separate logic into testable classes |
| State scattered everywhere | Centralise in ViewModel or Store |

---

## 2. MVC — Model View Controller

### What it is

MVC (**Model-View-Controller**) is the original UI architecture pattern, introduced in the 1970s by Trygve Reenskaug for Smalltalk. It splits the application into three components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MVC PATTERN                                │
│                                                                     │
│   User Input                                                        │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────────┐   Updates    ┌─────────────────────────┐      │
│  │                  │─────────────►│                         │      │
│  │   CONTROLLER     │              │         MODEL           │      │
│  │                  │◄─────────────│                         │      │
│  │  Handles input   │   Notifies   │  Data + Business Logic  │      │
│  │  Orchestrates    │              │  State + Validation     │      │
│  │  flow/routing    │              │  API / DB calls         │      │
│  └────────┬─────────┘              └──────────┬──────────────┘      │
│           │                                   │                     │
│           │ Selects/Renders                   │ Notifies (Observer) │
│           │                                   │                     │
│           ▼                                   ▼                     │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                         VIEW                             │       │
│  │              Displays data to the user                   │       │
│  │         Renders UI based on Model state                  │       │
│  └──────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### The Three Layers

#### Model
- Holds the **application data and business logic**
- Responsible for data validation, persistence, and API calls
- Has **no knowledge of the View** — completely independent
- Notifies interested parties (Controller or View) when data changes (Observer pattern)

```typescript
// model/user.model.ts
export class UserModel {
  private users: User[] = [];

  async fetchUsers(): Promise<User[]> {
    const response = await fetch('/api/users');
    this.users = await response.json();
    return this.users;
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  validateUser(user: User): boolean {
    return !!user.name && !!user.email;
  }
}
```

#### View
- Displays the **data provided by the Model or Controller**
- Responsible only for rendering — no business logic
- Captures user input and forwards it to the Controller
- In classic MVC, the View can observe the Model directly

```typescript
// view/user-list.view.ts
export class UserListView {
  render(users: User[]): void {
    const container = document.getElementById('user-list')!;
    container.innerHTML = users
      .map(u => `<li data-id="${u.id}">${u.name} — ${u.email}</li>`)
      .join('');
  }

  bindSelectUser(handler: (id: string) => void): void {
    document.getElementById('user-list')!
      .addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id) handler(id);
      });
  }
}
```

#### Controller
- **Receives user input** from the View
- **Calls the Model** to process the input or fetch data
- **Updates the View** with results from the Model
- Acts as the **glue** between Model and View

```typescript
// controller/user.controller.ts
export class UserController {
  constructor(
    private model: UserModel,
    private view: UserListView
  ) {
    this.init();
  }

  async init(): Promise<void> {
    const users = await this.model.fetchUsers();
    this.view.render(users);
    this.view.bindSelectUser(this.handleSelectUser.bind(this));
  }

  handleSelectUser(id: string): void {
    const user = this.model.getUserById(id);
    if (user) {
      console.log('Selected:', user);
    }
  }
}
```

### MVC Data Flow

```
1. User clicks a button        → View captures the event
2. View calls Controller       → Controller.onButtonClick()
3. Controller calls Model      → Model.fetchData()
4. Model returns data          → Controller receives result
5. Controller updates View     → View.render(data)
   OR
   Model notifies View directly (Observer) → View.update()
```

### Key Characteristics of MVC

| Aspect | Detail |
|---|---|
| **View-Model coupling** | View can directly observe Model (tightly coupled in classic MVC) |
| **Testability** | Controller and Model are testable; View is harder |
| **View knowledge** | Controller knows about specific Views |
| **Input handling** | Controller handles all user input |
| **Frameworks** | Ruby on Rails, ASP.NET MVC, Express.js, Spring MVC, AngularJS (1.x) |

---

## 3. MVP — Model View Presenter

### What it is

MVP (**Model-View-Presenter**) evolved from MVC to solve testability issues. It was popularised by Google for Android development. The key difference: **the View and Model never communicate directly** — all communication goes through the Presenter.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          MVP PATTERN                                 │
│                                                                      │
│   User Input                                                         │
│       │                                                              │
│       ▼                                                              │
│  ┌────────────────────┐              ┌──────────────────────────┐    │
│  │                    │◄────────────►│                          │    │
│  │       VIEW         │              │       PRESENTER          │    │
│  │                    │              │                          │    │
│  │  Passive display   │  delegates   │  All UI logic lives here │    │
│  │  No business logic │  all input   │  Calls Model             │    │
│  │  Implements        │              │  Updates View via        │    │
│  │  IView interface   │              │  IView interface         │    │
│  └────────────────────┘              └──────────┬───────────────┘    │
│            ▲                                    │                    │
│            │                                    │ calls              │
│            │ never                              ▼                    │
│            │ directly                ┌──────────────────────────┐    │
│            │                        │          MODEL            │    │
│            └──────────────X─────────│  Data + Business Logic    │    │
│                                     │  No View knowledge        │    │
│                                     └──────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### The Three Layers

#### Model
- Same responsibility as in MVC — **data and business logic**
- Completely unaware of the View and Presenter

```typescript
// model/user.model.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserModel {
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    return res.json();
  }

  async saveUser(user: User): Promise<void> {
    await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }
}
```

#### View (Passive View)
- The View is **deliberately passive** — it has no logic
- It implements an **interface (IView)** that the Presenter calls
- It **delegates every user action** to the Presenter immediately
- This makes the View 100% replaceable and mockable in tests

```typescript
// view/user.view.interface.ts — the contract the View must fulfil
export interface IUserView {
  showUsers(users: User[]): void;
  showLoading(isLoading: boolean): void;
  showError(message: string): void;
  showSuccess(message: string): void;
}

// view/user.view.ts — real implementation
export class UserView implements IUserView {
  constructor(private presenter: UserPresenter) {
    document.getElementById('load-btn')!
      .addEventListener('click', () => this.presenter.onLoadUsers());

    document.getElementById('save-btn')!
      .addEventListener('click', () => {
        const name = (document.getElementById('name') as HTMLInputElement).value;
        const email = (document.getElementById('email') as HTMLInputElement).value;
        this.presenter.onSaveUser({ id: '', name, email });
      });
  }

  showUsers(users: User[]): void {
    document.getElementById('list')!.innerHTML =
      users.map(u => `<li>${u.name}</li>`).join('');
  }

  showLoading(isLoading: boolean): void {
    document.getElementById('spinner')!.style.display =
      isLoading ? 'block' : 'none';
  }

  showError(message: string): void {
    document.getElementById('error')!.textContent = message;
  }

  showSuccess(message: string): void {
    document.getElementById('success')!.textContent = message;
  }
}
```

#### Presenter
- Contains **all the UI logic** — validation, formatting, error handling
- Calls the Model for data
- Updates the View through the **IView interface** (never directly)
- Has **no import of any UI framework or DOM** — fully testable with mocks

```typescript
// presenter/user.presenter.ts
export class UserPresenter {
  constructor(
    private model: UserModel,
    private view: IUserView      // depends on interface, not implementation
  ) {}

  async onLoadUsers(): Promise<void> {
    this.view.showLoading(true);
    try {
      const users = await this.model.getUsers();
      this.view.showUsers(users);
    } catch (err) {
      this.view.showError('Failed to load users. Please try again.');
    } finally {
      this.view.showLoading(false);
    }
  }

  async onSaveUser(user: User): Promise<void> {
    if (!user.name || !user.email) {
      this.view.showError('Name and email are required.');
      return;
    }
    this.view.showLoading(true);
    try {
      await this.model.saveUser(user);
      this.view.showSuccess('User saved successfully!');
      await this.onLoadUsers();
    } catch (err) {
      this.view.showError('Failed to save user.');
    } finally {
      this.view.showLoading(false);
    }
  }
}
```

### MVP Unit Test (Presenter is fully testable)

```typescript
// presenter/user.presenter.spec.ts
describe('UserPresenter', () => {
  let presenter: UserPresenter;
  let mockModel: jest.Mocked<UserModel>;
  let mockView: jest.Mocked<IUserView>;

  beforeEach(() => {
    mockModel = {
      getUsers: jest.fn(),
      saveUser: jest.fn(),
    } as any;

    mockView = {
      showUsers: jest.fn(),
      showLoading: jest.fn(),
      showError: jest.fn(),
      showSuccess: jest.fn(),
    };

    presenter = new UserPresenter(mockModel, mockView);
  });

  it('should show users on successful load', async () => {
    const users = [{ id: '1', name: 'Alice', email: 'alice@test.com' }];
    mockModel.getUsers.mockResolvedValue(users);

    await presenter.onLoadUsers();

    expect(mockView.showLoading).toHaveBeenCalledWith(true);
    expect(mockView.showUsers).toHaveBeenCalledWith(users);
    expect(mockView.showLoading).toHaveBeenCalledWith(false);
  });

  it('should show error when name is missing', async () => {
    await presenter.onSaveUser({ id: '', name: '', email: 'test@test.com' });
    expect(mockView.showError).toHaveBeenCalledWith('Name and email are required.');
    expect(mockModel.saveUser).not.toHaveBeenCalled();
  });
});
```

### Key Characteristics of MVP

| Aspect | Detail |
|---|---|
| **View-Model coupling** | View and Model **never communicate directly** |
| **Testability** | Presenter is fully testable (no DOM dependency) |
| **View knowledge** | Presenter holds a reference to the View via interface |
| **Input handling** | View delegates all events to Presenter |
| **Boilerplate** | More than MVC — requires IView interfaces |
| **Frameworks** | Android (Java/Kotlin), WinForms, early React patterns |

---

## 4. MVVM — Model View ViewModel

### What it is

MVVM (**Model-View-ViewModel**) was introduced by Microsoft for WPF in 2005. It is the dominant pattern in modern frontend frameworks (Angular, Vue, React with hooks). The key innovation: **data binding** — the View automatically reflects ViewModel state without the ViewModel calling the View explicitly.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            MVVM PATTERN                                 │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                           VIEW                                   │   │
│  │                                                                  │   │
│  │   Template / HTML                                                │   │
│  │   Declarative bindings to ViewModel properties                  │   │
│  │   {{ user.name }}   [disabled]="isLoading"   (click)="save()"   │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                       │
│              Two-Way Data Binding / Observable Subscription             │
│                                 │                                       │
│                    ┌────────────┴─────────────┐                         │
│                    │        VIEWMODEL          │                         │
│                    │                          │                         │
│                    │  Exposes observables /   │                         │
│                    │  reactive state          │                         │
│                    │  Commands / methods      │                         │
│                    │  Transforms Model data   │                         │
│                    │  for View consumption    │                         │
│                    │                          │                         │
│                    │  users$: Observable      │                         │
│                    │  isLoading$: Observable  │                         │
│                    │  saveUser(): void        │                         │
│                    └────────────┬─────────────┘                         │
│                                 │                                       │
│                                 │ calls / subscribes                    │
│                                 ▼                                       │
│                    ┌──────────────────────────┐                         │
│                    │          MODEL            │                         │
│                    │                          │                         │
│                    │  Data + Business Logic   │                         │
│                    │  Services / Repositories │                         │
│                    │  HTTP / DB / Cache       │                         │
│                    └──────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Three Layers

#### Model
- **Data, business logic, and data access** — same as MVC/MVP
- In Angular: Services, HTTP clients, repositories
- Returns Observables or Promises

```typescript
// model/user.service.ts (the Model layer in Angular)
@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  saveUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

#### ViewModel
- Exposes **reactive state** (Observables, Signals, BehaviorSubjects) for the View to bind to
- Contains **presentation logic** — formatting, filtering, sorting, derived state
- **Never references the View** directly — the View reacts to state changes automatically
- Contains **commands** (methods the View calls on user interaction)

```typescript
// viewmodel/user.viewmodel.ts (Angular Component as ViewModel)
@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  // ── State exposed to the View ──────────────────────────
  users$: Observable<User[]>;
  isLoading$ = new BehaviorSubject<boolean>(false);
  errorMessage$ = new BehaviorSubject<string | null>(null);
  searchTerm$ = new BehaviorSubject<string>('');

  // ── Derived / transformed state ────────────────────────
  filteredUsers$: Observable<User[]>;
  userCount$: Observable<number>;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // Load users once
    this.users$ = this.userService.getUsers().pipe(
      tap(() => this.isLoading$.next(false)),
      catchError(err => {
        this.errorMessage$.next('Failed to load users');
        this.isLoading$.next(false);
        return of([]);
      })
    );

    // Derived: filter users based on search term
    this.filteredUsers$ = combineLatest([
      this.users$,
      this.searchTerm$
    ]).pipe(
      map(([users, term]) =>
        users.filter(u =>
          u.name.toLowerCase().includes(term.toLowerCase())
        )
      )
    );

    // Derived: count of filtered users
    this.userCount$ = this.filteredUsers$.pipe(
      map(users => users.length)
    );
  }

  // ── Commands (called by View on user interaction) ──────
  onSearch(term: string): void {
    this.searchTerm$.next(term);
  }

  onSaveUser(user: User): void {
    this.isLoading$.next(true);
    this.userService.saveUser(user).subscribe({
      next: () => this.isLoading$.next(false),
      error: () => {
        this.errorMessage$.next('Failed to save user');
        this.isLoading$.next(false);
      }
    });
  }

  onDeleteUser(id: string): void {
    this.userService.deleteUser(id).subscribe();
  }
}
```

#### View
- **Declarative template** — binds directly to ViewModel properties
- Uses data binding to automatically reflect state changes
- **No logic** — only binding expressions and event handlers

```html
<!-- view/users.component.html (Angular Template as View) -->
<div class="users-page">

  <!-- Bind to isLoading$ observable via async pipe -->
  <app-spinner *ngIf="isLoading$ | async"></app-spinner>

  <!-- Bind to errorMessage$ -->
  <div class="error" *ngIf="errorMessage$ | async as error">
    {{ error }}
  </div>

  <!-- Two-way binding: search term updates ViewModel -->
  <input
    type="text"
    placeholder="Search users..."
    [value]="searchTerm$ | async"
    (input)="onSearch($event.target.value)"
  />

  <!-- Display derived user count -->
  <p>Showing {{ userCount$ | async }} users</p>

  <!-- Iterate over filtered list -->
  <ul>
    <li *ngFor="let user of filteredUsers$ | async">
      {{ user.name }} — {{ user.email }}
      <button (click)="onDeleteUser(user.id)">Delete</button>
    </li>
  </ul>

  <!-- Bind form submit to ViewModel command -->
  <form (ngSubmit)="onSaveUser(form.value)" #form="ngForm">
    <input name="name" ngModel required placeholder="Name" />
    <input name="email" ngModel required type="email" placeholder="Email" />
    <button type="submit" [disabled]="isLoading$ | async">Save</button>
  </form>

</div>
```

### MVVM with NgRx (State Management)

For larger apps, the ViewModel delegates state management to a centralised store:

```typescript
// With NgRx Store as the ViewModel's state backbone
@Component({ selector: 'app-users', templateUrl: './users.component.html' })
export class UsersComponent implements OnInit {
  // State comes from the Store (single source of truth)
  users$       = this.store.select(selectAllUsers);
  isLoading$   = this.store.select(selectUsersLoading);
  errorMessage$ = this.store.select(selectUsersError);

  constructor(private store: Store) {}

  ngOnInit(): void {
    // Dispatch an action → Reducer updates state → View reacts
    this.store.dispatch(UserActions.loadUsers());
  }

  onSaveUser(user: User): void {
    this.store.dispatch(UserActions.saveUser({ user }));
  }

  onDeleteUser(id: string): void {
    this.store.dispatch(UserActions.deleteUser({ id }));
  }
}
```

```
NgRx MVVM Flow:
─────────────────────────────────────────────────────────
View (Template)
  │ user clicks "Save"
  ▼
ViewModel (Component)
  │ dispatches Action: saveUser({ user })
  ▼
Effect (Side Effect Handler)
  │ calls UserService.saveUser() → Model
  │ on success dispatches: saveUserSuccess({ user })
  ▼
Reducer
  │ updates Store state immutably
  ▼
Selector
  │ projects updated state
  ▼
ViewModel (Component)  ← Observable emits new value
  │
  ▼
View (Template)        ← async pipe re-renders automatically
```

### Key Characteristics of MVVM

| Aspect | Detail |
|---|---|
| **View-Model coupling** | View and ViewModel connected via **data binding** (no direct reference) |
| **Testability** | ViewModel is fully testable (no DOM, pure reactive streams) |
| **View knowledge** | ViewModel has **zero knowledge** of the View |
| **Input handling** | View binds events to ViewModel commands |
| **Data binding** | Two-way (`[(ngModel)]`) or one-way (`[property]`, `{{ expression }}`) |
| **Frameworks** | Angular, Vue.js, React (with hooks), WPF, SwiftUI, Jetpack Compose |

---

## 5. Side-by-Side Comparison

| Aspect | MVC | MVP | MVVM |
|---|---|---|---|
| **Full name** | Model-View-Controller | Model-View-Presenter | Model-View-ViewModel |
| **Origin** | 1970s — Smalltalk | 1990s — IBM/Microsoft | 2005 — Microsoft WPF |
| **View–Model link** | View can observe Model directly | Presenter mediates — no direct link | Data binding — no direct link |
| **Who updates View?** | Controller (or Model via Observer) | Presenter calls IView methods | Binding engine (automatic) |
| **View logic** | Some logic possible | Passive — zero logic | Declarative bindings only |
| **Testability** | Controller testable; View hard | Presenter 100% testable (IView mock) | ViewModel 100% testable |
| **Data binding** | Manual | Manual | Automatic (two-way or one-way) |
| **Boilerplate** | Low | Medium (IView interfaces) | Low–Medium (binding syntax) |
| **Best for** | Server-side apps, simple UIs | Android, WinForms, React without hooks | Angular, Vue, React hooks, SwiftUI |
| **Coupling level** | Medium | Low | Very low |
| **State management** | In Model or Controller | In Presenter | In ViewModel or external Store |

---

## 6. Data Flow Diagrams

### MVC Data Flow

```
┌──────┐  input   ┌────────────┐  updates  ┌──────────┐
│ USER │─────────►│ CONTROLLER │──────────►│  MODEL   │
└──────┘          └─────┬──────┘           └────┬─────┘
                        │                       │
                        │ renders               │ notifies
                        ▼                       ▼
                  ┌─────────────────────────────────┐
                  │              VIEW               │
                  └─────────────────────────────────┘
```

### MVP Data Flow

```
┌──────┐  input   ┌──────────┐  delegate  ┌───────────┐
│ USER │─────────►│   VIEW   │───────────►│ PRESENTER │
└──────┘          └──────────┘            └─────┬─────┘
         displays      ▲                        │
         via IView      └────────────────────────┘
                              calls Model
                              ┌──────────┐
                              │  MODEL   │
                              └──────────┘
```

### MVVM Data Flow

```
┌──────┐  input   ┌──────────────────────┐
│ USER │─────────►│         VIEW         │
└──────┘          │  (declarative        │
         renders  │   template)          │
   auto ◄─────────│                      │
   via binding    └──────────┬───────────┘
                             │ two-way binding
                             │ (no explicit call)
                  ┌──────────┴───────────┐
                  │      VIEWMODEL       │
                  │  (reactive state +   │
                  │   commands)          │
                  └──────────┬───────────┘
                             │ calls
                             ▼
                  ┌──────────────────────┐
                  │        MODEL         │
                  │  (services / repo)   │
                  └──────────────────────┘
```

---

## 7. MVC in Practice — Angular / Express

### Angular (Component as Controller)

In Angular, the **Component** acts as a Controller — it coordinates between the Service (Model) and Template (View).

```typescript
// MVC-style Angular component (controller role)
@Component({
  selector: 'app-product-list',
  template: `
    <ul>
      <li *ngFor="let p of products">{{ p.name }} - £{{ p.price }}</li>
    </ul>
    <button (click)="loadProducts()">Refresh</button>
  `
})
export class ProductListComponent {
  products: Product[] = [];

  constructor(private productService: ProductService) {}  // Model

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    // Controller calls Model → updates View property
    this.productService.getAll().subscribe(data => {
      this.products = data;   // Controller updates View directly
    });
  }
}
```

### Express.js (Server-side MVC)

```javascript
// routes/user.routes.js — Controller layer
const express = require('express');
const router  = express.Router();
const UserModel = require('../models/user.model');

// Controller: handle GET /users
router.get('/', async (req, res) => {
  const users = await UserModel.findAll();    // call Model
  res.render('users/index', { users });       // render View (EJS/Pug template)
});

// Controller: handle POST /users
router.post('/', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.render('users/new', { error: 'Name and email required' });
  }
  await UserModel.create({ name, email });
  res.redirect('/users');
});
```

---

## 8. MVP in Practice — Android / React

### React with MVP (class components era)

```tsx
// IView interface
interface IUserListView {
  showUsers(users: User[]): void;
  showError(msg: string): void;
  setLoading(loading: boolean): void;
}

// Presenter — pure TypeScript, zero React import
class UserListPresenter {
  constructor(
    private service: UserService,
    private view: IUserListView
  ) {}

  async loadUsers(): Promise<void> {
    this.view.setLoading(true);
    try {
      const users = await this.service.getUsers();
      this.view.showUsers(users);
    } catch {
      this.view.showError('Could not load users');
    } finally {
      this.view.setLoading(false);
    }
  }
}

// View — React component that is fully passive
class UserListView extends React.Component<{}, UserListState>
  implements IUserListView {

  private presenter = new UserListPresenter(new UserService(), this);
  state = { users: [], error: '', loading: false };

  componentDidMount() {
    this.presenter.loadUsers();
  }

  showUsers(users: User[]) { this.setState({ users }); }
  showError(error: string) { this.setState({ error }); }
  setLoading(loading: boolean) { this.setState({ loading }); }

  render() {
    const { users, error, loading } = this.state;
    if (loading) return <Spinner />;
    if (error)   return <ErrorMessage text={error} />;
    return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
  }
}
```

---

## 9. MVVM in Practice — Angular with NgRx / RxJS

### Angular Signals (Angular 17+ MVVM)

```typescript
// viewmodel/counter.component.ts — using Angular Signals
@Component({
  standalone: true,
  selector: 'app-counter',
  template: `
    <p>Count: {{ count() }}</p>
    <p>Doubled: {{ doubled() }}</p>
    <button (click)="increment()">+</button>
    <button (click)="decrement()">-</button>
    <button (click)="reset()">Reset</button>
  `
})
export class CounterComponent {
  // ViewModel state as Signals
  count = signal(0);

  // Derived (computed) state — updates automatically
  doubled = computed(() => this.count() * 2);

  // Commands
  increment() { this.count.update(c => c + 1); }
  decrement() { this.count.update(c => c - 1); }
  reset()     { this.count.set(0); }
}
```

### Vue.js MVVM (Composition API)

```vue
<!-- UserList.vue — MVVM with Vue Composition API -->
<template>
  <!-- View: pure declarative bindings -->
  <div>
    <input v-model="searchTerm" placeholder="Search..." />
    <p>{{ filteredUsers.length }} users found</p>
    <ul>
      <li v-for="user in filteredUsers" :key="user.id">
        {{ user.name }} — {{ user.email }}
      </li>
    </ul>
    <p v-if="error" class="error">{{ error }}</p>
    <button @click="loadUsers" :disabled="isLoading">
      {{ isLoading ? 'Loading...' : 'Refresh' }}
    </button>
  </div>
</template>

<script setup lang="ts">
// ViewModel: reactive state + commands
import { ref, computed, onMounted } from 'vue';
import { UserService } from './user.service';   // Model

const userService = new UserService();

// State
const users     = ref<User[]>([]);
const searchTerm = ref('');
const isLoading = ref(false);
const error     = ref('');

// Derived state
const filteredUsers = computed(() =>
  users.value.filter(u =>
    u.name.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
);

// Commands
async function loadUsers() {
  isLoading.value = true;
  error.value = '';
  try {
    users.value = await userService.getAll();
  } catch {
    error.value = 'Failed to load users.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadUsers);
</script>
```

---

## 10. Choosing the Right Pattern

```
Is this a server-rendered web app or simple CRUD?
└── YES → Use MVC
    (Rails, Express/Pug, Spring MVC, ASP.NET MVC)

Is this an Android app or WinForms app needing high testability?
└── YES → Use MVP
    (Android with Java/Kotlin, WinForms, legacy React)

Is this a modern SPA / component-based framework?
└── YES → Use MVVM
    (Angular, Vue, React hooks, SwiftUI, Jetpack Compose)

    Does the app have complex shared state across many components?
    └── YES → MVVM + State Management Store
              (Angular + NgRx, Vue + Pinia, React + Redux/Zustand)

    Is the app small–medium with localised state per component?
    └── NO store needed → Pure MVVM
              (Angular Signals, Vue Composition API, React hooks)
```

### Decision Matrix

| Project type | Recommended pattern |
|---|---|
| Rails / Django / Laravel server-side app | MVC |
| Express.js + templating (EJS, Pug) | MVC |
| Android app (Java/Kotlin) | MVP or MVVM (Jetpack) |
| Angular application | MVVM (Components + Services) |
| Angular with complex state | MVVM + NgRx |
| Vue.js application | MVVM (Composition API + Pinia) |
| React application | MVVM (custom hooks as ViewModels) |
| React with Redux | MVVM + Flux (similar to NgRx) |
| SwiftUI / Jetpack Compose | MVVM |
| WPF / MAUI | MVVM |
| Micro-frontend architecture | MVVM per shell + shared store |

---

## 11. Common Mistakes

### MVC Mistakes

```typescript
// ❌ Fat Controller — business logic leaking into Controller
class OrderController {
  createOrder(req, res) {
    // validation in controller ← WRONG
    if (!req.body.items || req.body.items.length === 0) { ... }
    // tax calculation in controller ← WRONG
    const tax = req.body.total * 0.18;
    // discount logic in controller ← WRONG
    const discount = req.body.isPremium ? 0.1 : 0;
    // ↑ All of this belongs in the Model / Service layer
  }
}

// ✅ Thin Controller — delegates to Model/Service
class OrderController {
  createOrder(req, res) {
    const result = this.orderService.createOrder(req.body); // Model handles everything
    res.json(result);
  }
}
```

### MVP Mistakes

```typescript
// ❌ Smart View — logic in the View breaks testability
class UserView {
  onSaveClick() {
    const name = this.nameInput.value;
    // validation in View ← WRONG
    if (!name) { this.showError('Required'); return; }
    // formatting in View ← WRONG
    const formatted = name.trim().toLowerCase();
    this.presenter.save(formatted);
  }
}

// ✅ Passive View — all logic in Presenter
class UserView {
  onSaveClick() {
    // View just delegates raw data — Presenter decides what to do
    this.presenter.onSaveUser(this.nameInput.value, this.emailInput.value);
  }
}
```

### MVVM Mistakes

```typescript
// ❌ ViewModel calling View methods directly
class UserViewModel {
  save() {
    this.userService.save(this.user).subscribe(() => {
      document.getElementById('success-msg')!.style.display = 'block'; // ← WRONG
    });
  }
}

// ✅ ViewModel exposes state; View reacts automatically
class UserViewModel {
  saveSuccess$ = new BehaviorSubject<boolean>(false);

  save() {
    this.userService.save(this.user).subscribe(() => {
      this.saveSuccess$.next(true);  // ← View binds to this and reacts
    });
  }
}
```

```typescript
// ❌ Logic in the Template (View)
// template: {{ user.firstName + ' ' + user.lastName | uppercase }}
// ↑ String concatenation + transform logic in template — hard to test

// ✅ Logic in ViewModel
get fullName(): string {
  return `${this.user.firstName} ${this.user.lastName}`.toUpperCase();
}
// template: {{ fullName }}
```

---

## Summary

```
┌────────────────┬──────────────────────────────────────────────────────┐
│ Pattern        │ One-line Summary                                     │
├────────────────┼──────────────────────────────────────────────────────┤
│ MVC            │ Controller glues Model and View; View can see Model  │
│ MVP            │ Presenter owns all UI logic; View is completely dumb │
│ MVVM           │ ViewModel exposes state; View binds automatically    │
└────────────────┴──────────────────────────────────────────────────────┘

Layer Responsibilities:
┌────────────┬────────────────────────────────────────────────────────┐
│ Layer      │ Responsibility                                         │
├────────────┼────────────────────────────────────────────────────────┤
│ Model      │ Data, business rules, API calls, validation            │
│ View       │ Display only — templates, HTML, UI components          │
│ Controller │ Receives input → calls Model → updates View            │
│ Presenter  │ All UI logic → calls Model → updates View via IView    │
│ ViewModel  │ Reactive state + commands; View binds automatically    │
└────────────┴────────────────────────────────────────────────────────┘
```

> **The golden rule for all three patterns:**
> The **Model** never knows about the View, Presenter, or ViewModel.
> Keep business logic out of the View — always.

---

*Related: Angular Architecture, NgRx, React Hooks, Vue Composition API, Clean Architecture, Component Design Patterns, Micro-Frontend Architecture*
