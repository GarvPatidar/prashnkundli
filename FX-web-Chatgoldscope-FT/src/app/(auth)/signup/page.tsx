import Link from "next/link";
import {
    CheckCircle2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/atoms/Button";
import { SignupForm } from "./SignupForm";

const signupBenefits = [
  "Personalised XAU/USD analysis",
  "Chart screenshot review",
  "Saved conversation history",
] as const;

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="container-shell grid min-h-screen items-center gap-12 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <section className="hidden lg:block">
          <Link
            href="/"
            className="inline-block text-xl font-bold tracking-[-0.03em] text-[var(--text)]"
          >
            <span className="text-[var(--primary)]">Gold</span>
            Scope AI
          </Link>

          <div className="mt-16 max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-4 py-2 text-xs font-semibold text-[var(--primary-strong)]">
              <MessageCircle size={14} aria-hidden="true" />
              XAU/USD specialist copilot
            </div>

            <h1 className="mt-7 text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--text)]">
              Let&apos;s personalise your gold trading assistant.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-[var(--text-muted)]">
              Create your account, verify your mobile number and receive analysis
              based on your trading style, experience and risk profile.
            </p>

            <div className="mt-8 space-y-4">
              {signupBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-3 text-sm font-medium text-[var(--text-secondary)]"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                    <CheckCircle2 size={15} aria-hidden="true" />
                  </span>

                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-lg">
          <div className="mb-8 text-center lg:hidden">
            <Link
              href="/"
              className="inline-block text-xl font-bold tracking-[-0.03em] text-[var(--text)]"
            >
              <span className="text-[var(--primary)]">Gold</span>
              Scope AI
            </Link>
          </div>

          <div className="surface p-6 sm:p-8">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                CREATE ACCOUNT
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)]">
                Start your personalised analysis
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                It takes less than a minute. Your mobile number will be verified
                before chat access is enabled.
              </p>
            </div>
           <SignupForm />
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-subtle)]">OR</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <Button type="button" variant="secondary" className="w-full">
              Continue with Google
            </Button>

            <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]"
              >
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-6 flex items-start justify-center gap-2 text-center text-xs leading-5 text-[var(--text-muted)]">
            <ShieldCheck
              size={15}
              className="mt-0.5 shrink-0 text-[var(--success)]"
              aria-hidden="true"
            />
            Your contact information stays private and is never shared with
            brokers.
          </div>
        </section>
      </div>
    </main>
  );
}