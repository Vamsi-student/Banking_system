import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useAccounts, useCreateAccount } from "@/hooks/useAccounts"
import { useCreateInitialFunds } from "@/hooks/useTransactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Wallet, Banknote } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export default function Dashboard() {
  const { user } = useAuth()
  const isSystemUser = user?.systemUser
  const { data: accounts, isLoading } = useAccounts()
  const createAccount = useCreateAccount()
  const initialFunds = useCreateInitialFunds()
  const navigate = useNavigate()
  const [fundTarget, setFundTarget] = useState("")
  const [fundAmount, setFundAmount] = useState("")

  const handleCreateAccount = () => {
    createAccount.mutate(undefined, {
      onSuccess: () => toast.success("Account created"),
      onError: (err) =>
        toast.error(err.response?.data?.message || "Failed to create account"),
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.name}
        </h1>
        <p className="text-muted-foreground">
          Manage your accounts and transactions
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Accounts</h2>
        <Button onClick={handleCreateAccount} disabled={createAccount.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          New Account
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : accounts?.length === 0 ? (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              You don&apos;t have any accounts yet
            </p>
            <Button onClick={handleCreateAccount}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account) => (
            <Card
              key={account._id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/accounts/${account._id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {account.currency}
                  </CardTitle>
                  <Badge
                    variant={
                      account.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {account.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ₹{account.balance?.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isSystemUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Send Initial Funds</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                initialFunds.mutate(
                  { toAccount: fundTarget, amount: Number(fundAmount) },
                  {
                    onSuccess: () => {
                      toast.success("Initial funds sent")
                      setFundTarget("")
                      setFundAmount("")
                    },
                    onError: (err) =>
                      toast.error(
                        err.response?.data?.message || "Failed to send funds"
                      ),
                  }
                )
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">
                  Target Account ID
                </label>
                <Input
                  value={fundTarget}
                  onChange={(e) => setFundTarget(e.target.value)}
                  placeholder="Account ID"
                  required
                />
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs text-muted-foreground">
                  Amount (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="1000"
                  required
                />
              </div>
              <Button type="submit" disabled={initialFunds.isPending}>
                Send Funds
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
