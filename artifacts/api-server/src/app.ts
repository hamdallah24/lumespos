import express, { type Express } from "express";
import session from "express-session";
import passport from "passport";
import cookieParser from "cookie-parser";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();



app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-sayq-pos-session",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);
app.use(cors({ 
  credentials: true, 
  origin: "http://localhost:4173"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use("/api", router);

app.use((err: any, req: any, res: any, next: any) => {
  console.error("DETAIL ERROR:", err);
  res.status(500).json({ error: err.message });
});

export default app;
