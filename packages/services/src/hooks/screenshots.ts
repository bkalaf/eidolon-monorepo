import { EventEmitter } from "node:events";
import { createHmac, randomUUID } from "node:crypto";

export type ScreenshotPolicy =
  | "STORYTELLER_TRUE"
  | "MISINFO_DRUNK_POISON"
  | "MISINFO_VORTOX";

export type ScreenshotStatus = "queued" | "rendering" | "done" | "failed";

export interface ScreenshotJob {
  id: string;
  gameId: string;
  phaseId: string;
  recipientPlayerId: string;
  policy: ScreenshotPolicy;
  seed?: number;
  revisionHash?: string;
  status: ScreenshotStatus;
  createdAt: number;
  expiresAt: number;
  pngBuffer?: Buffer;
}

const DEFAULT_EXPIRY_MS = Number(process.env.SCREENSHOT_JOB_EXPIRY_MS ?? 5 * 60_000);
const TOKEN_SECRET = process.env.SCREENSHOT_TOKEN_SECRET ?? "dev-screenshot-secret";

const jobs = new Map<string, ScreenshotJob>();
const jobEvents = new EventEmitter();
let cleanupHandle: NodeJS.Timeout | null = null;
let initialized = false;

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signPayload(payload: string) {
  return base64url(createHmac("sha256", TOKEN_SECRET).update(payload).digest());
}

function hashPayload(payload: string) {
  return createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
}

function createExpiry() {
  return Date.now() + DEFAULT_EXPIRY_MS;
}

function pruneExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.expiresAt <= now && job.status !== "done") {
      job.status = "failed";
      jobEvents.emit("expired", job);
      jobs.delete(id);
    }
  }
}

export function initializeScreenshotServer() {
  if (initialized) {
    return;
  }

  initialized = true;
  jobEvents.on("created", (job: ScreenshotJob) => {
    console.log("[screenshot] job queued", job.id, job.policy, job.recipientPlayerId);
  });

  cleanupHandle = setInterval(pruneExpiredJobs, 15_000);
  cleanupHandle.unref?.();
}

export interface ScreenshotJobPayload {
  id?: string;
  status?: ScreenshotStatus;
  expiresAt?: number;
  expiresInMs?: number;
  gameId: string;
  phaseId: string;
  recipientPlayerId: string;
  policy: ScreenshotPolicy;
  seed?: number;
  revisionHash?: string;
  pngBuffer?: Buffer;
}

export function createScreenshotJob(payload: ScreenshotJobPayload) {
  const job: ScreenshotJob = {
    id: payload.id ?? randomUUID(),
    status: payload.status ?? "queued",
    createdAt: Date.now(),
    expiresAt:
      payload.expiresAt ??
      (typeof payload.expiresInMs === "number" ? Date.now() + payload.expiresInMs : createExpiry()),
    gameId: payload.gameId,
    phaseId: payload.phaseId,
    recipientPlayerId: payload.recipientPlayerId,
    policy: payload.policy,
    seed: payload.seed,
    revisionHash: payload.revisionHash,
    pngBuffer: payload.pngBuffer,
  };

  jobs.set(job.id, job);
  jobEvents.emit("created", job);
  return job;
}

export function getScreenshotJob(id: string) {
  return jobs.get(id);
}

export function updateScreenshotJob(id: string, updates: Partial<ScreenshotJob>) {
  const job = jobs.get(id);
  if (!job) {
    return null;
  }

  Object.assign(job, updates, {
    expiresAt: updates.expiresAt ?? job.expiresAt,
  });

  jobEvents.emit("updated", job);
  return job;
}

export function listScreenshotJobs() {
  return Array.from(jobs.values());
}

export function generateRenderToken(jobId: string, expiresInMs = 5 * 60_000) {
  const payload = JSON.stringify({ jobId, expiresAt: Date.now() + expiresInMs });
  return `${signPayload(payload)}.${base64url(Buffer.from(payload))}`;
}

export function verifyRenderToken(token: string) {
  const [signature, payloadEncoding] = token.split(".");
  if (!signature || !payloadEncoding) {
    throw new Error("invalid render token format");
  }

  const payload = Buffer.from(payloadEncoding, "base64").toString("utf-8");
  if (signPayload(payload) !== signature) {
    throw new Error("render token signature mismatch");
  }

  const parsed = JSON.parse(payload);
  if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) {
    throw new Error("render token expired");
  }

  return parsed;
}

export function registerScreenshotListener(event: string, listener: (...args: unknown[]) => void) {
  jobEvents.on(event, listener);
}

export function shutdownScreenshotServer() {
  cleanupHandle?.clear();
  cleanupHandle = null;
  jobs.clear();
  initialized = false;
}

export const screenshotEvents = jobEvents;
export const screenshotJobHash = hashPayload;
