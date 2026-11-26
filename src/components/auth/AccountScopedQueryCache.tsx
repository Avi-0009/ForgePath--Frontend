import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { createAccountQueryClient } from "../../store/accountQueryClient";
import { useAuthStore } from "../../store/useAuthStore";

const QueryCache = ({ children }: { children: ReactNode }) => {
  const [client] = useState(createAccountQueryClient);
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const AccountScopedQueryCache = ({ children }: { children: ReactNode }) => {
  const userId = useAuthStore((state) => state.user?.id ?? "signed-out");
  return <QueryCache key={userId}>{children}</QueryCache>;
};

export default AccountScopedQueryCache;
