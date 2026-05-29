import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAccounts } from "@/modules/accounts/hooks/useAccounts"
import { useCreateTransaction } from "@/modules/transactions/hooks/useTransactions"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowRight } from "lucide-react"

export default function Transfer() {
  const location = useLocation()
  const preselectedFrom = location.state?.fromAccount

  const { data: accounts } = useAccounts()
  const createTransaction = useCreateTransaction()
  const navigate = useNavigate()

  const [fromAccount, setFromAccount] = useState(preselectedFrom || "")
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!fromAccount) errs.from = "Select source account"
    if (!toAccountId) errs.to = "Enter destination account ID"
    if (!amount || Number(amount) <= 0) errs.amount = "Enter a valid amount"
    if (fromAccount && fromAccount === toAccountId)
      errs.to = "Cannot transfer to the same account"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    createTransaction.mutate(
      {
        fromAccount,
        toAccount: toAccountId,
        amount: Number(amount),
      },
      {
        onSuccess: () => {
          toast.success("Transfer completed successfully")
          navigate("/accounts")
        },
        onError: (err) => {
          toast.error(
            err.response?.data?.message || "Transfer failed"
          )
        },
      }
    )
  }

  const activeAccounts =
    accounts?.filter((a) => a.status === "ACTIVE") || []

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transfer</h1>
        <p className="text-muted-foreground">
          Send money between your accounts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Transfer</CardTitle>
          <CardDescription>
            Funds will be moved immediately
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromAccount">From Account</Label>
              <Select
                value={fromAccount}
                onValueChange={setFromAccount}
              >
                <SelectTrigger id="fromAccount">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc._id} value={acc._id}>
                      {acc._id.slice(-8)} — ₹
                      {acc.balance?.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.from && (
                <p className="text-sm text-destructive">{errors.from}</p>
              )}
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toAccount">To Account ID</Label>
              <Input
                id="toAccount"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                placeholder="Enter destination account ID"
              />
              {errors.to && (
                <p className="text-sm text-destructive">{errors.to}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">
                  {errors.amount}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Transfer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
