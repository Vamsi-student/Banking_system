export const ROUTES = {
    AUTH: "/api/auth",
    ACCOUNTS: "/api/accounts",
    TRANSACTIONS: "/api/transactions",
}

export const AUTH_PATHS = {
    REGISTER: "/register",
    LOGIN: "/login",
    REFRESH: "/refresh",
    LOGOUT: "/logout",
}

export const TRANSACTION_PATHS = {
    SYSTEM_INITIAL_FUNDS: "/system/initial-funds",
    BALANCE: "/balance/:accountId",
}

export const TOKEN = {
    ACCESS_EXPIRY: "15m",
    REFRESH_EXPIRY: "7d",
    ACCESS_MAX_AGE: 15 * 60 * 1000,
    REFRESH_MAX_AGE: 7 * 24 * 60 * 60 * 1000,
}

export const ACCOUNT_STATUS = {
    ACTIVE: "ACTIVE",
    FROZEN: "FROZEN",
    CLOSED: "CLOSED",
}

export const TRANSACTION_STATUS = {
    PENDING: "PENDING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    REVERSED: "REVERSED",
}

export const LEDGER_TYPE = {
    DEBIT: "DEBIT",
    CREDIT: "CREDIT",
}
