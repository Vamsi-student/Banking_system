import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import {sendRegistrationEmail} from "../services/email.service.js";
import tokenBlackListModel from "../models/BlackList.model.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
    path: "/"
}

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
}

function validatePassword(password) {
    if (!password || password.length < 8) {
        return "Password must be at least 8 characters long"
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must contain an uppercase letter"
    }
    if (!/[a-z]/.test(password)) {
        return "Password must contain a lowercase letter"
    }
    if (!/[0-9]/.test(password)) {
        return "Password must contain a number"
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return "Password must contain a special character"
    }
    return null
}

function generateTokens(userId) {
    const accessToken = jwt.sign(
        { userId, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    )
    const refreshToken = jwt.sign(
        { userId, type: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    )
    return { accessToken, refreshToken }
}

function setTokenCookies(res, accessToken, refreshToken) {
    res.cookie("token", accessToken, ACCESS_COOKIE_OPTIONS)
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS)
}

function clearTokenCookies(res) {
    res.clearCookie("token", ACCESS_COOKIE_OPTIONS)
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS)
}

export async function userRegisterController(req, res) {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
        return res.status(400).json({
            message: "Email, password and name are required",
            status: "failed"
        })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
        return res.status(400).json({
            message: passwordError,
            status: "failed"
        })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const isExists = await userModel.findOne({ email: normalizedEmail })

    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        })
    }

    const user = await userModel.create({ email: normalizedEmail, password, name })

    const { accessToken, refreshToken } = generateTokens(user._id)
    setTokenCookies(res, accessToken, refreshToken)

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: user.systemUser ?? false
        }
    })

    await sendRegistrationEmail(user.email, user.name).catch(() => {});
}

export async function userLoginController(req, res) {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const user = await userModel.findOne({ email: normalizedEmail }).select("+password")
    if (!user) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const isValidPassword = await user.comparePassword(password)

    if (!isValidPassword) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const { accessToken, refreshToken } = generateTokens(user._id)
    setTokenCookies(res, accessToken, refreshToken)

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: user.systemUser ?? false
        }
    })
}

export async function userRefreshTokenController(req, res) {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
        return res.status(401).json({
            message: "Refresh token is missing"
        })
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token: refreshToken })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Refresh token is invalid"
        })
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

        if (decoded.type !== "refresh") {
            return res.status(401).json({
                message: "Invalid token type"
            })
        }

        const user = await userModel.findById(decoded.userId)

        if (!user) {
            return res.status(401).json({
                message: "User no longer exists"
            })
        }

        await tokenBlackListModel.create({ token: refreshToken })

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id)
        setTokenCookies(res, accessToken, newRefreshToken)

        res.status(200).json({
            message: "Token refreshed successfully"
        })

    } catch (err) {
        return res.status(401).json({
            message: "Refresh token is invalid or expired"
        })
    }
}

export async function userLogoutController(req, res) {
    const refreshToken = req.cookies.refreshToken

    if (refreshToken) {
        await tokenBlackListModel.create({ token: refreshToken })
    }

    clearTokenCookies(res)

    res.status(200).json({
        message: "User logged out successfully"
    })
}
