# HavenBridge

A nonprofit platform connecting case workers and donors to improve outcomes for vulnerable children in the Philippines. Built with **ASP.NET Core 10**, **React + TypeScript**, **Tailwind CSS**, and **MySQL**.

---

## Quick Start

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)

### First-Time Setup

```powershell
.\setup.ps1
```

This checks prerequisites, restores .NET packages, and installs frontend dependencies.

### Start the App

```powershell
.\start.ps1
```

Launches both the backend API and the frontend dev server in one command. The app opens at **http://localhost:5173**.

### JWT Environment Setup (Required)

Backend auth now reads JWT config from environment variables.

1. Copy `HavenBridge.Api/.env.example` to `HavenBridge.Api/.env`
2. Set `JWT__KEY` to a strong secret (32+ chars)

```bash
cd HavenBridge.Api
cp .env.example .env
```

Example `.env`:

```env
JWT__KEY=replace-with-a-long-random-secret-at-least-32-chars
JWT__ISSUER=HavenBridge.Api
JWT__AUDIENCE=HavenBridge.Frontend
```

### Other Scripts

| Script | What it does |
|--------|-------------|
| `.\start.ps1` | Start both backend + frontend |
| `.\reset-db.ps1` | Delete the local database so it re-seeds from CSVs on next start |
| `bash reset-db.sh` | As noted above, for Macs |
| `.\setup.ps1` | First-time install of all dependencies |

### Manual Start (if you prefer)

```powershell
# Terminal 1 — Backend API (http://localhost:5149)
cd HavenBridge.Api
dotnet run

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm install   # only needed first time
npm run dev
```

On first run, the MySQL database is auto-created and populated from 17 CSV seed files (~7,000 rows of real data).

### Access the App

| URL | What it is |
|-----|------------|
| `/` or `/welcome` | Public landing page |
| `/impact` | Public impact dashboard (no login) |
| `/login` | Staff login (enter any email + password) |
| `/dashboard` | Staff dashboard (requires login) |

---

## Project Structure

```
HavenBridge/
│
├── docs/                            # Documentation
│   └── SPEC.md                      # Original design spec & full ERD
│
├── HavenBridge.Api/                 # ASP.NET Core Web API
│   ├── Controllers/                 # REST API endpoints
│   │   ├── AdminController.cs       #   Admin search & activity feed
│   │   ├── DonationsController.cs   #   Donation CRUD
│   │   ├── HomeVisitationsController.cs
│   │   ├── ImpactController.cs      #   Public impact & donor impact
│   │   ├── ProcessRecordingsController.cs
│   │   ├── ResidentsController.cs   #   Resident CRUD & alerts
│   │   ├── SafehousesController.cs
│   │   └── SupportersController.cs  #   Supporter CRUD & summary
│   ├── Data/
│   │   ├── HavenBridgeContext.cs    # EF Core DbContext (19 tables)
│   │   └── CsvDataImporter.cs      # Startup CSV → MySQL importer
│   ├── Models/                      # Entity models (one per table)
│   ├── SeedData/                    # 17 CSV files with real data
│   ├── Properties/
│   │   └── launchSettings.json
│   ├── Program.cs                   # App startup & configuration
│   ├── appsettings.json
│   └── HavenBridge.Api.csproj
│
├── frontend/                        # React + Vite + TypeScript
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── CookieConsent.tsx    #   GDPR cookie banner
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Modal.tsx            #   Reusable modal dialog
│   │   │   ├── StatusBadge.tsx      #   Color-coded status pills
│   │   │   └── SummaryCard.tsx      #   Metric card with icon
│   │   ├── layouts/
│   │   │   └── AppLayout.tsx        # Staff shell: nav bar + sign out
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx      # Public: hero, mission, live stats
│   │   │   ├── PublicImpactPage.tsx  # Public: anonymized impact data
│   │   │   ├── LoginPage.tsx        # Staff login
│   │   │   ├── PrivacyPolicyPage.tsx # Privacy policy
│   │   │   ├── DashboardPage.tsx    # Staff: overview metrics
│   │   │   ├── CaseDashboardPage.tsx # Staff: 3-panel case management
│   │   │   ├── DonorManagementPage.tsx # Staff: donor table + detail
│   │   │   ├── ReportsPage.tsx      # Staff: analytics & comparisons
│   │   │   ├── AdminPortalPage.tsx  # Staff: quick actions & search
│   │   │   └── DonorPortalPage.tsx  # External: donor self-service
│   │   ├── services/
│   │   │   └── api.ts               # Centralized API client
│   │   ├── types/
│   │   │   └── models.ts            # TypeScript interfaces (all entities)
│   │   ├── App.tsx                   # Routes & auth guard
│   │   ├── main.tsx                  # Entry point
│   │   └── index.css                # Tailwind + custom theme
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── eslint.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Pages & Routes

### Public (no login required)

| Route | Page | Description |
|-------|------|-------------|
| `/welcome` | Landing Page | Hero, mission statement, live stats, CTAs |
| `/impact` | Impact Dashboard | Anonymized aggregate data & published snapshots |
| `/login` | Staff Login | Email + password entry, stores auth in localStorage |
| `/privacy` | Privacy Policy | 7-section policy page |

### Staff (login required)

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Overview metrics, recent activity, quick actions |
| `/cases` | Case Dashboard | Resident list with search/filter, detail panel with tabs (Sessions, Health, Education, Visits, Notes), alerts sidebar |
| `/donors` | Donor Management | Summary cards, donor table, detail panel with giving history & impact |
| `/reports` | Reports & Analytics | Safehouse comparison table, donor overview, alert summary |
| `/admin` | Admin Portal | Quick action buttons, search, activity feed |
| `/donor-portal` | Donor Portal | External donor view with impact, history, profile |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/residents` | List all residents |
| GET | `/api/residents/{id}` | Resident detail with all related records |
| POST | `/api/residents` | Create a resident |
| GET | `/api/residents/alerts` | Active alerts (high risk, flagged, unresolved) |
| GET | `/api/supporters` | List all supporters/donors |
| GET | `/api/supporters/{id}` | Supporter detail with donation history |
| POST | `/api/supporters` | Create a supporter |
| PUT | `/api/supporters/{id}` | Update a supporter |
| GET | `/api/supporters/summary` | Donor summary statistics |
| GET | `/api/donations` | List donations (optional `?supporterId=`) |
| POST | `/api/donations` | Record a donation |
| GET | `/api/safehouses` | List all safehouses |
| GET | `/api/safehouses/{id}` | Safehouse detail |
| GET | `/api/processrecordings` | List sessions (optional `?residentId=`) |
| POST | `/api/processrecordings` | Log a session |
| GET | `/api/homevisitations` | List visits (optional `?residentId=`) |
| POST | `/api/homevisitations` | Log a visit |
| GET | `/api/impact/overview` | Platform-wide impact metrics |
| GET | `/api/impact/donor/{id}` | Per-donor impact breakdown |
| GET | `/api/impact/snapshots` | Published impact stories |
| GET | `/api/admin/recent-activity` | Recent activity feed |
| GET | `/api/admin/search?q=` | Search residents and supporters |

---

## Data Model

19 tables modeled after the full ERD (see `docs/SPEC.md`):

| Domain | Tables |
|--------|--------|
| **Facilities** | Safehouses, Safehouse Monthly Metrics |
| **Case Management** | Residents, Process Recordings, Intervention Plans, Home Visitations, Health & Wellbeing Records, Education Records, Incident Reports |
| **Fundraising** | Supporters, Donations, Donation Allocations, In-Kind Donation Items |
| **Partnerships** | Partners, Partner Assignments |
| **Authentication** | Users, Roles |
| **Outreach** | Social Media Posts, Public Impact Snapshots |

Seed data: **7,000+ rows** imported from CSV at startup.

---

## Key Features

- **Search & filter** on resident caseload (by name, status, risk level)
- **Modal forms** for adding sessions, home visits, and donations
- **Auth guard** — staff pages require login; public pages open to all
- **Cookie consent** banner with privacy policy link
- **Sign out** from the navigation bar
- **CSV data importer** populates the database on first run
