import express from "express"
import helmet from "helmet"
import cors from "cors"
import rateLimit from "express-rate-limit"
import cookieParser from "cookie-parser";
import AuthRoutes from "./routes/auth.routes.js"
import AccountRoutes from "./routes/account.routes.js"
import transactionRoutes from "./routes/transaction.routes.js";

const app = express();

/**
 * 1. helmet — Security headers
 * Sets HTTP headers that protect against clickjacking, MIME sniffing,
 * XSS, SSL-stripping, and other browser-level attacks.
 * Must be first so headers are set on ALL responses including errors.
 */
app.use(helmet())

/**
 * 2. cors — Cross-Origin Resource Sharing
 * Controls which frontend origins can access this API.
 * The `credentials: true` flag is REQUIRED for cookie-based auth.
 * When credentials is true, origin CANNOT be "*" — it MUST be explicit.
 */
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

/**
 * 3. Body parser + Cookie parser
 */
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

/**
 * 4. Global rate limiter
 * Catches general API abuse — 100 requests per 15 minutes per IP.
 * Still generous enough for legitimate users but stops aggressive scraping.
 * Skipped in test mode so integration tests can make unlimited setup calls.
 */
if (process.env.NODE_ENV !== "test") {
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many requests, please try again later" }
    })
    app.use(globalLimiter)

    /**
     * 5. Per-endpoint rate limiters (stricter)
     * Different limits for login, register, and refresh to prevent
     * brute-force attacks, mass account creation, and token abuse.
     */
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many login attempts, please try again later" }
    })
    const registerLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many registration attempts, please try again later" }
    })
    const refreshLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many token refresh attempts, please try again later" }
    })
    app.use("/api/auth/login", loginLimiter)
    app.use("/api/auth/register", registerLimiter)
    app.use("/api/auth/refresh", refreshLimiter)
}

/**
 * 6. Route handlers
 */
app.use("/api/auth", AuthRoutes);
app.use("/api/accounts", AccountRoutes);
app.use("/api/transactions", transactionRoutes);

/**
 * 7. 404 handler — must be AFTER all routes
 * If no route matched the request, this catches it.
 * Normal middleware (3 params) — not an error handler.
 */
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: `Route ${req.method} ${req.originalUrl} not found`
        }
    })
})

/**
 * 8. Global error handler — must be LAST middleware
 * Error middleware (4 params) — Express identifies it by the `err` parameter.
 * Catches:
 *   - Async rejections from route handlers (Express 5 auto-forwards these)
 *   - next(err) calls from middleware
 *   - Unexpected programmer errors (TypeError, ReferenceError, etc.)
 *
 * Always returns JSON — never HTML — even for unexpected errors.
 */
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500
    const message = err.isOperational ? err.message : "Internal server error"

    console.error(`[${new Date().toISOString()}] ${statusCode} - ${err.message}`)
    if (statusCode === 500) {
        console.error(err.stack)
    }

    res.status(statusCode).json({
        error: {
            message: process.env.NODE_ENV === "production" ? message : err.message,
            ...(process.env.NODE_ENV !== "production" && err.stack && { stack: err.stack })
        }
    })
})

export default app