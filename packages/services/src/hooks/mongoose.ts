import mongoose from "mongoose";

const DEFAULT_MONGO_URI =
  process.env.MONGO_URI ?? process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/eidolon";

let connectPromise: Promise<typeof mongoose> | null = null;

function log(...args: Parameters<typeof console.log>) {
  console.log("[mongoose]", ...args);
}

export function getMongoUri(): string {
  return process.env.MONGO_URI ?? process.env.MONGODB_URI ?? DEFAULT_MONGO_URI;
}

export async function connectMongo(uri = getMongoUri()): Promise<typeof mongoose> {
  if (connectPromise) {
    log("already connecting/connected to", uri);
    return connectPromise;
  }

  mongoose.set("strictQuery", true);
  log("connecting to", uri);

  connectPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 5_000,
      maxPoolSize: 5,
    })
    .then((client) => {
      log("connected");
      return client;
    })
    .catch((error) => {
      connectPromise = null;
      log("connection failed", error);
      throw error;
    });

  return connectPromise;
}

export async function disconnectMongo(): Promise<void> {
  if (!connectPromise) {
    return;
  }

  const connection = mongoose.connection;
  if (connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  connectPromise = null;
  log("disconnected");
}

export function getMongoConnection() {
  return mongoose.connection;
}
