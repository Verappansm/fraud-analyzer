# Data Sources Inventory - Risk Forensics

The Fraud Analyzer ingests and correlates signals from the following official and secondary data sources:

## 1. Primary Corporate Data
*   **UK Companies House API**: 
    *   *Data Points*: Company status (active, liquidation, dissolved), registered office, incorporation date.
    *   *Governance*: Full officer/director lists and track records.
    *   *Legal*: Charges, secured debt, and insolvency history.
*   **SEC EDGAR**: 
    *   *Data Points*: Financial filings (10-K, 10-Q, 8-K) for companies with US-listed entities.

## 2. Intelligence & Risk Signals
*   **UK Gazette (Signal Mapping)**: 
    *   *Scans*: Winding-up petitions and statutory demands detected via metadata and news corroboration.
*   **FCA & Regulatory Registers**:
    *   *Scans*: Enforcement actions and warning lists mentioned in corporate records or news.
*   **Registry Trust (CCJ Mapping)**:
    *   *Scans*: County Court Judgments (>£50k threshold) detected via public news and filing mentions.

## 3. Reputational & Financial Signals
*   **Google News RSS**: 
    *   *Scans*: 12-month trailing news for keywords: "fraud", "investigation", "HMRC", "lawsuit", "scandal".
*   **Alpha Vantage**: 
    *   *Data Points*: Market capitalization, revenue (TTM), and net margins for quantitative vetting.

## 4. Derived Intelligence
*   **Director Network Analysis**: 
    *   A recursive lookup engine that checks director associations across the Companies House database to identify "Serial Failures" (G01/G02 signals).
*   **L00-F04 Signal Taxonomy**: 
    *   An internal classification system that maps unstructured data into 40+ standardized binary risk features.
