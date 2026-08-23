"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/atoms/Button";
import { signup } from "@/features/auth/auth.api";

type SignupFormState = {
  fullName: string;
  countryCode: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  whatsappConsent: boolean;
};

const initialFormState: SignupFormState = {
  fullName: "",
  countryCode: "+91",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  whatsappConsent: false,
};

export function SignupForm() {
  const router = useRouter();

  const [form, setForm] = useState<SignupFormState>(initialFormState);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <Key extends keyof SignupFormState>(
    key: Key,
    value: SignupFormState[Key],
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const fullName = form.fullName.trim();
    const phone = form.phone.replace(/\D/g, "");
    const email = form.email.trim().toLowerCase();

    if (fullName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (phone.length < 7 || phone.length > 15) {
      setError("Please enter a valid mobile number.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.termsAccepted) {
      setError(
        "You must accept the Terms, Privacy Policy and Risk Disclosure.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({
        fullName,
        countryCode: form.countryCode,
        phone,
        email,
        password: form.password,
        whatsappConsent: form.whatsappConsent,
      });

      router.push("/login");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration could not be completed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
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
          htmlFor="fullName"
          className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
        >
          Full name
        </label>

        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          value={form.fullName}
          onChange={(event) => updateField("fullName", event.target.value)}
          placeholder="Enter your full name"
          className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
        >
          Mobile number
        </label>

        <div className="flex overflow-hidden rounded-xl border border-[var(--border)] bg-white focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[var(--primary)]/10">
          <select
            name="countryCode"
            aria-label="Country code"
            value={form.countryCode}
            onChange={(event) =>
              updateField("countryCode", event.target.value)
            }
            className="border-r border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-medium text-[var(--text-secondary)] outline-none"
          >
            <option value="+91">+91</option>
            <option value="+1">+1</option>
            <option value="+44">+44</option>
            <option value="+61">+61</option>
            <option value="+971">+971</option>
            <option value="+65">+65</option>
          </select>

          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) =>
              updateField("phone", event.target.value.replace(/\D/g, ""))
            }
            placeholder="Enter mobile number"
            className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)]"
          />
        </div>

        <p className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
          We&apos;ll verify this number using OTP.
        </p>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
        >
          Email address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          placeholder="name@example.com"
          className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          placeholder="Create at least 8 characters"
          className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
        >
          Confirm password
        </label>

        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) =>
            updateField("confirmPassword", event.target.value)
          }
          placeholder="Enter password again"
          className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]"
        />
      </div>

      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3">
          <input
            id="termsAccepted"
            name="termsAccepted"
            type="checkbox"
            checked={form.termsAccepted}
            onChange={(event) =>
              updateField("termsAccepted", event.target.checked)
            }
            className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
          />

          <label
            htmlFor="termsAccepted"
            className="text-xs leading-5 text-[var(--text-muted)]"
          >
            I agree to the{" "}
            <Link href="/terms" className="font-semibold text-[var(--primary)]">
              Terms
            </Link>
            ,{" "}
            <Link
              href="/privacy"
              className="font-semibold text-[var(--primary)]"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/risk-disclosure"
              className="font-semibold text-[var(--primary)]"
            >
              Risk Disclosure
            </Link>
            .
          </label>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="whatsappConsent"
            name="whatsappConsent"
            type="checkbox"
            checked={form.whatsappConsent}
            onChange={(event) =>
              updateField("whatsappConsent", event.target.checked)
            }
            className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
          />

          <label
            htmlFor="whatsappConsent"
            className="text-xs leading-5 text-[var(--text-muted)]"
          >
            I agree to receive product education, account updates and premium
            service information on WhatsApp. I can opt out later.
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Please wait..." : "Sign up"}

        {!isSubmitting ? (
          <ArrowRight size={17} aria-hidden="true" />
        ) : null}
      </Button>
    </form>
  );
}