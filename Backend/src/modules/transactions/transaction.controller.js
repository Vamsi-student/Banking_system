import mongoose from "mongoose";
import transactionModel from "../../models/transaction.model.js";
import accountModel from "../../models/account.model.js";
import ledgerModel from "../../models/ledger.model.js";
import { sendTransactionEmail } from "../../services/email.service.js";

/**
 * - Create a new transaction
 * THE TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Start MongoDB transaction
     * 5. Atomically deduct balance (findOneAndUpdate with balance guard)
     * 6. Atomically credit receiver
     * 7. Create transaction document (PENDING)
     * 8. Create DEBIT + CREDIT ledger entries
     * 9. Mark transaction COMPLETED → commit
     * 10. Send email notification
 */

export async function createTransaction(req,res) {
    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || amount == null || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
            message: "Amount must be a positive number"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    })

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({
            message: "Sender and receiver accounts must be different"
        })
    }
    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })

        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    if(fromUserAccount.status!=="ACTIVE" || toUserAccount.status!=="ACTIVE"){
        return res.status(400).json({
            message:"Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

     let session;
    let transaction;
    try {
        session = await mongoose.startSession()
        session.startTransaction()

        /**
         * 4. Atomically deduct balance from sender
         * findOneAndUpdate with { balance: { $gte: amount } } is the critical guard:
         * - If balance is sufficient, atomically subtracts amount
         * - If balance is insufficient, returns null
         * - MongoDB's transaction write-conflict detection prevents concurrent TX1
         */
        const deductedAccount = await accountModel.findOneAndUpdate(
            { _id: fromAccount, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { session, returnDocument: "after" }
        )

        if (!deductedAccount) {
            await session.abortTransaction()
            return res.status(400).json({
                message: `Insufficient balance. Requested amount is ${amount}`
            })
        }

        /**
         * 5. Atomically credit receiver
         */
        await accountModel.findOneAndUpdate(
            { _id: toAccount },
            { $inc: { balance: amount } },
            { session }
        )

        /**
         * 6. Create transaction document (PENDING)
         */
        transaction = (await transactionModel.create([ {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]

        /**
         * 7. Create DEBIT ledger entry
         */
        await ledgerModel.create([ {
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        /**
         * 8. Create CREDIT ledger entry
         */
        await ledgerModel.create([ {
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        /**
         * 9. Mark transaction COMPLETED
         */
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

        await session.commitTransaction()
    } catch (error) {
        if (session) {
            await session.abortTransaction()
        }

        console.error("Transaction failed:", error)

        return res.status(400).json({
            message: "Transaction failed, please retry with the same idempotency key",
        })

    } finally {
        if (session) {
            session.endSession()
        }
    }
    /**
     * 10. Respond first, then send email asynchronously
     */
    res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

    sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)
        .catch(err => console.error("Failed to send transaction email:", err))


}

export async function getTransactionHistory(req, res) {
    const userAccounts = await accountModel.find({ user: req.user._id }).select("_id")
    const accountIds = userAccounts.map((a) => a._id)

    const transactions = await transactionModel
        .find({
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } },
            ],
        })
        .sort({ createdAt: -1 })
        .lean()

    const enriched = transactions.map((tx) => ({
        ...tx,
        isDebit: accountIds.some((id) => id.equals(tx.fromAccount)),
    }))

    return res.status(200).json({ transactions: enriched })
}

export async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }


    let session;
    let transaction;

    try {
        session = await mongoose.startSession()
        session.startTransaction()

        const deductedAccount = await accountModel.findOneAndUpdate(
            { _id: fromUserAccount._id, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { session, returnDocument: "after" }
        )

        if (!deductedAccount) {
            await session.abortTransaction()
            return res.status(400).json({
                message: "Insufficient balance in system account"
            })
        }

        await accountModel.findOneAndUpdate(
            { _id: toAccount },
            { $inc: { balance: amount } },
            { session }
        )

        transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        })

        await ledgerModel.create([ {
            account: fromUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        await ledgerModel.create([ {
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        transaction.status = "COMPLETED"
        await transaction.save({ session })

        await session.commitTransaction()
    } catch (error) {
        if (session) {
            await session.abortTransaction()
        }

        console.error("Initial funds transaction failed:", error)

        return res.status(400).json({
            message: "Initial funds transaction failed, please retry with the same idempotency key"
        })
    } finally {
        if (session) {
            session.endSession()
        }
    }

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })


}