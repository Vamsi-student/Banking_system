import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { accountApi } from "@/lib/api"

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAll().then((r) => r.data.accounts),
  })
}

export function useAccountBalance(accountId) {
  return useQuery({
    queryKey: ["accounts", accountId, "balance"],
    queryFn: () =>
      accountApi.getBalance(accountId).then((r) => r.data.balance),
    enabled: !!accountId,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => accountApi.create().then((r) => r.data.account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    },
  })
}
