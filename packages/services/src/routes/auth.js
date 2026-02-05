import express from "express";
import { registerHandler } from "../auth/register.js";
import { loginHandler } from "../auth/login.js";
import { refreshHandler } from "../auth/refresh.js";
import { logoutHandler, logoutAllHandler } from "../auth/logout.js";
import { verifyEmailHandler } from "../auth/emailVerification.js";
import {
  passwordResetConfirmHandler,
  passwordResetRequestHandler,
} from "../auth/passwordReset.js";
import { issueCsrfToken, requireCsrf } from "../middleware/csrf.js";
import { originCheck } from "../middleware/originCheck.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const loginRateLimiter = rateLimit({
  keyGenerator: (req) => `login:${req.ip ?? "unknown"}`,
  limit: 8,
  windowMs: 60 * 1000,
});

const passwordResetIpRateLimiter = rateLimit({
  keyGenerator: (req) => `password-reset-ip:${req.ip ?? "unknown"}`,
  limit: 5,
  windowMs: 15 * 60 * 1000,
});

const passwordResetEmailRateLimiter = rateLimit({
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    return `password-reset-email:${email || "unknown"}`;
  },
  limit: 3,
  windowMs: 60 * 60 * 1000,
});

router.use(originCheck);

router.get("/auth/csrf", issueCsrfToken);
router.get("/auth/verify-email", verifyEmailHandler);

router.post("/auth/register", requireCsrf, registerHandler);
router.post("/auth/login", requireCsrf, loginRateLimiter, loginHandler);
router.post("/auth/refresh", requireCsrf, refreshHandler);
router.post("/auth/logout", requireAuth, requireCsrf, logoutHandler);
router.post(
  "/auth/logout-all",
  requireAuth,
  requireCsrf,
  logoutAllHandler
);
router.post(
  "/auth/password-reset/request",
  requireCsrf,
  passwordResetIpRateLimiter,
  passwordResetEmailRateLimiter,
  passwordResetRequestHandler
);
router.post(
  "/auth/password-reset/confirm",
  requireCsrf,
  passwordResetConfirmHandler
);

export { router as authRouter };
