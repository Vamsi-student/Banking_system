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

export function setTokenCookies(res, accessToken, refreshToken) {
    res.cookie("token", accessToken, ACCESS_COOKIE_OPTIONS)
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS)
}

export function clearTokenCookies(res) {
    res.clearCookie("token", ACCESS_COOKIE_OPTIONS)
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS)
}
