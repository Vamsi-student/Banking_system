import express from "express";
import {userRegisterController,userLoginController,userLogoutController,userRefreshTokenController} from "./auth.controller.js";

const router=express.Router();

router.post("/register", userRegisterController);
router.post("/login",userLoginController);
router.post("/refresh", userRefreshTokenController)
router.post("/logout", userLogoutController)

export default router;