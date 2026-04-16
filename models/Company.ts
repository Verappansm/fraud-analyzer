import { Schema, model, models } from "mongoose";

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, index: true, unique: true },
    ticker: { type: String, default: null },
    lastQueried: { type: Date, default: Date.now },
    queryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Company = models.Company || model("Company", CompanySchema);

export default Company;
