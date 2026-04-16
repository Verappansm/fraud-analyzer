import mongoose from "mongoose";

declare global {
  var __mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectMongo(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI");
  }

  if (!global.__mongooseConn) {
    global.__mongooseConn = mongoose.connect(uri, {
      dbName: "fraud-analyzer",
      autoIndex: true,
    });
  }

  return global.__mongooseConn;
}
