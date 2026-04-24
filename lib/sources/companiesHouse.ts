const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const BASE_URL = "https://api.company-information.service.gov.uk";

function getAuthHeader() {
  if (!API_KEY) return {};
  const encoded = Buffer.from(`${API_KEY}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

export async function searchCompany(query: string) {
  const resp = await fetch(`${BASE_URL}/search/companies?q=${encodeURIComponent(query)}&items_per_page=1`, {
    headers: getAuthHeader(),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.items?.[0] || null;
}

export async function fetchCompanyProfile(companyNumber: string) {
  const resp = await fetch(`${BASE_URL}/company/${companyNumber}`, {
    headers: getAuthHeader(),
  });
  if (!resp.ok) return null;
  return await resp.json();
}

export async function fetchOfficers(companyNumber: string) {
  const resp = await fetch(`${BASE_URL}/company/${companyNumber}/officers`, {
    headers: getAuthHeader(),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.items || [];
}

export async function fetchInsolvency(companyNumber: string) {
  const resp = await fetch(`${BASE_URL}/company/${companyNumber}/insolvency`, {
    headers: getAuthHeader(),
  });
  if (!resp.ok) return null;
  return await resp.json();
}

export async function fetchCharges(companyNumber: string) {
  const resp = await fetch(`${BASE_URL}/company/${companyNumber}/charges`, {
    headers: getAuthHeader(),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.items || [];
}

/**
 * Perform a deep track record check for directors.
 * This is "Director Network Analysis".
 * For each director, we look up their appointments and check the status of those companies.
 */
export async function performDirectorNetworkAnalysis(officers: any[]) {
  const results = {
    failedCompaniesCount: 0,
    serialFailures: false,
    directorsAnalyzed: 0,
  };

  // Limit to first 3 directors to avoid API rate limits
  const directorsToCheck = officers.filter(o => o.officer_role === "director").slice(0, 3);
  
  for (const director of directorsToCheck) {
    results.directorsAnalyzed++;
    const officerId = director.links?.officer?.appointments?.split("/")[2];
    if (!officerId) continue;

    // Fetch director appointments
    const appointmentsResp = await fetch(`${BASE_URL}/officers/${officerId}/appointments`, {
      headers: getAuthHeader(),
    });

    if (appointmentsResp.ok) {
      const appointmentsData = await appointmentsResp.json();
      const appointments = appointmentsData.items || [];

      for (const app of appointments) {
        // Check if the business has failed
        // Statuses indicating failure: 'dissolved', 'liquidation', 'receivership'
        const status = app.appointed_to?.company_status;
        if (["dissolved", "liquidation", "receivership"].includes(status)) {
          results.failedCompaniesCount++;
        }
      }
    }
  }

  results.serialFailures = results.failedCompaniesCount >= 4;
  return results;
}
