"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/atoms/Button";

type PendingSignup = {
  fullName: string;
  countryCode: string;
  phone: string;
  mobileNumber: string;
  email: string;
  whatsappConsent: boolean;
};

const PENDING_SIGNUP_KEY =
  "goldscope_pending_signup";

const DEMO_AUTH_KEY =
  "goldscope_demo_authenticated";

export default function VerifyOtpPage() {
  const router = useRouter();

  const [pendingSignup, setPendingSignup] =
    useState<PendingSignup | null>(null);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    const loadPendingSignup = () => {
      const storedSignup =
        window.sessionStorage.getItem(
          PENDING_SIGNUP_KEY,
        );

      if (!storedSignup) {
        router.replace("/signup");
        return;
      }

      try {
        const parsedSignup = JSON.parse(
          storedSignup,
        ) as PendingSignup;

        setPendingSignup(parsedSignup);
        setIsLoading(false);
      } catch {
        window.sessionStorage.removeItem(
          PENDING_SIGNUP_KEY,
        );

        router.replace("/signup");
      }
    };

    const timeoutId =
      window.setTimeout(loadPendingSignup, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  const handleOtpChange = (
    value: string,
  ) => {
    setOtp(
      value.replace(/\D/g, "").slice(0, 6),
    );

    if (error) {
      setError("");
    }
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "Please enter a valid 6-digit OTP.",
      );
      return;
    }

    setIsSubmitting(true);

    window.sessionStorage.setItem(
      DEMO_AUTH_KEY,
      "true",
    );

    router.push("/onboarding");
  };

  const handleResendOtp = () => {
    setError("");
    setOtp("");

    // Temporary prototype behaviour.
    // Real OTP resend API will be connected later.
  };

  if (isLoading || !pendingSignup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-[var(--text-muted)]">
          Loading verification…
        </p>
      </main>
    );
  }

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
            Verify your mobile number
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Enter the 6-digit OTP sent to{" "}
            <span className="font-semibold text-[var(--text)]">
              {pendingSignup.mobileNumber}
            </span>
            .
          </p>
        </div>

        <div className="surface p-6 sm:p-8">
          <form
            className="space-y-5"
            onSubmit={handleSubmit}
            noValidate
          >
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
              >
                {error}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
              >
                Verification code
              </label>

              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) =>
                  handleOtpChange(
                    event.target.value,
                  )
                }
                placeholder="Enter 6-digit OTP"
                className="focus-ring h-14 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-center text-2xl font-semibold tracking-[0.35em] text-[var(--text)] placeholder:text-sm placeholder:tracking-normal placeholder:text-[var(--text-subtle)]"
              />
            </div>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                otp.length !== 6
              }
              className="w-full"
            >
              {isSubmitting
                ? "Verifying..."
                : "Verify and continue"}

              {!isSubmitting ? (
                <ArrowRight
                  size={17}
                  aria-hidden="true"
                />
              ) : null}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-sm font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]"
            >
              Resend OTP
            </button>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-[var(--text-subtle)]">
            Prototype mode: any 6-digit OTP
            will be accepted.
          </p>
        </div>

        <div className="mt-6 flex items-start justify-center gap-2 text-center text-xs leading-5 text-[var(--text-muted)]">
          <ShieldCheck
            size={15}
            className="mt-0.5 shrink-0 text-[var(--success)]"
            aria-hidden="true"
          />

          OTP delivery and verification will be
          connected to the backend before launch.
        </div>
      </section>
    </main>
  );
}