import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export function generateTokens(userId) {
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
