import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import Analysis from "@/models/Analysis";
import Company from "@/models/Company";
import { SIGNAL_TAXONOMY } from "@/lib/taxonomy";

export async function GET() {
  try {
    await connectMongo();

    // Fetch the latest analysis for each company
    const analyses = await Analysis.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$companyId",
          latest: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: "$company" },
    ]);

    if (analyses.length === 0) {
      return NextResponse.json({ error: "No data to export" }, { status: 404 });
    }

    // Get all signal codes for the header
    const signalCodes = Object.keys(SIGNAL_TAXONOMY).sort();

    // Build CSV header
    const header = [
      "company_name",
      "crn",
      "scan_date",
      "status",
      "signal_count",
      "highest_severity",
      ...signalCodes,
      "risk_narrative",
      "recommended_action",
      "confidence_score",
    ].join(",");

    // Build rows
    const rows = analyses.map((item) => {
      const a = item.latest;
      const c = item.company;
      const signalVector = a.vectorRow || {};
      
      const signalCount = Object.values(signalVector).filter(v => v === 1).length;
      
      const row = [
        `"${c.name}"`,
        `"${c.ticker || ""}"`,
        `"${new Date(a.createdAt).toISOString()}"`,
        `"${a.recommendation || ""}"`,
        signalCount,
        `"${a.highestSeverity || "NONE"}"`,
        ...signalCodes.map(code => signalVector[code] || 0),
        `"${(a.whyScore || "").replace(/"/g, '""')}"`,
        `"${a.recommendation || ""}"`,
        `"${a.confidence === "high" ? 1.0 : a.confidence === "medium" ? 0.5 : 0.2}"`,
      ];

      return row.join(",");
    });

    const csvContent = [header, ...rows].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="amex_risk_intelligence_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("CSV Export Error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
