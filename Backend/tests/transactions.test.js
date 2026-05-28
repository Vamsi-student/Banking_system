import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import mongoose from "mongoose"
import {
    startTestServer, stopTestServer, clearDatabase,
    request, createTestUser, createAccountWithBalance
} from "./helpers/setup.js"

beforeAll(async () => await startTestServer())
afterEach(async () => await clearDatabase())
afterAll(async () => await stopTestServer())

async function createTwoFundedAccounts() {
    const senderData = await createTestUser("sender@test.com", "Pass@1234", "Sender")
    const receiverData = await createTestUser("receiver@test.com", "Pass@1234", "Receiver")
    const senderAccount = await createAccountWithBalance(senderData.user._id, 10000)
    const receiverAccount = await createAccountWithBalance(receiverData.user._id, 5000)

    return {
        sender: senderData.user,
        senderToken: senderData.token,
        receiver: receiverData.user,
        receiverToken: receiverData.token,
        senderAccount,
        receiverAccount
    }
}

describe("POST /api/transactions — transfer flow", () => {

    it("completes a transfer between two accounts", async () => {
        const { senderAccount, receiverAccount, senderToken } = await createTwoFundedAccounts()

        const response = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${senderToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 1000,
                idempotencyKey: "tx-test-001"
            })

        expect(response.status).toBe(201)
        expect(response.body.message).toContain("completed successfully")

        const Account = mongoose.model("account")
        const updatedSender = await Account.findById(senderAccount._id)
        const updatedReceiver = await Account.findById(receiverAccount._id)

        expect(updatedSender.balance).toBe(9000)
        expect(updatedReceiver.balance).toBe(6000)
    })

    it("rejects transfer with insufficient balance", async () => {
        const { senderAccount, receiverAccount, senderToken } = await createTwoFundedAccounts()

        const response = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${senderToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 99999,
                idempotencyKey: "tx-insufficient-001"
            })

        expect(response.status).toBe(400)
        expect(response.body.message).toContain("Insufficient balance")

        const Account = mongoose.model("account")
        const updatedSender = await Account.findById(senderAccount._id)
        const updatedReceiver = await Account.findById(receiverAccount._id)

        expect(updatedSender.balance).toBe(10000)
        expect(updatedReceiver.balance).toBe(5000)

        const Transaction = mongoose.model("transaction")
        const transactions = await Transaction.find({ idempotencyKey: "tx-insufficient-001" })
        expect(transactions.length).toBe(0)
    })

    it("rejects self-transfer (same from and to account)", async () => {
        const { senderAccount, senderToken } = await createTwoFundedAccounts()

        const response = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${senderToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: senderAccount._id.toString(),
                amount: 100,
                idempotencyKey: "tx-self-001"
            })

        expect(response.status).toBe(400)
        expect(response.body.message).toContain("different")
    })

    it("returns existing transaction for duplicate idempotency key", async () => {
        const { senderAccount, receiverAccount, senderToken } = await createTwoFundedAccounts()

        const firstResponse = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${senderToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 500,
                idempotencyKey: "tx-dup-001"
            })

        expect(firstResponse.status).toBe(201)

        const secondResponse = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${senderToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 500,
                idempotencyKey: "tx-dup-001"
            })

        expect(secondResponse.status).toBe(200)
        expect(secondResponse.body.message).toContain("already processed")

        const Account = mongoose.model("account")
        const senderAfter = await Account.findById(senderAccount._id)
        expect(senderAfter.balance).toBe(9500)
    })

    it("rejects transfer with invalid JWT", async () => {
        const { senderAccount, receiverAccount } = await createTwoFundedAccounts()

        const response = await request()
            .post("/api/transactions")
            .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.this.is.fake")
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 100,
                idempotencyKey: "tx-bad-jwt-001"
            })

        expect(response.status).toBe(401)
    })

    it("rejects transfer from account the user does not own", async () => {
        const { receiverAccount } = await createTwoFundedAccounts()

        const otherUser = await createTestUser("other@test.com", "Pass@1234", "Other")

        const response = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${otherUser.token}`)
            .send({
                fromAccount: "000000000000000000000000",
                toAccount: receiverAccount._id.toString(),
                amount: 100,
                idempotencyKey: "tx-unauth-001"
            })

        expect(response.status).toBe(400)
        expect(response.body.message).toContain("Invalid fromAccount")
    })

    it("rolls back on failure — no partial writes remain", async () => {
        const { senderAccount, receiverAccount, senderToken } = await createTwoFundedAccounts()

        const Account = mongoose.model("account")
        const Transaction = mongoose.model("transaction")
        const Ledger = mongoose.model("ledger")

        const senderBefore = await Account.findById(senderAccount._id)
        const receiverBefore = await Account.findById(receiverAccount._id)

        const response = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${senderToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 99999,
                idempotencyKey: "tx-rollback-001"
            })

        expect(response.status).toBe(400)

        const senderAfter = await Account.findById(senderAccount._id)
        const receiverAfter = await Account.findById(receiverAccount._id)

        expect(senderAfter.balance).toBe(senderBefore.balance)
        expect(receiverAfter.balance).toBe(receiverBefore.balance)

        const transactions = await Transaction.find({ idempotencyKey: "tx-rollback-001" })
        expect(transactions.length).toBe(0)

        const ledgerEntries = await Ledger.find({})
        expect(ledgerEntries.length).toBe(0)
    })

    it("rejects transfer with zero or negative amount", async () => {
        const { senderAccount, receiverAccount, senderToken } = await createTwoFundedAccounts()

        const zeroResponse = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${senderToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 0,
                idempotencyKey: "tx-zero-001"
            })

        expect(zeroResponse.status).toBe(400)
        expect(zeroResponse.body.message).toContain("positive number")
    })

    it("processes minimum allowed amount (0.01)", async () => {
        const { senderAccount, receiverAccount, senderToken } = await createTwoFundedAccounts()

        const response = await request()
            .post("/api/transactions")
            .set("Authorization", `Bearer ${senderToken}`)
            .send({
                fromAccount: senderAccount._id.toString(),
                toAccount: receiverAccount._id.toString(),
                amount: 0.01,
                idempotencyKey: "tx-min-001"
            })

        expect(response.status).toBe(201)

        const Account = mongoose.model("account")
        const senderAfter = await Account.findById(senderAccount._id)
        const receiverAfter = await Account.findById(receiverAccount._id)

        expect(senderAfter.balance).toBe(9999.99)
        expect(receiverAfter.balance).toBe(5000.01)
    })
})
