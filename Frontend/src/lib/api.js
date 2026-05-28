import api from "./axios"
import {
  AUTH_ROUTES,
  ACCOUNT_ROUTES,
  TRANSACTION_ROUTES,
} from "@/constants"

export const authApi = {
  login: (data) => api.post(AUTH_ROUTES.LOGIN, data),
  register: (data) => api.post(AUTH_ROUTES.REGISTER, data),
  refresh: () => api.post(AUTH_ROUTES.REFRESH),
  logout: () => api.post(AUTH_ROUTES.LOGOUT),
}

export const accountApi = {
  create: () => api.post(ACCOUNT_ROUTES.CREATE),
  getAll: () => api.get(ACCOUNT_ROUTES.LIST),
  getBalance: (accountId) => api.get(ACCOUNT_ROUTES.BALANCE(accountId)),
}

export const transactionApi = {
  create: (data) => api.post(TRANSACTION_ROUTES.CREATE, data),
  systemInitialFunds: (data) =>
    api.post(TRANSACTION_ROUTES.SYSTEM_INITIAL_FUNDS, data),
}
