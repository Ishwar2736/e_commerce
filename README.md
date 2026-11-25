# OmniStore - Full-Stack E-Commerce Platform

A production-ready full-stack e-commerce web application with **Customer Storefront**, **Payment Gateway Simulation**, **Real-Time Order Tracking**, and an **Admin Control Panel with Manual Customer Email Verification**, built according to the UML Use Case architecture.

Configured for **one-click deployment to Vercel** and direct push to GitHub.

---

## 🌟 Key Features & UML Diagram Implementation

- **Customer Flow**:
  - **Account Registration & Verification**: Customer registers with email, password, phone, and address. Account starts in `Pending Approval` status. Login is blocked until Admin review.
  - **Catalog & Search**: Interactive category filter pills, instant live keyword search, price and rating sorting.
  - **Product Details & Reviews**: Full specifications, stock level indicators, customer star ratings, and review submission with `Verified Buyer` badge.
  - **Slide-Over Cart**: Instant quantity adjustment, tax estimation (8%), and free shipping calculator.
  - **Checkout & Payment Gateway**: Interactive modal with test card autofill, UPI / QR, and Cash on Delivery. Decrements inventory atomically.
  - **Live Order Tracking**: Visual milestone timeline (*Placed → Confirmed → Hub Processing → In Transit → Out for Delivery → Delivered*).
  - **Order Cancellation**: Restores product inventory and issues a payment refund.
- **Admin Control Panel**:
  - **Manual Customer Email Verification (Special Highlight)**: Filter pending customers, click **"✓ Approve (Send Email)"**, dispatch token verification links, or reject accounts.
  - **Catalog Management**: Add, edit, and delete products and categories.
  - **Order Management & Delivery Service**: Advance shipment status and automatically dispatch notification emails to customers.
  - **Payment Transactions**: Gateway reference IDs, payment method tracking, and refund processing.
  - **Analytics & Reports**: Total revenue, orders, customer acquisition ratio, average order value, category sales bars, and print/export summary.
- **In-App Mailbox Inspector**:
  - Click the **Mailbox Icon (✉)** in the header to view and test all sent emails in rich HTML with functional activation links.

---

## 🚀 How to Deploy Directly to Vercel

### Step 1: Push to GitHub

Open a terminal inside the `ecommerce-store` directory:

```bash
cd ecommerce-store

# Initialize git repository
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: full-stack ecommerce with admin email verification"

# Link to your new GitHub repository (replace with your repository URL)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# Push to GitHub
git push -u origin main
```

---

### Step 2: Deploy on Vercel

1. Go to [https://vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** &rarr; **"Project"**.
3. Select your GitHub repository.
4. Keep all default settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
5. Click **"Deploy"**.
6. Your live e-commerce site will be live at `https://your-project.vercel.app` in under 30 seconds!

---

## 💻 Local Development

No external npm build tools or database installations are needed. The server runs with Node's native HTTP, Crypto, and File System modules:

```bash
# Start local server
node api/index.js
```

Or double-click `run.bat` on Windows.

Open your browser at:
`http://localhost:3000`

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Status | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Store Admin** | `admin@store.com` | `admin123` | Approved | Full access to approve users, manage products, orders, payments, and reports. |
| **Verified Customer** | `john@example.com` | `customer123` | Approved | Can immediately browse, add to cart, checkout, and review. |
| **Pending Customer** | `alice@example.com` | `alice123` | Pending Approval | Test login blockage and approve her from the Admin Panel. |

*(Use the **"Quick Test"** shortcuts in the top navigation bar to switch accounts in one click).*

---

## 📁 Repository Structure

```text
├── api/
│   ├── index.js          # Vercel Serverless Function & local development server
│   ├── db.js             # Vercel /tmp + local persistent JSON database
│   ├── auth.js           # Salted PBKDF2 hashing & JWT authentication
│   └── mailer.js         # Email dispatcher with HTML templates & outbox logger
├── public/
│   ├── index.html        # Responsive frontend single-page application
│   ├── css/
│   │   └── style.css     # Design system, modal/drawer styles, badges & animations
│   └── js/
│       └── app.js        # Store & Admin state, API integration & UI logic
├── .gitignore            # Git ignore rules
├── package.json          # Root package descriptor
├── vercel.json           # Vercel serverless routing configuration
├── run.bat               # Windows local launcher
└── README.md             # Project documentation
```
