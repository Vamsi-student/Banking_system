import accountModel from "../models/account.model.js";

/**
 * - Create Account Controller
 * - POST /api/accounts
 */

export async function createAccountController(req, res) {

    const user = req.user;

    const account = await accountModel.create({
        user: user._id
    })

    res.status(201).json({
        account
    })

}