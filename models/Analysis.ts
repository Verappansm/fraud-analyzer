import { Schema, model, models } from "mongoose";

const AnalysisSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    riskScore: { type: Number, required: true },
    confidence: { type: String, enum: ["low", "medium", "high"], required: true },
    recommendation: {
      type: String,
      enum: ["low risk", "monitor", "high risk"],
      required: true,
    },
    analysis: { type: [String], default: [] },
    whyScore: { type: String, required: true },
    fraudSignals: { type: [String], default: [] },
    legalRisks: { type: [String], default: [] },
    sentimentTrend: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      required: true,
    },
    sources: {
      type: [{ title: String, url: String, date: String }],
      default: [],
    },
    signals: { type: Schema.Types.Mixed, default: [] },
    vectorRow: { type: Schema.Types.Mixed, default: {} },
    agentTrace: { type: Schema.Types.Mixed, default: null },
    rawLlmOutput: { type: String, default: "" },
    llmPrompt: { type: String, default: "" },
  },
  { timestamps: true },
);

AnalysisSchema.index({ companyId: 1, createdAt: -1 });

const Analysis = models.Analysis || model("Analysis", AnalysisSchema);

export default Analysis;
