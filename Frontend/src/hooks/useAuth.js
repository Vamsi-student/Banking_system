import { useEffect } from "react"
import authStore from "@/store/authStore"

export function useAuth() {
  const user = authStore((s) => s.user)
  const isLoading = authStore((s) => s.isLoading)
  const login = authStore((s) => s.login)
  const register = authStore((s) => s.register)
  const logout = authStore((s) => s.logout)
  const tryRefresh = authStore((s) => s.tryRefresh)

  useEffect(() => {
    if (!user && isLoading) {
      tryRefresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    tryRefresh,
  }
}
