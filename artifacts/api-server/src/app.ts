import express, { type Express, type Request, type Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { doubleCsrf } from "csrf-csrf";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust nginx proxy for rate-limit X-Forwarded-For
app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";

const requiredVars = ["DATABASE_URL", "SESSION_SECRET", "AUTH_SECRET", "CORS_ORIGINS"];
if (isProduction) {
  requiredVars.push("CLERK_SECRET_KEY");
}
for (const name of requiredVars) {
  if (!process.env[name]) {
    throw new Error(
      `${name} environment variable is required${isProduction ? " in production" : ""}.`,
    );
  }
}

const sessionSecret = process.env.SESSION_SECRET!;
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:4173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: [
          "'self'",
          ...(isProduction ? [] : ["ws://localhost:4173"]),
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(cookieParser());

const PgSessionStore = connectPgSimple(session);

app.use(
  session({
    store: new PgSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
    secure: isProduction && !!process.env.HTTPS_ENABLED,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(passport.initialize());
app.use(passport.session());

// CSRF Protection — enable with CSRF_ENABLED=true in .env (requires frontend to send x-csrf-token header)
const csrfEnabled = process.env.CSRF_ENABLED === "true";
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => sessionSecret,
  getSessionIdentifier: (req: Request) => req.sessionID ?? "",
  cookieName: "pos-csrf",
  cookieOptions: {
    sameSite: "lax" as const,
    path: "/",
    secure: isProduction,
    httpOnly: false,
  },
  size: 64,
  getCsrfTokenFromRequest: (req: Request) => (req.headers["x-csrf-token"] as string) ?? "",
  skipCsrfProtection: (req: Request) => {
    const p = req.path;
    return p.startsWith("/api/auth/login") || p.startsWith("/auth/login") ||
           p.startsWith("/api/auth/signup") || p.startsWith("/auth/signup") ||
           p.startsWith("/api/auth/request-password-reset") || p.startsWith("/auth/request-password-reset") ||
           p.startsWith("/api/auth/reset-password") || p.startsWith("/auth/reset-password") ||
           p.startsWith("/api/csrf-token") || p.startsWith("/csrf-token");
  },
});

app.get("/api/csrf-token", (req: Request, res: Response) => {
  const token = generateCsrfToken(req, res);
  res.json({ token });
});

if (csrfEnabled) {
  app.use("/api", doubleCsrfProtection);
  logger.info("CSRF protection enabled");
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts" },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", strictLimiter);
app.use("/api/auth/request-password-reset", strictLimiter);
app.use("/api/auth/reset-password", authLimiter);

app.use("/api", apiLimiter);

app.use(pinoHttp({ logger }));

app.use("/api", router);

app.use((err: any, req: any, res: any, next: any) => {
  if (err.message?.includes("Not allowed by CORS")) {
    res.status(403).json({ error: "Not allowed by CORS" });
    return;
  }
  logger.error({ err }, "Unhandled request error");
  res.status(500).json({ error: isProduction ? "Internal server error" : err.message });
});

export default app;
