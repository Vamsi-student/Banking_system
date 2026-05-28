import express from "express";
import {userRegisterController,userLoginController,userLogoutController,userRefreshTokenController} from "../controllers/auth.controller.js";

const router=express.Router();

/* POST /api/auth/register */

router.post("/register", userRegisterController);

/* POST /api/auth/login */

router.post("/login",userLoginController);

/**
 * - POST /api/auth/refresh
 * - Issues new access + refresh tokens using valid refresh token cookie
 */
router.post("/refresh", userRefreshTokenController)

/**
 * - POST /api/auth/logout
 */
router.post("/logout", userLogoutController)


export default router;