import express from "express"
import cookieParser from "cookie-parser";
import AuthRoutes from "./routes/auth.routes.js"
import AccountRoutes from "./routes/account.routes.js"

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth",AuthRoutes);
app.use("/api/accounts",AccountRoutes);

export default app