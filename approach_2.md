# Approach 2 — Multi-Agent LLM Architecture

> **Current active version.** Replaces Approach 1 (see `approach_1.md`).

---

## What Changed from Approach 1

| Aspect | Approach 1 | Approach 2 |
|--------|-----------|-----------|
| External APIs | 4 (Google News, Alpha Vantage, SEC, Companies House) | 0 |
| LLM calls per analysis | 1 (monolithic) | 7 (specialist agents) |
| Input | Company name only | Name + analyst context + financials |
| Signal detection | Keyword heuristics | Per-domain LLM reasoning |
| Explainability | None | Full agent trace persisted |
| Security posture | Outbound to 4 services | OpenAI + MongoDB only |

---

## Agent Pipeline

```
User Input (name + optional context + optional financials)
       │
       ▼
┌─────────────────────┐
│  1. Identity Agent   │  Classifies industry, jurisdiction, business type
└──────────┬──────────┘
           │
           ▼  (parallel)
┌──────────────────────────────────────────────────────────┐
│  2a. Financial Agent   → F00–F04 signal proposals         │
│  2b. Governance Agent  → G00–G06 signal proposals         │
│  2c. Regulatory Agent  → R00–R09 signal proposals         │
│  2d. Reputational Agent → P00–P07 + intelligence items    │
└──────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  3. Signal Agent     │  L00–L10 legal signals + merge all proposals
│                      │  → DetectedSignal[] + vectorRow
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Synthesis Agent  │  Final riskScore, whyScore, recommendation
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  5. Persist + Cache  │  MongoDB + 1h TTL
└─────────────────────┘
```

**Latency profile**: ~4 sequential LLM round-trips (identity → parallel 4 → signal → synthesis). Parallel agents in step 2 run as `Promise.all`.

---

## New Input Schema

```typescript
POST /api/analyze
{
  "company": string,          // required
  "stream": boolean,          // optional, default false
  "context": string,          // optional: analyst notes, news clippings
  "financials": {             // optional: all fields optional
    "turnover": number,       // Annual turnover in GBP
    "netProfit": number,      // Net profit in GBP
    "employees": number,
    "incorporationYear": number,
    "industry": string,
    "country": string,
    "description": string
  }
}
```

---

## Agent Files

| File | Agent | Output type |
|------|-------|-------------|
| `lib/agents/identityAgent.ts` | Identity | `IdentityProfile` |
| `lib/agents/financialAgent.ts` | Financial | `FinancialRiskAssessment` |
| `lib/agents/governanceAgent.ts` | Governance | `GovernanceRiskAssessment` |
| `lib/agents/regulatoryAgent.ts` | Regulatory | `RegulatoryRiskAssessment` |
| `lib/agents/reputationalAgent.ts` | Reputational | `ReputationalRiskAssessment` |
| `lib/agents/signalAgent.ts` | Signal Mapping | `SignalMappingResult` |
| `lib/agents/synthesisAgent.ts` | Synthesis | `SynthesisOutput` |
| `lib/agents/types.ts` | — | All agent I/O interfaces |
| `lib/agents/openaiClient.ts` | — | Shared `OpenAI` factory |

---

## Agent Trace

Every analysis now persists an `agentTrace` object in MongoDB (field on `Analysis` document). This provides full explainability:

```typescript
agentTrace: {
  identity:     { industry, sector, jurisdiction, businessType, confidence, notes }
  financial:    { overallFinancialHealth, keyRisks, mitigatingFactors, notes }
  governance:   { filingCompliance, directorConcerns, structureConcerns, notes }
  regulatory:   { regulatoryExposureLevel, primaryRegulators, complianceFlags, notes }
  reputational: { publicSentiment, newsFlags, knownControversies, notes }
}
```

---

## Intelligence Items (replaces news feed)

The `reputational` agent produces `newsFlags` (current risk indicators) and `knownControversies` (historical events). These are converted to `NormalizedArticle[]` objects and displayed in the existing `NewsCard` and `SentimentChart` components unchanged.

---

## Environment Variables Required

```env
OPENAI_API_KEY=...    # Required
MONGODB_URI=...       # Required
```

All other keys (`ALPHA_VANTAGE_API_KEY`, `COMPANIES_HOUSE_API_KEY`, `SEC_USER_AGENT`) have been removed.

---

## Files Removed

- `lib/sources/googleNewsRSS.ts`
- `lib/sources/alphaVantage.ts`
- `lib/sources/companiesHouse.ts`
- `lib/sources/secEdgar.ts`
- `lib/openai.ts`

## Packages Removed from `package.json`

- `@google/generative-ai` (was installed, never used)
- `fast-xml-parser` (was only used for RSS XML parsing)

Run `npm install` after pulling to clean the lockfile.
