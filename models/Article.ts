import { Schema, model, models } from "mongoose";

const ArticleSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    title: { type: String, required: true },
    source: { type: String, required: true },
    url: { type: String, required: true },
    date: { type: Date, required: true },
    sentiment: { type: String, enum: ["positive", "neutral", "negative"], required: true },
    sentimentScore: { type: Number, required: true },
    relevanceScore: { type: Number, required: true },
  },
  { timestamps: true },
);

ArticleSchema.index({ companyId: 1, title: 1, date: -1 });

const Article = models.Article || model("Article", ArticleSchema);

export default Article;
