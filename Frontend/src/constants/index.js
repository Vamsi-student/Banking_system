export const API_BASE_URL = "http://localhost:3000/api"

export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/",
  ACCOUNTS: "/accounts",
  ACCOUNT_DETAIL: "/accounts/:id",
  TRANSFER: "/transfer",
}

export const AUTH_ROUTES = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
}

export const ACCOUNT_ROUTES = {
  CREATE: "/accounts",
  LIST: "/accounts",
  BALANCE: (id) => `/accounts/balance/${id}`,
}

export const TRANSACTION_ROUTES = {
  CREATE: "/transactions",
  SYSTEM_INITIAL_FUNDS: "/transactions/system/initial-funds",
}

export const RATE_LIMITS = {
  LOGIN: { max: 10, window: 15 },
  REGISTER: { max: 5, window: 15 },
  REFRESH: { max: 10, window: 15 },
  GLOBAL: { max: 100, window: 15 },
}
