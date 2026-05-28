import express from "express";
import { authMiddleware,authSystemUserMiddleware } from "../middlewares/auth.middleware.js";
import { createTransaction, getTransactionHistory, createInitialFundsTransaction } from "../controllers/transaction.controller.js";

const transactionRoutes =express.Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */

transactionRoutes.get("/", authMiddleware, getTransactionHistory);
transactionRoutes.post("/", authMiddleware,createTransaction);

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */

transactionRoutes.post("/system/initial-funds",authSystemUserMiddleware,createInitialFundsTransaction);

export default transactionRoutes;