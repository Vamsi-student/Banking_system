import { useMutation } from "@tanstack/react-query"
import { transactionApi } from "@/lib/api"
import { v4 as uuidv4 } from "uuid"

export function useCreateTransaction() {
  return useMutation({
    mutationFn: (data) =>
      transactionApi
        .create({ ...data, idempotencyKey: uuidv4() })
        .then((r) => r.data.transaction),
  })
}
