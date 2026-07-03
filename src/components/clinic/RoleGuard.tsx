"use client";

import { useUser } from "@/hooks/useUser";
import type { UserRole } from "@/types";

export function RoleGuard({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { platformUser, isLoading } = useUser();

  if (isLoading) return null;
  if (!platformUser || !allow.includes(platformUser.role)) return null;

  return <>{children}</>;
}
