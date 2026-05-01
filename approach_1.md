# Approach 1 — Multi-Source External API Architecture

> **Status**: Superseded by Approach 2 (Multi-Agent LLM Architecture).
> This document records the original design for audit and migration reference.

---

## Project Vision

**AmEx Risk Forensics** is an AI-powered financial fraud and risk detection system built for American Express UK small-business underwriting. The system automates multi-signal intelligence gathering for high-exposure accounts (£100,000+), producing structured risk scores, narrative explanations, and audit-ready signal classifications across a 40-code taxonomy (L00–F04).

**Target users**: AmEx UK underwriting analysts assessing new or existing small-business accounts.

**Core output**: A risk score (0–100), a confidence level, a recommendation (`low risk` / `monitor` / `high risk`), a 3-sentence risk narrative, and a structured signal vector.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         User (AmEx Analyst)                                │
│                    Input: Company Name / CRN                               │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │ POST /api/analyze (stream: true)
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     Next.js 16 API Route (Node.js)                         │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                   PIPELINE (runPipeline)                              │ │
│  │                                                                       │ │
│  │  Step 1: SEC EDGAR → Resolve ticker / CIK                            │ │
│  │                                                                       │ │
│  │  Step 2: Parallel fetch (3 sources)                                  │ │
│  │    ├─ Google News RSS  → RawArticle[]                                 │ │
│  │    ├─ Alpha Vantage    → FinancialSnapshot                            │ │
│  │    └─ Companies House  → Company search result                       │ │
│  │                                                                       │ │
│  │  Step 3: If UK company found                                          │ │
│  │    ├─ Companies House profile (status, accounts, charges)            │ │
│  │    └─ Officers list → Director Network Analysis                      │ │
│  │                                                                       │ │
│  │  Step 4: Processing                                                   │ │
│  │    ├─ Normalise + deduplicate articles                                │ │
│  │    ├─ Aggregate sentiment across corpus                              │ │
│  │    └─ Map signals to taxonomy (heuristic keyword matching)           │ │
│  │                                                                       │ │
│  │  Step 5: OpenAI gpt-4o → Single monolithic prompt                    │ │
│  │    → riskScore, confidence, recommendation, whyScore, bullets        │ │
│  │                                                                       │ │
│  │  Step 6: Persist → MongoDB                                           │ │
│  │  Step 7: Cache (1h TTL)                                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
                                   │ NDJSON stream
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend (React 19)                         │
│                                                                            │
│  SearchBar → RiskScoreCard → AnalysisCard → NewsCard → SentimentChart     │
│           → SignalDashboard → WhyScoreSection → HistoryPanel              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer            | Technology                           | Version    |
|-----------------|---------------------------------------|-----------|
| Framework        | Next.js (App Router + Turbopack)      | 16.2.4     |
| UI               | React                                 | 19.2.4     |
| Language         | TypeScript                            | ^5         |
| Database         | MongoDB via Mongoose                  | ^9.4.1     |
| AI / LLM         | OpenAI gpt-4o                        | SDK ^6.34  |
| Charts           | Recharts                              | ^3.8.1     |
| XML parsing      | fast-xml-parser (RSS feed)           | ^5.6.0     |
| CSS              | Tailwind CSS v4 (glassmorphism theme)| ^4         |

---

## External Data Sources

### 1. Google News RSS (`lib/sources/googleNewsRSS.ts`)

| Property | Value |
|----------|-------|
| Endpoint | `https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en` |
| Auth | None (unofficial public RSS) |
| Query | `{company} when:30d` (last 30 days) |
| Limit | Up to 20 articles after deduplication |
| Fallback | HTML scraping of `news.google.com/search` |
| Format | XML (parsed via fast-xml-parser) |

**Output schema:**
```typescript
interface RawArticle {
  title: string;
  source: string;
  url: string;
  date: string;   // RFC 2822 pubDate string
  summary: string;
}
```

**Risks**: Unofficial feed, no SLA, subject to breakage. Fallback HTML scraper is fragile.

---

### 2. Alpha Vantage (`lib/sources/alphaVantage.ts`)

| Property | Value |
|----------|-------|
| Endpoint | `https://www.alphavantage.co/query?function=OVERVIEW&symbol={ticker}` |
| Auth | API key (env: `ALPHA_VANTAGE_API_KEY`) |
| Scope | US-listed companies only (requires ticker symbol) |
| Dependency | Ticker must first be resolved via SEC EDGAR |
| Free tier | 25 requests/day |

**Output schema:**
```typescript
interface FinancialSnapshot {
  ticker: string;
  marketCap: number | null;
  pe: number | null;           // Price-to-Earnings ratio
  eps: number | null;          // Earnings per share
  beta: number | null;         // Market beta
  revenueTTM: number | null;   // Trailing twelve months revenue
  profitMargin: number | null;
  operatingMarginTTM: number | null;
  returnOnAssetsTTM: number | null;
  returnOnEquityTTM: number | null;
  analystTargetPrice: number | null;
  week52High: number | null;
  week52Low: number | null;
}
```

**Risks**: Only covers US-listed equities. UK SMEs (the target market) are almost never listed, making this source irrelevant to the core use case.

---

### 3. SEC EDGAR (`lib/sources/secEdgar.ts`)

| Property | Value |
|----------|-------|
| Tickers endpoint | `https://www.sec.gov/files/company_tickers.json` |
| Filings endpoint | `https://data.sec.gov/submissions/CIK{cik}.json` |
| Auth | User-Agent header (env: `SEC_USER_AGENT`) |
| Cache | Ticker list cached 24h in memory |
| Coverage | US-listed public companies only |

**Ticker resolution logic:**
1. Load full company tickers list (~14,000 entries)
2. Exact match on company name
3. Partial match (company name contains query)
4. Word match (query contains company name)

**Risks**: No relevance to UK SMEs. Used only to populate ticker for Alpha Vantage. For UK-only analysis, both SEC and Alpha Vantage return null.

---

### 4. Companies House UK (`lib/sources/companiesHouse.ts`)

| Property | Value |
|----------|-------|
| Base URL | `https://api.company-information.service.gov.uk` |
| Auth | Basic auth with API key (env: `COMPANIES_HOUSE_API_KEY`) |
| Coverage | All UK registered companies |

**Endpoints used:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/search/companies?q={name}` | Find company by name/CRN |
| GET | `/company/{crn}` | Full company profile |
| GET | `/company/{crn}/officers` | Directors and officers list |
| GET | `/company/{crn}/insolvency` | Insolvency history |
| GET | `/company/{crn}/charges` | Registered charges |
| GET | `/officers/{id}/appointments` | Director appointment history |

**Company profile schema (key fields):**
```typescript
{
  company_status: "active" | "dissolved" | "liquidation" | "administration" | "receivership";
  company_number: string;
  date_of_creation: string;
  accounts: {
    overdue: boolean;
    next_due: string;
    last_accounts: { made_up_to: string; type: string };
  };
  confirmation_statement: {
    overdue: boolean;
    next_due: string;
  };
  has_insolvency_history: boolean;
  has_charges: boolean;
  registered_office_address: { ... };
}
```

**Director Network Analysis**: For each of the first 3 directors, fetches their full appointment history and counts companies in `dissolved`, `liquidation`, or `receivership` status. Triggers G00 (2-3 failures) or G01 (4+ serial failures).

**Risk**: Rate limiting at 600 requests/5 minutes. Director network analysis triggers up to 3 additional API calls per director.

---

## Database Schemas

### Company Model (`models/Company.ts`)

```
Company {
  _id:          ObjectId              (auto)
  name:         String     required   indexed, unique
  ticker:       String     nullable   US ticker symbol (may be null for UK cos)
  lastQueried:  Date                  timestamp of most recent query
  queryCount:   Number     default 0  total analysis count
  createdAt:    Date                  (auto via timestamps)
  updatedAt:    Date                  (auto via timestamps)
}
```

### Article Model (`models/Article.ts`)

```
Article {
  _id:             ObjectId              (auto)
  companyId:       ObjectId   required   ref: Company, indexed
  title:           String     required
  source:          String     required   e.g. "The Guardian", "Google News"
  url:             String     required
  date:            Date       required
  sentiment:       String     required   enum: positive | neutral | negative
  sentimentScore:  Number     required   range: [-12, 8] (keyword scoring)
  relevanceScore:  Number     required   range: [0, 24] (risk keyword density)
  createdAt:       Date                  (auto)
  updatedAt:       Date                  (auto)
}

Compound index: (companyId, title, date) — deduplication guard
```

### Analysis Model (`models/Analysis.ts`)

```
Analysis {
  _id:             ObjectId              (auto)
  companyId:       ObjectId   required   ref: Company, indexed
  riskScore:       Number     required   0–100
  confidence:      String     required   enum: low | medium | high
  recommendation:  String     required   enum: low risk | monitor | high risk
  analysis:        String[]              max 6 bullet points
  whyScore:        String     required   3-sentence risk narrative
  fraudSignals:    String[]              max 8
  legalRisks:      String[]              max 8
  sentimentTrend:  String     required   enum: positive | neutral | negative
  sources:         [{title, url, date}]  cited sources (max 8)
  signals:         Mixed                 DetectedSignal[] — signal objects
  vectorRow:       Mixed                 Record<SignalCode, 0|1> — 40-bit vector
  rawLlmOutput:    String                raw JSON from GPT-4o (audit trail)
  llmPrompt:       String                full prompt sent to GPT-4o (audit trail)
  agentTrace:      Mixed                 null in V1 (populated in V2)
  createdAt:       Date                  (auto)
  updatedAt:       Date                  (auto)
}

Compound index: (companyId, createdAt DESC)
```

---

## TypeScript Type Definitions (`types/index.ts`)

```typescript
type SentimentTag = "positive" | "neutral" | "negative";

interface RawArticle {
  title?: string; source?: string; date?: string; summary?: string; url?: string;
}

interface NormalizedArticle {
  title: string; source: string; date: string; summary: string; url: string;
  sentiment: SentimentTag; sentimentScore: number; relevanceScore: number;
}

interface FinancialSnapshot {
  ticker: string; marketCap: number | null; pe: number | null;
  eps: number | null; beta: number | null; revenueTTM: number | null;
  profitMargin: number | null; operatingMarginTTM: number | null;
  returnOnAssetsTTM: number | null; returnOnEquityTTM: number | null;
  analystTargetPrice: number | null; week52High: number | null; week52Low: number | null;
}

interface DetectedSignal {
  code: SignalCode; severity: Severity; source: string;
  detail: string; date: string; confidence: "low" | "medium" | "high";
}

interface AnalyzeResponse {
  riskScore: number; confidence: string; recommendation: string;
  analysis: string[]; whyScore: string; fraudSignals: string[]; legalRisks: string[];
  sentimentTrend: string; sources: Array<{title, url, date}>;
  news: NormalizedArticle[]; financials: FinancialSnapshot | null;
  filings: FilingItem[]; signals: DetectedSignal[];
  vectorRow: Record<SignalCode, number>; cached: boolean; analyzedAt: string;
}
```

---

## Signal Taxonomy (L00–F04)

40 predefined risk signal codes across 5 categories. Each analysis produces a 40-bit `vectorRow` (0 = not detected, 1 = detected) for structured reporting and ML feature extraction.

### LEGAL (L00–L10)
| Code | Label | Severity |
|------|-------|----------|
| L00 | Winding-up petition filed | CRITICAL |
| L01 | Company in liquidation | CRITICAL |
| L02 | Company in administration | CRITICAL |
| L03 | Company dissolved | CRITICAL |
| L04 | Outstanding charges registered | HIGH |
| L05 | Insolvency history on record | HIGH |
| L06 | Previously been liquidated | CRITICAL |
| L07 | County court judgment (CCJ) detected | HIGH |
| L08 | High Court judgment detected | HIGH |
| L09 | Statutory demand filed | CRITICAL |
| L10 | Legal filing keyword detected | MEDIUM |

### REGULATORY (R00–R09)
| Code | Label | Severity |
|------|-------|----------|
| R00 | FCA enforcement action | HIGH |
| R01 | FCA warning list match | CRITICAL |
| R02 | ICO data protection enforcement | HIGH |
| R03 | CMA competition investigation | HIGH |
| R04 | HSE health and safety prosecution | HIGH |
| R05 | HMRC deliberate defaulter list | HIGH |
| R06 | HMRC tax avoidance scheme | MEDIUM |
| R07 | Environment Agency violation | MEDIUM |
| R08 | Pensions Regulator action | MEDIUM |
| R09 | Regulatory licence revoked or suspended | MEDIUM |

### REPUTATIONAL (P00–P07)
| Code | Label | Severity |
|------|-------|----------|
| P00 | Fraud allegation in news | HIGH |
| P01 | HMRC investigation mentioned in news | HIGH |
| P02 | Misconduct or scandal in news | MEDIUM |
| P03 | Senior director departure reported | MEDIUM |
| P04 | Data breach reported | MEDIUM |
| P05 | Customer complaint pattern | MEDIUM |
| P06 | Negative news mention (general) | MEDIUM |
| P07 | Social media reputational event | LOW |

### GOVERNANCE (G00–G06)
| Code | Label | Severity |
|------|-------|----------|
| G00 | Director linked to 2–3 failed companies | HIGH |
| G01 | Director linked to 4+ failed companies (serial) | CRITICAL |
| G02 | Multiple director resignations (2+ in 12 months) | MEDIUM |
| G03 | Accounts filing overdue | MEDIUM |
| G04 | Confirmation statement overdue | MEDIUM |
| G05 | Registered office address in dispute | LOW |
| G06 | Significant ownership change detected | MEDIUM |

### FINANCIAL (F00–F04)
| Code | Label | Severity |
|------|-------|----------|
| F00 | Accounts show deteriorating turnover | MEDIUM |
| F01 | Accounts show net liabilities | MEDIUM |
| F02 | Going concern note in accounts | MEDIUM |
| F03 | Auditor qualification in accounts | MEDIUM |
| F04 | Dormant status despite active trading indicators | MEDIUM |

---

## Processing Pipeline (V1)

```
Input: company name string
          │
          ▼
┌─────────────────────────┐
│  1. resolveTickerFromSec │  SEC EDGAR API
│     → ticker, cik        │  (loads 14k company list)
└─────────────┬───────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Parallel fetch (Promise.all)                             │
│     ├─ fetchGoogleNews(company)    → RawArticle[] (≤20)     │
│     ├─ fetchAlphaVantageOverview   → FinancialSnapshot|null │
│     └─ searchCompany(company)      → CH search result|null  │
└──────────────────┬──────────────────────────────────────────┘
                   │
          if ukCompany found
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3. UK Company deep-dive                     │
│     ├─ fetchCompanyProfile(crn)              │
│     ├─ fetchOfficers(crn)                    │
│     └─ performDirectorNetworkAnalysis()      │
│         → failedCompaniesCount, serialFails  │
└─────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  4. Processing                               │
│     ├─ normalizeArticles()    (SHA1 dedupe)  │
│     ├─ aggregateSentiment()   (keyword)      │
│     └─ mapToSignals()         (heuristic)    │
│         → DetectedSignal[], vectorRow        │
└─────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  5. OpenAI gpt-4o (single call)              │
│     Input: company, articles[12], financials │
│            signals[]                         │
│     Output: riskScore, confidence,           │
│             recommendation, analysis[6],     │
│             whyScore, fraudSignals,          │
│             legalRisks, sentimentTrend       │
└─────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│  6. Persist to MongoDB   │
│     Company (upsert)     │
│     Articles (insertMany)│
│     Analysis (create)    │
└─────────────────────────┘
          │
          ▼
┌──────────────────┐
│  7. Cache (1h)   │
└──────────────────┘
          │
          ▼
    NDJSON stream → client
```

---

## API Endpoints

### `POST /api/analyze`
Runs the full analysis pipeline for a company.

**Request body:**
```json
{ "company": "Acme Ltd", "stream": true }
```

**Streaming response** (`stream: true`): NDJSON, one JSON object per line:
```json
{"type":"status","message":"Checking ticker and SEC identity..."}
{"type":"status","message":"Fetching news, financials, and UK signals in parallel..."}
{"type":"result","payload": { ...AnalyzeResponse } }
```

**Standard response** (`stream: false`): Single `AnalyzeResponse` JSON object.

**Caching**: 1-hour in-memory TTL per company name (case-insensitive).

---

### `GET /api/analyze`
Returns last 12 analyses from MongoDB (sorted desc by `createdAt`).

**Response:**
```json
{ "history": [{ "id": "...", "company": "...", "riskScore": 72, "confidence": "high", "recommendation": "high risk", "createdAt": "..." }] }
```

---

### `GET /api/export/csv`
Exports all latest analyses as CSV for audit reporting.

**Columns:** `company_name`, `crn`, `scan_date`, `status`, `signal_count`, `highest_severity`, `signal_codes`, `narrative`, `recommendation`, `confidence`

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `SearchBar` | Company name input + submit |
| `RiskScoreCard` | Circular gauge: 0–100 score, colour-coded |
| `AnalysisCard` | Confidence, recommendation, analysis bullets, fraud signals |
| `NewsCard` | Scrollable article list with sentiment tags |
| `SentimentChart` | Recharts bar chart: positive / neutral / negative distribution |
| `LoadingSpinner` | Animated spinner + streaming status messages |
| `SignalDashboard` | 5-category grid: active signals with severity badges |
| `WhyScoreSection` | 3-sentence risk narrative split into paragraphs |
| `HistoryPanel` | Sidebar: last 12 analyses, CSV export button |

---

## Caching Strategy

| Layer | TTL | Key | Scope |
|-------|-----|-----|-------|
| In-memory (route) | 1 hour | `company.toLowerCase()` | Single process |
| SEC ticker list | 24 hours | Module-level variable | Single process |
| Alpha Vantage `revalidate` | 0 (no cache) | Per request | Per request |
| MongoDB | Permanent | companyId + createdAt | Persistent audit log |

---

## Limitations & Reasons for Migration to Approach 2

1. **External API dependency risk** — 4 external services (Google News, Alpha Vantage, SEC EDGAR, Companies House) each introduce failure modes, rate limits, and change risk. Security policy prohibits external API calls.

2. **UK SME gap** — Alpha Vantage and SEC EDGAR are irrelevant for UK private SMEs (the core target). Both return null for >95% of queries.

3. **Fragile news scraping** — Google News RSS is an unofficial feed with no SLA. The HTML fallback scraper is brittle and could break without warning.

4. **Monolithic LLM call** — A single GPT-4o prompt handles all analysis dimensions. This limits depth: financial reasoning, governance analysis, regulatory assessment, and sentiment evaluation all compete for the same token budget.

5. **Keyword-only signal detection** — `mapToSignals()` uses simple string matching. Legal signals like L07 (CCJ) trigger on the word "judgment" appearing anywhere in a headline, regardless of context.

6. **No analyst input channel** — Underwriters who already have context (internal notes, prior decisions, known concerns) have no way to inject that intelligence into the analysis.

7. **No reasoning transparency** — The final risk score comes from one LLM call with no intermediate reasoning chain. There is no way to audit *why* a particular signal was detected.

8. **Director network analysis at scale** — The Companies House director check makes up to 3 × N API calls per analysis (where N = appointments per director). This is slow and hits rate limits.
