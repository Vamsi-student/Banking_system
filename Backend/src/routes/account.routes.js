import express from "express";
import {authMiddleware} from "../middlewares/auth.middleware.js";
import {createAccountController,getUserAccountsController,getAccountBalanceController} from "../controllers/account.controller.js";

const router=express.Router();

/**
 * - POST /api/accounts/
 * - Create a new account
 * - Protected Route
 */

router.post("/",authMiddleware, createAccountController)

/**
 * - GET /api/accounts/
 * - Get all accounts of the logged-in user
 * - Protected Route
 */
router.get("/", authMiddleware,getUserAccountsController)

/**
 * - GET /api/accounts/balance/:accountId
 */
router.get("/balance/:accountId", authMiddleware, getAccountBalanceController)



export default router;