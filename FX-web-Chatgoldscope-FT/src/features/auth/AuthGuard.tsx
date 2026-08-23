"use client";

import type {
  ReactNode,
} from "react";

import {
  useEffect,
  useSyncExternalStore,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  clearAuthSession,
  hasAuthSession,
} from "./auth.storage";

interface AuthGuardProps {
  children: ReactNode;
}

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function AuthGuard({
  children,
}: AuthGuardProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  /*
   * During SSR and the initial hydration pass,
   * this remains false.
   *
   * After hydration it becomes true, allowing
   * access to sessionStorage without producing
   * server/client HTML mismatches.
   */
  const isClient =
    useSyncExternalStore(
      subscribe,
      getClientSnapshot,
      getServerSnapshot,
    );

  const isAuthenticated =
    isClient
      ? hasAuthSession()
      : false;

  useEffect(() => {
    if (
      !isClient ||
      isAuthenticated
    ) {
      return;
    }

    clearAuthSession();

    const redirectPath =
      encodeURIComponent(
        pathname,
      );

    router.replace(
      `/login?redirect=${redirectPath}`,
    );
  }, [
    isAuthenticated,
    isClient,
    pathname,
    router,
  ]);

  if (
    !isClient ||
    !isAuthenticated
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />

          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Checking your session…
          </p>
        </div>
      </main>
    );
  }

  return children;
}