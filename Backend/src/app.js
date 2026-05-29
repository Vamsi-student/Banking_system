import express from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser";
import AuthRoutes from "./modules/auth/auth.routes.js"
import AccountRoutes from "./modules/accounts/account.routes.js"
import transactionRoutes from "./modules/transactions/transaction.routes.js";
import { globalLimiter, loginLimiter, registerLimiter, refreshLimiter } from "./middlewares/rateLimiter.js";
import { notFoundHandler, globalErrorHandler } from "./middlewares/errorHandler.js";
import { ROUTES } from "./constants/index.js";

const app = express();

app.use(helmet())

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
    app.use(globalLimiter)
    app.use(ROUTES.AUTH + "/login", loginLimiter)
    app.use(ROUTES.AUTH + "/register", registerLimiter)
    app.use(ROUTES.AUTH + "/refresh", refreshLimiter)
}

app.use(ROUTES.AUTH, AuthRoutes);
app.use(ROUTES.ACCOUNTS, AccountRoutes);
app.use(ROUTES.TRANSACTIONS, transactionRoutes);

app.use(notFoundHandler)
app.use(globalErrorHandler)

export default app
