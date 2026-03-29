# Expenso MVP

Expense management system with OCR receipt scanning, voice commands, and multi-level approval workflows.

<p align="center">
  <img src="images/localhost_3000_dashboard%20(7).png" width="800" alt="Expenso MVP Overview" />
</p>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS |
| Backend | Node.js, Express 4 |
| Database | MongoDB, Mongoose 8 |
| OCR | Tesseract.js (client-side) |
| Image Processing | OpenCV.js (client-side) |
| Voice | Web Speech API |
| Auth | JWT |

## Prerequisites

- **Node.js** 16+
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))
- **Chrome** (recommended for voice recognition)

## Getting Started

```bash
# 1. Install all dependencies (root + client + server)
npm run install-all

# 2. Configure environment
cp env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 3. Seed demo data
cd server && npm run seed && cd ..

# 4. Start both server and client
npm run dev
```

- **Server** → http://localhost:5000
- **Client** → http://localhost:3000

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@demo.com` | `password123` |
| Manager | `manager@demo.com` | `password123` |
| Employee | `employee@demo.com` | `password123` |

## Project Structure

```
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── Admin/          # User management, approval flow config, audit logs, fraud alerts
│       │   ├── Analytics/      # Interactive analytics dashboard with charts
│       │   ├── Auth/           # Login & signup
│       │   ├── Dashboard/      # Role-based home dashboard
│       │   ├── Expense/        # Expense form, list, OCR panel, voice input
│       │   └── Manager/        # Pending approvals & review
│       ├── services/api.js     # Axios API client
│       └── utils/
│           ├── ocr.js          # Tesseract.js OCR pipeline
│           ├── preprocess.js   # Image preprocessing (deskew, contrast, denoise)
│           └── voice.js        # Speech recognition & NLP parsing
├── server/
│   ├── simple-server.js        # Main Express server (all routes inline)
│   ├── models/                 # Mongoose schemas (Company, Expense, User)
│   ├── routes/                 # Modular route files
│   │   ├── auth.js             # Signup, login, session
│   │   ├── expenses.js         # CRUD + approval actions
│   │   ├── users.js            # User management (admin)
│   │   ├── companies.js        # Company settings
│   │   ├── analytics.js        # KPIs, timeseries, categories, export
│   │   └── integration.js      # External API integrations
│   ├── middleware/              # JWT auth middleware
│   └── seed.js                 # Database seeder
├── .env                        # Environment variables
└── package.json                # Root scripts (dev, install-all)
```

## Features

### Expense Creation
- **Manual entry** — amount, currency, category, description, date
- **Voice commands** — say *"Add ₹500 lunch expense today"* and the form auto-fills
- **OCR receipt upload** — image preprocessing → Tesseract extraction → field-level confidence scores → inline editing

<p align="center"><img src="images/localhost_3000_dashboard%20(4).png" width="600" alt="Expense Creation" /></p>

### OCR Pipeline
1. Image preprocessing (deskew, contrast enhancement, noise reduction)
2. Tesseract.js text extraction with word-level confidence
3. Regex-based field extraction (amount, date, merchant)
4. Confidence scoring with color indicators (green >80%, yellow 50–80%, red <50%)

### Approval Workflow
- **Sequential** — Manager → Finance → Director
- **Conditional** — percentage-based (e.g. 60% of approvers) or specific-role rules (e.g. CFO auto-approves)
- **Hybrid** — combine sequential + conditional in a single flow
- Full audit trail with comments

<p align="center"><img src="images/localhost_3000_dashboard%20(3).png" width="600" alt="Approval Workflow" /></p>

### Multi-Currency
- Country-based default currency on signup
- Real-time exchange rates via [exchangerate-api.com](https://www.exchangerate-api.com)
- Auto-conversion to company currency

### Analytics Dashboard
- KPI cards (total spend, pending approvals, avg approval time)
- Time-series spend chart, category donut, top merchants bar chart
- Approval funnel visualization
- Cross-filtering, drilldown drawer, CSV export
- Role-based access (admin: company-wide, manager: team-level)

<p align="center"><img src="images/localhost_3000_dashboard%20(1).png" width="600" alt="Analytics Dashboard" /></p>

### Admin Panel
- User management with role assignment (Admin, Manager, Employee, Finance, Director, CFO)
- Approval flow configuration
- Audit logs
- Fraud alerts

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account & company |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user profile |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses` | List expenses (filtered by role) |
| POST | `/api/expenses/:id/approve` | Approve or reject |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (admin) |
| POST | `/api/users` | Create user (admin) |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/kpis` | Key performance indicators |
| GET | `/api/analytics/timeseries` | Spend over time |
| GET | `/api/analytics/categories` | Category breakdown |
| GET | `/api/analytics/top-merchants` | Top merchants |
| GET | `/api/analytics/approval-funnel` | Approval funnel metrics |
| GET | `/api/analytics/export` | CSV export |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server + client concurrently |
| `npm run server` | Start backend only (nodemon) |
| `npm run client` | Start frontend only (Vite) |
| `npm run install-all` | Install dependencies for root, client, and server |
| `cd server && npm run seed` | Seed database with demo data |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/expenzo_mvp` | MongoDB connection string |
| `JWT_SECRET` | — | Secret key for JWT signing |
| `NODE_ENV` | `development` | Environment mode |

## Troubleshooting

- **Voice not working** — use Chrome, allow microphone permission
- **OCR slow** — use clear, high-contrast receipts; resize to ~800px width
- **MongoDB connection error** — ensure `mongod` is running; verify `MONGODB_URI` in `.env`
- **Port in use** — kill the process on port 5000/3000 or change in `.env`

## License

MIT

