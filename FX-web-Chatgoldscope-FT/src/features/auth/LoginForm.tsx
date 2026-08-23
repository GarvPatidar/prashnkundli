"use client";

import {
  type FormEvent,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  Button,
} from "@/components/atoms/Button";

import {
  login,
} from "./auth.api";

import {
  saveAuthSession,
} from "./auth.storage";

type LoginFormState = {
  phone: string;
  password: string;
};

const initialFormState:
  LoginFormState = {
    phone: "",
    password: "",
  };

const DEFAULT_COUNTRY_CODE =
  "+91";

export function LoginForm() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    form,
    setForm,
  ] =
    useState<LoginFormState>(
      initialFormState,
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const updateField = (
    field:
      keyof LoginFormState,
    value: string,
  ) => {
    setForm(
      (
        currentForm,
      ) => ({
        ...currentForm,

        [field]:
          value,
      }),
    );

    if (error) {
      setError("");
    }
  };

  const getRedirectPath =
    () => {
      const redirect =
        searchParams.get(
          "redirect",
        );

      if (
        redirect &&
        redirect.startsWith(
          "/app",
        )
      ) {
        return redirect;
      }

      return "/app/chat";
    };

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setError("");

      const phone =
        form.phone
          .replace(/\D/g, "")
          .trim();

      if (
        phone.length < 7
      ) {
        setError(
          "Please enter a valid mobile number.",
        );

        return;
      }

      if (
        form.password.length <
        8
      ) {
        setError(
          "Password must contain at least 8 characters.",
        );

        return;
      }

      setIsSubmitting(true);

      try {
        const result =
          await login({
            phone,

            countryCode:
              DEFAULT_COUNTRY_CODE,

            password:
              form.password,
          });

        saveAuthSession(
          result.user,
          result.authentication,
        );

        router.replace(
          getRedirectPath(),
        );
      } catch (loginError) {
        setError(
          loginError instanceof
            Error
            ? loginError.message
            : "Sign in could not be completed.",
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  return (
    <form
      className="space-y-5"
      onSubmit={
        handleSubmit
      }
      noValidate
    >
      {error ? (
        <div
          role="alert"
          className="
            rounded-xl
            border
            border-[var(--danger)]/20
            bg-[var(--danger-soft)]
            px-4
            py-3
            text-sm
            text-[var(--danger)]
          "
        >
          {error}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="phone"
          className="
            mb-2
            block
            text-sm
            font-medium
            text-[var(--text-secondary)]
          "
        >
          Mobile number
        </label>

        <div className="flex">
          <div
            className="
              flex
              h-12
              items-center
              rounded-l-xl
              border
              border-r-0
              border-[var(--border)]
              bg-[var(--surface-soft)]
              px-4
              text-sm
              font-medium
              text-[var(--text-secondary)]
            "
          >
            +91
          </div>

          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={
              form.phone
            }
            onChange={(
              event,
            ) =>
              updateField(
                "phone",
                event.target
                  .value,
              )
            }
            placeholder="Enter mobile number"
            className="
              focus-ring
              h-12
              w-full
              rounded-r-xl
              border
              border-[var(--border)]
              bg-white
              px-4
              text-sm
              text-[var(--text)]
              placeholder:text-[var(--text-subtle)]
            "
          />
        </div>
      </div>

      <div>
        <div
          className="
            mb-2
            flex
            items-center
            justify-between
          "
        >
          <label
            htmlFor="password"
            className="
              text-sm
              font-medium
              text-[var(--text-secondary)]
            "
          >
            Password
          </label>

          <Link
            href="/forgot-password"
            className="
              text-xs
              font-semibold
              text-[var(--primary)]
              transition-colors
              hover:text-[var(--primary-hover)]
            "
          >
            Forgot password?
          </Link>
        </div>

        <div className="relative">
          <input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="current-password"
            value={
              form.password
            }
            onChange={(
              event,
            ) =>
              updateField(
                "password",
                event.target
                  .value,
              )
            }
            placeholder="Enter your password"
            className="
              focus-ring
              h-12
              w-full
              rounded-xl
              border
              border-[var(--border)]
              bg-white
              px-4
              pr-12
              text-sm
              text-[var(--text)]
              placeholder:text-[var(--text-subtle)]
            "
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (
                  currentValue,
                ) =>
                  !currentValue,
              )
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            className="
              absolute
              right-3
              top-1/2
              flex
              size-9
              -translate-y-1/2
              items-center
              justify-center
              rounded-lg
              text-[var(--text-muted)]
              transition-colors
              hover:bg-[var(--surface-soft)]
              hover:text-[var(--text)]
            "
          >
            {showPassword ? (
              <EyeOff
                size={18}
                aria-hidden="true"
              />
            ) : (
              <Eye
                size={18}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={
          isSubmitting
        }
        className="w-full"
      >
        {isSubmitting
          ? "Signing in..."
          : "Sign in"}

        {!isSubmitting ? (
          <ArrowRight
            size={17}
            aria-hidden="true"
          />
        ) : null}
      </Button>
    </form>
  );
}