import { Suspense } from "react";
import Link from "next/link";
import {
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/atoms/Button";
import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-xl font-bold tracking-[-0.03em] text-[var(--text)]"
          >
            <span className="text-[var(--primary)]">
              Gold
            </span>
            Scope AI
          </Link>

          <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)]">
            Welcome back
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Sign in to continue your XAU/USD
            conversations and analyses.
          </p>
        </div>

        <div className="surface p-6 sm:p-8">
          <Suspense fallback={<div className="text-center text-sm text-[var(--text-muted)]">Loading form...</div>}>
            <LoginForm />
          </Suspense>

          <div className="my-6 flex items-center gap-3">

            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-subtle)]">
              OR
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
          >
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]"
            >
              Create account
            </Link>
          </p>
        </div>

        <div className="mt-6 flex items-start justify-center gap-2 text-center text-xs leading-5 text-[var(--text-muted)]">
          <ShieldCheck
            size={15}
            className="mt-0.5 shrink-0 text-[var(--success)]"
            aria-hidden="true"
          />

          Your account information is encrypted
          and never shared with brokers.
        </div>
      </section>
    </main>
  );
}