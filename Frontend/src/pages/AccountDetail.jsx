import { useParams, useNavigate } from "react-router-dom"
import { useAccounts } from "@/hooks/useAccounts"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Send } from "lucide-react"

export default function AccountDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: accounts, isLoading } = useAccounts()

  const account = accounts?.find((a) => a._id === id)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold">Account not found</h2>
        <Button variant="link" onClick={() => navigate("/accounts")}>
          Back to accounts
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => navigate("/accounts")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Details</CardTitle>
              <CardDescription className="font-mono text-xs">
                {account._id}
              </CardDescription>
            </div>
            <Badge
              variant={
                account.status === "ACTIVE" ? "default" : "secondary"
              }
            >
              {account.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-4xl font-bold">
              ₹{account.balance?.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() =>
                navigate("/transfer", { state: { fromAccount: id } })
              }
            >
              <Send className="mr-2 h-4 w-4" />
              Transfer From This Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
