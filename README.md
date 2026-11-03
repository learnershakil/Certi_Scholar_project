# CertiScholar

> **OCR-Based Document Verification and Explainable Scholarship Eligibility Platform**  
> **Track:** Track J — Next.js + Node.js/TypeScript + MongoDB, with a Python OCR service  
> **Repository:** Monorepo (Bun 1.4.4 + Turborepo 2.11.10)

---

## 1. Overview

CertiScholar is a multi-institute SaaS platform designed to eliminate manual, slow, and error-prone document verification and scholarship eligibility evaluations.

The platform provides:
- **M1 Secure Document Intake:** Server-side MIME & magic-byte validation, PDF structural inspection (blocking active `/JavaScript` and `/Launch` actions), ClamAV/EICAR malware quarantine, and private Cloudflare R2 storage with scoped 15-minute presigned URLs.
- **Mandatory BFF Security Proxy:** Browser client calls only the Next.js BFF (`/api/bff/*`), which automatically adds the server-only `x-http-key` header to backend requests, preventing direct browser tampering.
- **Multi-Institute Tenancy:** Platform Super Admin, Institute Admin, Verification Officer, Scholarship Officer, and Student roles with strict database-level `instituteId` isolation.
- **Explainable Decisions:** Transparent separation between OCR extraction, mathematical recalculation, student-consented sharing (Certi Adapter), and authentic authoritative issuer verification (DigiLocker).
- **Audit & Timeline (M10):** Complete ordered processing history and tamper-evident audit logging for every document view and administrative action.

---

## 2. Monorepo Structure

```text
certi_scholar/
├── apps/
│   ├── web/                    # Next.js 16 (App Router) + Tailwind + BFF Proxy
│   └── api/                    # Node.js + TypeScript API (Express, Mongoose, BullMQ)
├── services/
│   └── ocr/                    # Python OCR microservice (Google Cloud Vision adapter)
├── packages/
│   ├── contracts/              # Shared Zod schemas, TypeScript types, and enums
│   ├── typescript-config/      # Shared tsconfig definitions
│   └── ui/                     # Shared UI components
├── infra/
│   └── docker/                 # Container images
├── docker-compose.yml          # Local MongoDB 7.0 + Redis 7.2 (pinned, persistent, healthchecked)
├── docs/
│   ├── info.md                 # Canonical specification (source of truth)
│   ├── implementation-plan.md  # Implementation roadmap and status
│   ├── architecture.md         # Living architecture record
│   ├── api-contracts.md        # API contracts & schemas
│   ├── security.md             # Threat model & security mitigations
│   └── runbook.md              # Operations and setup runbook
├── .env.example                # Safe environment variable configuration template
└── turbo.json                  # Turborepo task pipeline
```

---

## 3. Quick Start

### 1. Prerequisites
- [Bun](https://bun.sh/) `v1.4.4`
- [Docker & Docker Compose](https://docs.docker.com/compose/)

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Local Database & Redis
```bash
docker compose up -d mongodb redis
```

### 4. Install Dependencies & Run Tests
```bash
bun install
bun run test
```

### 5. Launch Development Servers
```bash
bun run dev
```
- Web Application & BFF: `http://localhost:3000`
- Node.js Central API: `http://localhost:4000`

---

## 4. Testing & Verification

Run the test suite across all monorepo packages:
```bash
bun run test
```

Test coverage includes:
- `httpKey.test.ts`: Missing key rejected (401), invalid key rejected (403), correct key passes service gate, unauthorized user denied even with valid key.
- `scannerAndIntake.test.ts`: Magic bytes detection (PDF, JPEG, PNG), truncated PDF detection, dangerous embedded JavaScript/Launch detection, synthetic EICAR malware detection & quarantine.
- `tenancyAndIntakeE2E.test.ts`: Multi-institute student intake, clean PDF promotion, infected file quarantine, officer authorized view URL generation, cross-tenant denial (Institute A officer denied access to Institute B document), tenant-scoped listing, and document view audit logging.
