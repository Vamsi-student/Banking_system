import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import jwt from "jsonwebtoken"
import { startTestServer, stopTestServer, clearDatabase, request, createTestUser } from "./helpers/setup.js"

beforeAll(async () => await startTestServer())
afterEach(async () => await clearDatabase())
afterAll(async () => await stopTestServer())

describe("POST /api/auth/register", () => {

    it("registers a new user and returns 201 with user data", async () => {
        const response = await request()
            .post("/api/auth/register")
            .send({ email: "alice@test.com", password: "Strong@123", name: "Alice" })

        expect(response.status).toBe(201)
        expect(response.body.user.email).toBe("alice@test.com")
        expect(response.body.user.name).toBe("Alice")
        expect(response.body.token).toBeUndefined()
        /**
         * Verifies cookies are set with security flags.
         * Two cookies are set: token (access) and refreshToken (refresh).
         * Both must be httpOnly and SameSite=Strict.
         */
        const cookies = response.headers["set-cookie"]
        expect(cookies).toBeDefined()
        expect(cookies.length).toBe(2)

        const tokenCookie = cookies.find(c => c.startsWith("token="))
        expect(tokenCookie).toBeDefined()
        expect(tokenCookie).toContain("HttpOnly")
        expect(tokenCookie).toContain("SameSite=Strict")

        const refreshCookie = cookies.find(c => c.startsWith("refreshToken="))
        expect(refreshCookie).toBeDefined()
        expect(refreshCookie).toContain("HttpOnly")
        expect(refreshCookie).toContain("SameSite=Strict")
    })

    it("rejects duplicate email with 422", async () => {
        await createTestUser("dup@test.com", "Dup@12345", "Dup")

        const response = await request()
            .post("/api/auth/register")
            .send({ email: "dup@test.com", password: "Other@123", name: "Duplicate" })

        expect(response.status).toBe(422)
        expect(response.body.message).toContain("already exists")
    })

    it("rejects missing fields with 400", async () => {
        const response = await request()
            .post("/api/auth/register")
            .send({ email: "only@test.com" })

        expect(response.status).toBe(400)
    })
})

describe("POST /api/auth/login", () => {

    it("logs in with valid credentials and returns 200 with user data", async () => {
        await createTestUser("bob@test.com", "Bob@12345", "Bob")

        const response = await request()
            .post("/api/auth/login")
            .send({ email: "bob@test.com", password: "Bob@12345" })

        expect(response.status).toBe(200)
        expect(response.body.user.email).toBe("bob@test.com")
        expect(response.body.token).toBeUndefined()
    })

    it("rejects invalid password with 401", async () => {
        await createTestUser("carol@test.com", "Carol@123", "Carol")

        const response = await request()
            .post("/api/auth/login")
            .send({ email: "carol@test.com", password: "Wrong@1234" })

        expect(response.status).toBe(401)
    })

    it("rejects non-existent email with 401", async () => {
        const response = await request()
            .post("/api/auth/login")
            .send({ email: "nobody@test.com", password: "anypassword" })

        expect(response.status).toBe(401)
        expect(response.body.message).toBe("Email or password is INVALID")
    })
})

describe("POST /api/auth/refresh — token refresh", () => {

    it("returns 401 when no refresh token cookie is present", async () => {
        const response = await request()
            .post("/api/auth/refresh")

        expect(response.status).toBe(401)
        expect(response.body.message).toContain("Refresh token is missing")
    })

    it("issues new tokens when valid refresh token is provided", async () => {
        const { cookie } = await createTestUser("refresh@test.com", "Pass@1234", "Refresh")

        const response = await request()
            .post("/api/auth/refresh")
            .set("Cookie", cookie)

        expect(response.status).toBe(200)
        expect(response.body.message).toContain("refreshed")

        const newCookies = response.headers["set-cookie"]
        expect(newCookies).toBeDefined()
        expect(newCookies.length).toBe(2)

        // Old refresh token should now be blacklisted
        const oldRefreshCookie = cookie.find(c => c.startsWith("refreshToken="))
        const oldRefreshToken = oldRefreshCookie.split(";")[0].replace("refreshToken=", "")

        const staleResponse = await request()
            .post("/api/auth/refresh")
            .set("Cookie", [`refreshToken=${oldRefreshToken}`])

        expect(staleResponse.status).toBe(401)
        expect(staleResponse.body.message).toContain("invalid")
    })

    it("rejects expired refresh tokens", async () => {
        // Create a token that's already expired
        const expiredToken = jwt.sign(
            { userId: "000000000000000000000000", type: "refresh" },
            process.env.JWT_SECRET,
            { expiresIn: "0s" }
        )

        const response = await request()
            .post("/api/auth/refresh")
            .set("Cookie", [`refreshToken=${expiredToken}`])

        expect(response.status).toBe(401)
        expect(response.body.message).toContain("invalid or expired")
    })
})

describe("POST /api/auth/logout — token revocation", () => {

    it("blacklists refresh token on logout, access token remains valid until expiry", async () => {
        const { token, cookie } = await createTestUser("logout@test.com", "Pass@1234", "Logout")

        // Access token should work before logout
        const preLogout = await request()
            .get("/api/accounts")
            .set("Authorization", `Bearer ${token}`)

        expect(preLogout.status).toBe(200)

        // Logout — only blacklists refresh token
        const logoutResponse = await request()
            .post("/api/auth/logout")
            .set("Cookie", cookie)

        expect(logoutResponse.status).toBe(200)

        // Access token is NOT blacklisted (it expires in 15m anyway)
        const postLogout = await request()
            .get("/api/accounts")
            .set("Authorization", `Bearer ${token}`)

        expect(postLogout.status).toBe(200)

        // Refresh token IS blacklisted — can't get new tokens
        const refreshResponse = await request()
            .post("/api/auth/refresh")
            .set("Cookie", cookie)

        expect(refreshResponse.status).toBe(401)
    })
})

describe("GET /api/accounts — protected route", () => {

    it("returns 401 when no token is provided", async () => {
        const response = await request().get("/api/accounts")

        expect(response.status).toBe(401)
        expect(response.body.message).toContain("token is missing")
    })

    it("returns 401 when an invalid token is provided", async () => {
        const response = await request()
            .get("/api/accounts")
            .set("Authorization", "Bearer invalid.jwt.token")

        expect(response.status).toBe(401)
    })

    it("returns 200 with accounts for authenticated user", async () => {
        const { token } = await createTestUser("dave@test.com", "Pass@1234", "Dave")

        const response = await request()
            .get("/api/accounts")
            .set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.accounts)).toBe(true)
    })
})
