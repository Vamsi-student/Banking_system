import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/common/components/ui/sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAuth } from "@/modules/auth/hooks/useAuth"
import Layout from "@/common/components/Layout"
import ProtectedRoute from "@/common/components/ProtectedRoute"
import Login from "@/modules/auth/pages/Login"
import Register from "@/modules/auth/pages/Register"
import Dashboard from "@/modules/dashboard/pages/Dashboard"
import Accounts from "@/modules/accounts/pages/Accounts"
import AccountDetail from "@/modules/accounts/pages/AccountDetail"
import Transfer from "@/modules/transactions/pages/Transfer"
import Transactions from "@/modules/transactions/pages/Transactions"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Register />
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transfer" element={<Transfer />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
