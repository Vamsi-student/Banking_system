import { create } from "zustand"
import { authApi } from "@/lib/api"

const authStore = create((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  login: async (data) => {
    const res = await authApi.login(data)
    set({ user: res.data.user })
    return res.data
  },

  register: async (data) => {
    const res = await authApi.register(data)
    set({ user: res.data.user })
    return res.data
  },

  tryRefresh: async () => {
    try {
      const res = await authApi.refresh()
      set({ user: res.data.user, isLoading: false })
      return res.data
    } catch {
      set({ user: null, isLoading: false })
      return null
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      set({ user: null })
    }
  },
}))

export default authStore
