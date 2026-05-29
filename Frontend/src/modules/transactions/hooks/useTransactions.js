import { useQuery, useMutation } from "@tanstack/react-query"
import { transactionApi } from "@/common/lib/api"
import { v4 as uuidv4 } from "uuid"

export function useTransactionHistory() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => transactionApi.getHistory().then((r) => r.data.transactions),
  })
}

export function useCreateTransaction() {
  return useMutation({
    mutationFn: (data) =>
      transactionApi
        .create({ ...data, idempotencyKey: uuidv4() })
        .then((r) => r.data.transaction),
  })
}

export function useCreateInitialFunds() {
  return useMutation({
    mutationFn: (data) =>
      transactionApi
        .systemInitialFunds({ ...data, idempotencyKey: uuidv4() })
        .then((r) => r.data.transaction),
  })
}
