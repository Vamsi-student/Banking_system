import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import app from "../../src/app.js"
import supertest from "supertest"

let mongod

function parseCookieValue(cookies, name) {
    if (!cookies) return null
    const cookie = cookies.find(c => c.startsWith(`${name}=`))
    if (!cookie) return null
    return cookie.split(";")[0].replace(`${name}=`, "")
}

export async function startTestServer() {
    mongod = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            dbName: "test",
            name: "testset",
            storageEngine: "wiredTiger"
        },
        binary: {
            downloadTimeout: 120
        }
    })

    const baseUri = mongod.getUri()
    const uri = `${baseUri}&retryWrites=false`

    process.env.JWT_SECRET = "test-secret-for-testing-only-32-chars-long!!"
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32-chars-long-!!"
    process.env.NODE_ENV = "test"
    process.env.MONGO_URI = uri

    console.log("MongoDB URI:", uri)

    await mongoose.connect(uri)
}

export async function stopTestServer() {
    await mongoose.disconnect()
    if (mongod) {
        await mongod.stop()
    }
}

export async function clearDatabase() {
    const collections = mongoose.connection.collections
    for (const key in collections) {
        await collections[key].deleteMany({})
    }
}

export function request() {
    return supertest(app)
}

export async function createTestUser(email = "test@example.com", password = "Pass@1234", name = "Test User") {
    const response = await request()
        .post("/api/auth/register")
        .send({ email, password, name })

    const cookies = response.headers["set-cookie"] || []
    const token = parseCookieValue(cookies, "token")

    return {
        user: response.body.user,
        token,
        cookie: response.headers["set-cookie"]
    }
}

export async function createAccountWithBalance(userId, balance = 0) {
    const Account = mongoose.model("account")

    const account = await Account.create({
        user: userId,
        balance: balance,
        status: "ACTIVE"
    })

    return account
}
