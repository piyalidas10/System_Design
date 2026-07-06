# Online Banking Platform
A real-life enterprise application that follows this architecture is an online banking platform (e.g., internet banking or mobile banking).
Here's how the flow works when a customer checks their account balance.

```
Customer
   │
   ▼
┌──────────────────────────┐
│ UI                       │
│ Angular / React App      │
└─────────────┬────────────┘
              │ HTTPS Request
              ▼
┌──────────────────────────┐
│ EM Gateway               │
│ Authentication           │
│ Authorization            │
│ API Routing              │
│ Rate Limiting            │
│ Logging                  │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ Power CAB                │
│ Business Orchestration   │
│ Business Rules           │
│ Service Coordination     │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ BIP                      │
│ Integration Layer        │
│ Request Transformation   │
│ Connects to Core Systems │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ SOR                      │
│ Core Banking Database    │
│ (System of Record)       │
└──────────────────────────┘
```

## Scenario: Customer checks account balance

### Step 1 – UI
- Customer logs into the banking application.
- Clicks "View Account Balance".

### Step 2 – EM Gateway
- Verifies the JWT/OAuth token.
- Checks whether the customer is authenticated.
- Routes the request to the appropriate backend service.

### Step 3 – Power CAB
- Validates that the account belongs to the authenticated customer.
- Applies business rules (e.g., account status, permissions).
- Determines which backend services are required.

### Step 4 – BIP
- Converts the REST request into the protocol expected by the core banking system (REST, SOAP, MQ, ISO8583, etc.).
- Calls the core banking application.

### Step 5 – SOR (System of Record)
- Retrieves the latest account balance from the core banking database.
- Returns the response.

## Response Flow

```
SOR
  ▲
  │
BIP
  ▲
  │
Power CAB
  ▲
  │
EM Gateway
  ▲
  │
UI
```

The customer sees:
```
Savings Account
Available Balance : ₹2,35,480.25
```

## Another example: Money Transfer
Customer clicks "Transfer ₹10,000"
```
UI
 ↓
EM Gateway
 ↓
Power CAB
   • Validate balance
   • Check daily transfer limit
   • Fraud detection
   • Calculate charges
 ↓
BIP
   • Invoke Core Banking APIs
 ↓
SOR
   • Debit Account A
   • Credit Account B
   • Save Transaction
 ↑
Success Response
```

## Responsibilities in a Banking Application
| Layer          | Real Responsibility                                                                     |
| -------------- | --------------------------------------------------------------------------------------- |
| **UI**         | Angular web app or mobile banking app                                                   |
| **EM Gateway** | Security, OAuth/JWT validation, routing, throttling, logging                            |
| **Power CAB**  | Business logic, orchestration, fraud checks, eligibility rules                          |
| **BIP**        | Integration with core banking, payment systems, CRM, and legacy services                |
| **SOR**        | Core Banking System (CBS), Oracle/DB2 databases, customer accounts, transaction history |

## Other real-world applications using the same architecture
- Insurance: Policy purchase, premium payment, claim processing.
- Telecom: Recharge, bill payment, plan changes, SIM activation.
- E-commerce: Order placement, inventory checks, payment processing.
- Healthcare: Appointment booking, electronic medical records, billing.
- Airlines: Flight search, seat reservation, ticket booking, payment.

This layered architecture is common in large enterprises because it cleanly separates user interaction, security, business logic, system integration, 
and the authoritative data source, making the application easier to scale, secure, and maintain.








