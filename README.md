# 💳 PayPulse — Advanced Digital Payment & Wallet Management Platform

[![Django](https://img.shields.io/badge/Django-5.0+-0C4B33?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.14+-red?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![JWT](https://img.shields.io/badge/JWT-SimpleJWT-black?style=for-the-badge&logo=json-web-tokens&logoColor=white)](https://jwt.io/)
[![Status](https://img.shields.io/badge/Status-Production--Ready-success?style=for-the-badge)](#)

**PayPulse** is a complete, production-grade fintech digital wallet and payment application built with a modern **Python/Django REST Framework** backend and a high-performance **React + Tailwind CSS** frontend. It features an auditable **double-entry ledger engine**, **concurrency-safe atomic transactions**, **dynamic/personal QR code payments**, a **sandbox payment gateway** for top-ups, a **payment request network**, and an **administrator portal** for platform oversight and refund processing.

---

## 📑 Table of Contents

1. [Architectural Overview](#-architectural-overview)
2. [Key Features](#-key-features)
3. [Technology Stack](#-technology-stack)
4. [Double-Entry Ledger & Financial Safety](#-double-entry-ledger--financial-safety)
5. [Pre-Seeded Demo Credentials](#-pre-seeded-demo-credentials)
6. [Getting Started (Local Development)](#-getting-started-local-development)
   - [Prerequisites](#prerequisites)
   - [Backend Setup](#1-backend-setup)
   - [Frontend Setup](#2-frontend-setup)
7. [Running Tests](#-running-tests)
8. [API Documentation & Postman Collection](#-api-documentation--postman-collection)
9. [Security Policies](#-security-policies)
10. [Folder Structure](#-folder-structure)

---

## 🏛 Architectural Overview

PayPulse follows a clean, decoupled service-layer architecture that completely separates presentation, validation, business domain logic, and persistence:

```
[ React 18 + Tailwind UI Client ]
        │  ▲
        │  │ REST (JSON over HTTP / JWT Bearer)
        ▼  │
[ DRF Views / API Endpoints ]
        │
        ▼
[ Serializers & Data Validators ]
        │
        ▼
[ Domain Services Layer ]
  ├── WalletService (Atomic row-locking, double-entry ledger)
  ├── PaymentService (P2P transfers, payment requests, top-ups)
  ├── QRService (HMAC-SHA256 signature, Pillow rendering, scanner validation)
  ├── SandboxPaymentGateway (Checkout intent, HMAC webhook verification)
  ├── NotificationService (In-app real-time event alerts)
  └── AuditService (Immutable security & access logging)
        │
        ▼
[ Django ORM Models ]
  ├── User, Profile, OTP, DeviceSession
  ├── Wallet, WalletLedger
  ├── Transaction, PaymentRequest, Refund
  ├── QRCode, Notification, AuditLog
        │
        ▼
[ PostgreSQL / SQLite3 Database Engine ]
```

---

## ✨ Key Features

### 1. 🔐 Authentication & Session Security
- **JWT Authentication:** Dual-token strategy with short-lived access tokens and long-lived refresh tokens.
- **Automatic Token Refresh:** Seamless Axios interceptor refreshes access tokens silently in the background.
- **Account Lockout Protection:** Automatically locks user accounts for 15 minutes after 5 consecutive failed login attempts.
- **OTP Verification:** Cryptographically secure 6-digit numeric OTPs for email/phone verification and password reset workflows.
- **Transaction Security PIN:** 4-6 digit numeric PIN required to authorize sensitive payments and high-value transfers.
- **Device & Session Management:** Records client IP addresses, user agents, and active sessions with remote logout capability.

### 2. 💰 Digital Wallet & Double-Entry Ledger Engine
- **No Ad-Hoc Balance Updates:** Balances are never modified directly. Every financial operation creates an immutable `WalletLedger` entry with `balance_before` and `balance_after`.
- **Concurrency & Overdraft Protection:** Employs `transaction.atomic()` and `select_for_update()` row-level locks in deterministic UUID order to prevent race conditions, double spending, and deadlocks.
- **Idempotency Keys:** Every transfer supports idempotency keys to guarantee duplicate HTTP requests never execute duplicate debits.

### 3. 💸 Instant Send & Receive Money
- **Counterparty Search:** Search registered users by username, email, phone number, or unique payment identifier.
- **Transfer Summary & Review:** Two-step confirmation with recipient preview, zero platform fee calculation, and PIN authorization.
- **Real-Time Notification:** Instant alerts dispatched to both sender and recipient.

### 4. 📩 Payment Request Network
- **Request Money:** Request funds from any registered user with an optional note and expiration date.
- **Incoming / Outgoing Management:** Review pending requests with one-click "Accept & Pay" or "Decline" actions.

### 5. 📷 Personal & Dynamic QR Code Payments
- **Personal QR Codes:** Unique opaque payment identifiers (`PAY-XXXXXXXX`) rendered into high-resolution QR codes without exposing bank numbers or sensitive data.
- **Dynamic Invoice QR:** Time-bound QR codes with preset amounts, custom reference notes, and HMAC-SHA256 signatures to prevent tampering or replay attacks.
- **Universal Scanner:** Integrated camera scanner with real-time laser animation, file upload scanner fallback, and manual identifier resolution.

### 6. 🛡️ Sandbox Payment Gateway (Wallet Top-Up)
- **Safe Development Environment:** Complete sandbox payment gateway abstraction simulating cards, UPI, and Netbanking.
- **Signature Verification:** Validates webhook/confirmation signatures via HMAC-SHA256 before crediting user wallets.
- **Confetti Celebration:** Interactive checkout modal with instant feedback and visual rewards.

### 7. 🧾 Transaction History & Official Receipts
- **Deep Filtering & Search:** Filter by transaction category (SEND, RECEIVE, ADD_MONEY, QR_PAYMENT, REFUND), status, and date ranges.
- **Printable Receipts:** Verified digital receipts with transaction ID, reference ID, timestamps, and one-click print/PDF support.
- **Refund Requests:** Users can submit refund requests on eligible transactions directly from their history table.

### 8. 👑 Administrator Operations Portal
- **Executive Analytics:** Real-time metrics for total users, active accounts, platform liquidity, and total volume.
- **Interactive 7-Day Volume Chart:** Daily transaction volume visualization.
- **User Account Management:** Inspect user balances, view individual ledger records, suspend/activate accounts, and verify KYC submissions.
- **Refund Settlement Queue:** Review pending refunds and execute compensating double-entry ledger transfers with administrator audit notes.
- **Immutable Audit Logs:** Complete security audit trail tracking IPs, actions, timestamps, and metadata.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.14+, Django 5.x, Django REST Framework, SimpleJWT, Celery/Redis compatible |
| **Database** | PostgreSQL (Production) / SQLite3 (Zero-setup local development fallback) |
| **Security** | Argon2/PBKDF2 Password Hashing, HMAC-SHA256 Signatures, Rate Throttling, CORS Whitelisting |
| **Frontend** | React 18, Vite, Tailwind CSS v3, React Router v6, Axios, Lucide Icons, Canvas Confetti |
| **QR Engine** | Python `qrcode` + Pillow (Backend), `qrcode.react` + `html5-qrcode` (Frontend) |
| **Testing** | Django TestCase Suite, Postman Collection v2.1 |

---

## 💳 Double-Entry Ledger & Financial Safety

In PayPulse, financial integrity is enforced at the database level:

```python
with transaction.atomic():
    # Lock wallets in canonical UUID order to eliminate deadlocks
    ids = sorted([sender_wallet.id, receiver_wallet.id])
    wallets_map = {w.id: w for w in Wallet.objects.select_for_update().filter(id__in=ids)}

    locked_sender = wallets_map[sender_wallet.id]
    locked_receiver = wallets_map[receiver_wallet.id]

    # Verify balance
    if locked_sender.balance < amount:
        raise InsufficientFundsException("Insufficient balance.")

    # Record DEBIT on sender ledger
    WalletLedger.objects.create(
        wallet=locked_sender,
        entry_type='DEBIT',
        amount=amount,
        balance_before=locked_sender.balance,
        balance_after=locked_sender.balance - amount,
        ...
    )
    locked_sender.balance -= amount
    locked_sender.save(update_fields=['balance', 'updated_at'])

    # Record CREDIT on receiver ledger
    WalletLedger.objects.create(
        wallet=locked_receiver,
        entry_type='CREDIT',
        amount=amount,
        balance_before=locked_receiver.balance,
        balance_after=locked_receiver.balance + amount,
        ...
    )
    locked_receiver.balance += amount
    locked_receiver.save(update_fields=['balance', 'updated_at'])
```

---

## 👥 Pre-Seeded Demo Credentials

The database comes pre-seeded with functional test accounts ready for demonstration:

| Role | Username | Email | Password | Security PIN | Initial Balance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin@paypulse.com` | `Admin@12345` | `1234` | System Root |
| **Verified User** | `rahul` | `rahul@example.com` | `Password@123` | `1234` | ₹12,500.00 |
| **Verified User** | `priya` | `priya@example.com` | `Password@123` | `1234` | ₹8,400.00 |
| **Verified User** | `vikram` | `vikram@example.com` | `Password@123` | `1234` | ₹4,200.00 |

> **Tip:** You can click the **Quick Demo Accounts** chips on the Login page to prefill credentials instantly!

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Python 3.10+** (Python 3.14 supported)
- **Node.js 18+** and **npm**
- **Git**

---

### 1. Backend Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd "Payment app"

# 2. Activate Python Virtual Environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Configure Environment
# Copy sample configuration
cp backend/.env.example backend/.env

# 5. Run Database Migrations
python backend/manage.py migrate

# 6. Seed Sample Data (Users, Wallets, Transactions, QR codes)
python backend/manage.py seed_data

# 7. Start Django Development Server
python backend/manage.py runserver 0.0.0.0:8000
```

The backend API will be available at: **`http://127.0.0.1:8000/`**  
API Health Check: **`http://127.0.0.1:8000/api/health/`**

---

### 2. Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install npm dependencies
npm install

# 3. Start Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```

The frontend application will be available at: **`http://127.0.0.1:5173/`**

---

## 🧪 Running Tests

The backend includes a comprehensive unit and integration test suite covering ledger integrity, concurrency, and payment flows:

```bash
# Run all backend unit tests
python backend/manage.py test apps
```

**Test Coverage Highlights:**
- `WalletLedgerTests`: Balance calculations, immutable audit trail verification, overdraft prevention.
- `PaymentFlowTests`: P2P Send Money, PIN checks, Payment Request acceptance, Sandbox Top-Up signature verification.
- `QRCodePaymentTests`: Personal QR generation, dynamic single-use invoice QR redemption and expiration.

---

## 📬 API Documentation & Postman Collection

A complete, pre-configured Postman Collection is included in the project:

📂 File: [`postman/PayPulse_API_Collection.postman_collection.json`](file:///d:/Payment%20app/postman/PayPulse_API_Collection.postman_collection.json)

### Key Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/health/` | Service health status |
| **Auth** | `POST` | `/api/auth/register/` | Register new user and provision wallet |
| **Auth** | `POST` | `/api/auth/login/` | Sign in & receive JWT access + refresh tokens |
| **Auth** | `POST` | `/api/auth/refresh/` | Obtain new access token via refresh token |
| **Auth** | `POST` | `/api/auth/set-pin/` | Configure 4-digit security PIN |
| **Profile**| `GET` | `/api/profile/` | Fetch current user profile & wallet stats |
| **Profile**| `PATCH`| `/api/profile/` | Update profile information |
| **Profile**| `POST` | `/api/profile/kyc/` | Submit KYC verification documents |
| **Wallet** | `GET` | `/api/wallet/` | Balance, limits, and monthly cashflow metrics |
| **Wallet** | `GET` | `/api/wallet/ledger/` | Paginated double-entry ledger statement |
| **Wallet** | `POST` | `/api/wallet/add-money/initiate/` | Create sandbox top-up intent |
| **Wallet** | `POST` | `/api/wallet/add-money/sandbox-mock/`| Instant mock checkout simulator |
| **Payments**| `POST`| `/api/payments/send/` | Send money to username/email/phone |
| **Payments**| `POST`| `/api/payments/request/` | Create a money request |
| **Payments**| `POST`| `/api/payments/request/<id>/accept/`| Accept & settle incoming payment request |
| **Payments**| `POST`| `/api/payments/request/<id>/reject/`| Decline payment request |
| **QR** | `GET` | `/api/qr/my/` | Fetch or generate user's personal QR |
| **QR** | `POST` | `/api/qr/generate/` | Create time-bound dynamic invoice QR |
| **QR** | `POST` | `/api/qr/validate/` | Validate scanned QR code payload |
| **QR** | `POST` | `/api/qr/pay/` | Settle payment via QR code |
| **Admin** | `GET` | `/api/admin/stats/` | System volume, user counts, and 7-day chart |
| **Admin** | `GET` | `/api/admin/users/` | User management and KYC review |
| **Admin** | `POST` | `/api/admin/refunds/<id>/action/` | Approve/Reject refund & adjust ledger |
| **Admin** | `GET` | `/api/admin/audit-logs/` | Immutable system event audit logs |

---

## 🔒 Security Policies

- **Zero Trust Balance:** Frontend balances are never trusted. All calculations and limits are evaluated strictly within the database transaction boundary.
- **PIN Verification:** High-value transfers require the user's encrypted transaction PIN.
- **Signature Integrity:** Dynamic QR codes and sandbox webhooks are signed using HMAC-SHA256 with project secrets.
- **Rate Throttling:** Built-in DRF rate limits protect authentication endpoints against brute force attempts.

---

## 📂 Folder Structure

```
Payment app/
├── backend/
│   ├── apps/
│   │   ├── admin_portal/       # Administrator metrics, user audit, refund processing
│   │   ├── audit/              # Immutable event logging service & models
│   │   ├── authentication/     # JWT, OTP verification, sessions, PIN management
│   │   ├── notifications/      # Real-time event notifications
│   │   ├── payments/           # P2P transfers, payment requests, sandbox gateway
│   │   ├── qrcodes/            # Dynamic and personal QR code generator & validation
│   │   ├── users/              # Custom User, Profile, KYC models & signals
│   │   └── wallets/            # Double-entry ledger engine & wallet service
│   ├── common/                 # Permissions, standard API response, exception handler
│   ├── config/                 # Settings, root URLs, WSGI, ASGI
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js       # Axios with auto token refresh interceptor
│   │   ├── components/         # Reusable BalanceCard, Modals, QRScanner, Receipts
│   │   ├── context/            # AuthContext, ThemeContext, ToastContext
│   │   ├── layouts/            # AppLayout (Sidebar, Navbar, Mobile BottomNav)
│   │   ├── pages/              # Auth, Dashboard, Wallet, Payments, QR, Admin
│   │   ├── App.jsx             # React Router route definitions
│   │   ├── index.css           # Tailwind CSS directives & glassmorphism
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── postman/
│   └── PayPulse_API_Collection.postman_collection.json
├── README.md
└── .gitignore
```

---

## 📄 License
This project is developed as a production-style fintech educational and portfolio platform. Licensed under the [MIT License](LICENSE).
