import { useTransactionHistory } from "@/modules/transactions/hooks/useTransactions"
import {
  Card,
  CardContent,
} from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import { Skeleton } from "@/common/components/ui/skeleton"
import {
  ArrowUpRight,
  ArrowDownRight,
  History,
} from "lucide-react"

const statusVariant = {
  COMPLETED: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REVERSED: "outline",
}

export default function Transactions() {
  const { data: transactions, isLoading } = useTransactionHistory()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Transaction History
        </h1>
        <p className="text-muted-foreground">
          All transactions involving your accounts
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : transactions?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <History className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No transactions yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions?.map((tx) => (
            <Card key={tx._id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {tx.isDebit ? (
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-destructive" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 shrink-0 text-emerald-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {tx.isDebit ? "Sent" : "Received"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {tx.isDebit
                        ? `To: ${tx.toAccount?.slice(-8)}`
                        : `From: ${tx.fromAccount?.slice(-8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className={`text-lg font-bold ${
                      tx.isDebit ? "text-destructive" : "text-emerald-500"
                    }`}
                  >
                    {tx.isDebit ? "-" : "+"}₹{tx.amount?.toLocaleString()}
                  </p>
                  <Badge variant={statusVariant[tx.status] || "secondary"}>
                    {tx.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
