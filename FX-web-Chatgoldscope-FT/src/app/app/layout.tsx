import type { ReactNode } from "react";

import { AppShell } from "@/components/templates/AppShell";
import { AuthGuard } from "@/features/auth/AuthGuard";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}