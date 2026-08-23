"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/atoms/Button";

type Experience = "beginner" | "intermediate" | "advanced";
type TradingStyle = "scalping" | "intraday" | "swing";
type AccountSize =
  | "under-500"
  | "500-2000"
  | "2000-10000"
  | "above-10000";
type TradingChallenge =
  | "entry-timing"
  | "risk-management"
  | "psychology"
  | "stop-loss"
  | "trend-identification";

type OnboardingState = {
  experience: Experience | "";
  tradingStyle: TradingStyle | "";
  accountSize: AccountSize | "";
  challenge: TradingChallenge | "";
};

const initialState: OnboardingState = {
  experience: "",
  tradingStyle: "",
  accountSize: "",
  challenge: "",
};

const experienceOptions = [
  {
    value: "beginner",
    title: "Beginner",
    description: "I am still learning XAU/USD basics.",
  },
  {
    value: "intermediate",
    title: "Intermediate",
    description: "I trade regularly but need better consistency.",
  },
  {
    value: "advanced",
    title: "Advanced",
    description: "I understand market structure and risk management.",
  },
] as const;

const tradingStyleOptions = [
  {
    value: "scalping",
    title: "Scalping",
    description: "Fast trades on lower timeframes.",
  },
  {
    value: "intraday",
    title: "Intraday",
    description: "Trades opened and closed within the same day.",
  },
  {
    value: "swing",
    title: "Swing",
    description: "Trades held for multiple sessions or days.",
  },
] as const;

const accountSizeOptions = [
  {
    value: "under-500",
    title: "Under $500",
  },
  {
    value: "500-2000",
    title: "$500 – $2,000",
  },
  {
    value: "2000-10000",
    title: "$2,000 – $10,000",
  },
  {
    value: "above-10000",
    title: "Above $10,000",
  },
] as const;

const challengeOptions = [
  {
    value: "entry-timing",
    title: "Entry timing",
  },
  {
    value: "risk-management",
    title: "Risk management",
  },
  {
    value: "psychology",
    title: "Trading psychology",
  },
  {
    value: "stop-loss",
    title: "Stop-loss placement",
  },
  {
    value: "trend-identification",
    title: "Trend identification",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingState>(initialState);

  const isCurrentStepValid =
    (step === 1 && form.experience) ||
    (step === 2 && form.tradingStyle) ||
    (step === 3 && form.accountSize) ||
    (step === 4 && form.challenge);

  const handleNext = () => {
    if (!isCurrentStepValid) {
      return;
    }

    if (step < 4) {
      setStep((currentStep) => currentStep + 1);
      return;
    }

    window.sessionStorage.setItem(
      "goldscope_trader_profile",
      JSON.stringify(form),
    );

    router.push("/app/chat");
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((currentStep) => currentStep - 1);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-[var(--primary)]">
            PERSONALISE YOUR COPILOT
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-4xl">
            Help GoldScope understand how you trade.
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            This takes less than 30 seconds and helps generate more relevant
            XAU/USD analysis.
          </p>
        </div>

        <div className="surface p-6 sm:p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
              <span>Step {step} of 4</span>
              <span>{step * 25}% complete</span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${step * 25}%` }}
              />
            </div>
          </div>

          {step === 1 ? (
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text)]">
                How experienced are you?
              </h2>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Choose the option that best describes your current level.
              </p>

              <div className="mt-6 grid gap-3">
                {experienceOptions.map((option) => {
                  const isSelected = form.experience === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          experience: option.value,
                        }))
                      }
                      className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : "border-[var(--border)] bg-white hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-[var(--text)]">
                          {option.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {option.description}
                        </p>
                      </div>

                      {isSelected ? (
                        <CheckCircle2
                          size={20}
                          className="shrink-0 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text)]">
                How do you usually trade?
              </h2>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                This helps the AI choose the right timeframes and response style.
              </p>

              <div className="mt-6 grid gap-3">
                {tradingStyleOptions.map((option) => {
                  const isSelected = form.tradingStyle === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          tradingStyle: option.value,
                        }))
                      }
                      className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : "border-[var(--border)] bg-white hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-[var(--text)]">
                          {option.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {option.description}
                        </p>
                      </div>

                      {isSelected ? (
                        <CheckCircle2
                          size={20}
                          className="shrink-0 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text)]">
                What is your approximate account size?
              </h2>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                This is used only to personalise risk explanations.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {accountSizeOptions.map((option) => {
                  const isSelected = form.accountSize === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          accountSize: option.value,
                        }))
                      }
                      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : "border-[var(--border)] bg-white hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <span className="font-semibold text-[var(--text)]">
                        {option.title}
                      </span>

                      {isSelected ? (
                        <CheckCircle2
                          size={20}
                          className="text-[var(--primary)]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text)]">
                What is your biggest trading challenge?
              </h2>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                GoldScope will prioritise this area in future responses.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {challengeOptions.map((option) => {
                  const isSelected = form.challenge === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          challenge: option.value,
                        }))
                      }
                      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : "border-[var(--border)] bg-white hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <span className="font-semibold text-[var(--text)]">
                        {option.title}
                      </span>

                      {isSelected ? (
                        <CheckCircle2
                          size={20}
                          className="text-[var(--primary)]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Back
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={!isCurrentStepValid}
            >
              {step === 4 ? "Finish setup" : "Continue"}
              <ArrowRight size={17} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}