"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LogOut,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/atoms/Button";

const AUTH_KEY = "goldscope_demo_authenticated";
const USER_KEY = "goldscope_demo_user";
const SIGNUP_KEY = "goldscope_pending_signup";
const PROFILE_KEY = "goldscope_trader_profile";

type Experience =
  | "beginner"
  | "intermediate"
  | "advanced";

type TradingStyle =
  | "scalping"
  | "intraday"
  | "swing";

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

type SettingsFormState = {
  fullName: string;
  email: string;
  countryCode: string;
  phone: string;
  experience: Experience;
  tradingStyle: TradingStyle;
  accountSize: AccountSize;
  challenge: TradingChallenge;
  whatsappConsent: boolean;
};

type StoredSignup = {
  fullName?: string;
  email?: string;
  countryCode?: string;
  phone?: string;
  whatsappConsent?: boolean;
};

type StoredUser = {
  identifier?: string;
};

type StoredTraderProfile = {
  experience?: Experience;
  tradingStyle?: TradingStyle;
  accountSize?: AccountSize;
  challenge?: TradingChallenge;
};

const initialFormState: SettingsFormState = {
  fullName: "",
  email: "",
  countryCode: "+91",
  phone: "",
  experience: "beginner",
  tradingStyle: "intraday",
  accountSize: "under-500",
  challenge: "risk-management",
  whatsappConsent: false,
};

function parseStorageValue<Value>(
  key: string,
): Value | null {
  const storedValue =
    window.sessionStorage.getItem(key);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as Value;
  } catch {
    return null;
  }
}

export default function SettingsPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<SettingsFormState>(
      initialFormState,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const loadSettings = () => {
      const signup =
        parseStorageValue<StoredSignup>(
          SIGNUP_KEY,
        );

      const user =
        parseStorageValue<StoredUser>(
          USER_KEY,
        );

      const traderProfile =
        parseStorageValue<StoredTraderProfile>(
          PROFILE_KEY,
        );

      const identifier =
        user?.identifier?.trim() ?? "";

      const identifierIsEmail =
        identifier.includes("@");

      setForm({
        fullName: signup?.fullName ?? "",
        email:
          signup?.email ??
          (identifierIsEmail
            ? identifier
            : ""),
        countryCode:
          signup?.countryCode ?? "+91",
        phone:
          signup?.phone ??
          (!identifierIsEmail
            ? identifier.replace(/\D/g, "")
            : ""),
        experience:
          traderProfile?.experience ??
          "beginner",
        tradingStyle:
          traderProfile?.tradingStyle ??
          "intraday",
        accountSize:
          traderProfile?.accountSize ??
          "under-500",
        challenge:
          traderProfile?.challenge ??
          "risk-management",
        whatsappConsent:
          signup?.whatsappConsent ?? false,
      });

      setIsLoading(false);
    };

    const timeoutId =
      window.setTimeout(loadSettings, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const updateField = <
    Key extends keyof SettingsFormState,
  >(
    key: Key,
    value: SettingsFormState[Key],
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    if (successMessage) {
      setSuccessMessage("");
    }

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    const fullName = form.fullName.trim();
    const email = form.email
      .trim()
      .toLowerCase();
    const phone = form.phone.replace(
      /\D/g,
      "",
    );

    if (fullName.length < 2) {
      setErrorMessage(
        "Please enter your full name.",
      );
      return;
    }

    if (
      email &&
      !email.includes("@")
    ) {
      setErrorMessage(
        "Please enter a valid email address.",
      );
      return;
    }

    if (
      phone.length < 7 ||
      phone.length > 15
    ) {
      setErrorMessage(
        "Please enter a valid mobile number.",
      );
      return;
    }

    setIsSaving(true);

    const updatedSignup: StoredSignup = {
      fullName,
      email,
      countryCode: form.countryCode,
      phone,
      whatsappConsent:
        form.whatsappConsent,
    };

    const updatedProfile: StoredTraderProfile =
      {
        experience: form.experience,
        tradingStyle:
          form.tradingStyle,
        accountSize: form.accountSize,
        challenge: form.challenge,
      };

    window.sessionStorage.setItem(
      SIGNUP_KEY,
      JSON.stringify(updatedSignup),
    );

    window.sessionStorage.setItem(
      PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    window.setTimeout(() => {
      setForm((currentForm) => ({
        ...currentForm,
        fullName,
        email,
        phone,
      }));

      setIsSaving(false);
      setSuccessMessage(
        "Your profile has been updated.",
      );
    }, 500);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(
      AUTH_KEY,
    );

    router.replace("/login");
  };

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />

          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Loading your profile…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--background)] p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <section className="surface p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <UserRound
                size={22}
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                ACCOUNT SETTINGS
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)]">
                Profile and preferences
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                Keep your trading profile accurate
                so GoldScope can personalise its
                XAU/USD explanations and risk
                context.
              </p>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]"
          noValidate
        >
          <div className="space-y-5">
            <section className="surface p-5 md:p-6">
              <div className="border-b border-[var(--border)] pb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Personal information
                </h2>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Your primary account and contact
                  details.
                </p>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Full name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) =>
                      updateField(
                        "fullName",
                        event.target.value,
                      )
                    }
                    placeholder="Enter your full name"
                    className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]"
                  />
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
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value,
                      )
                    }
                    placeholder="name@example.com"
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
                      aria-label="Country code"
                      value={form.countryCode}
                      onChange={(event) =>
                        updateField(
                          "countryCode",
                          event.target.value,
                        )
                      }
                      className="border-r border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-medium text-[var(--text-secondary)] outline-none"
                    >
                      <option value="+91">
                        +91
                      </option>
                      <option value="+1">
                        +1
                      </option>
                      <option value="+44">
                        +44
                      </option>
                      <option value="+61">
                        +61
                      </option>
                      <option value="+971">
                        +971
                      </option>
                      <option value="+65">
                        +65
                      </option>
                    </select>

                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateField(
                          "phone",
                          event.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        )
                      }
                      placeholder="Mobile number"
                      className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)]"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="surface p-5 md:p-6">
              <div className="border-b border-[var(--border)] pb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Trading profile
                </h2>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  These preferences influence how
                  analysis is explained.
                </p>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="experience"
                    className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Experience level
                  </label>

                  <select
                    id="experience"
                    value={form.experience}
                    onChange={(event) =>
                      updateField(
                        "experience",
                        event.target
                          .value as Experience,
                      )
                    }
                    className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)]"
                  >
                    <option value="beginner">
                      Beginner
                    </option>
                    <option value="intermediate">
                      Intermediate
                    </option>
                    <option value="advanced">
                      Advanced
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="tradingStyle"
                    className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Trading style
                  </label>

                  <select
                    id="tradingStyle"
                    value={form.tradingStyle}
                    onChange={(event) =>
                      updateField(
                        "tradingStyle",
                        event.target
                          .value as TradingStyle,
                      )
                    }
                    className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)]"
                  >
                    <option value="scalping">
                      Scalping
                    </option>
                    <option value="intraday">
                      Intraday
                    </option>
                    <option value="swing">
                      Swing
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="accountSize"
                    className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Account size
                  </label>

                  <select
                    id="accountSize"
                    value={form.accountSize}
                    onChange={(event) =>
                      updateField(
                        "accountSize",
                        event.target
                          .value as AccountSize,
                      )
                    }
                    className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)]"
                  >
                    <option value="under-500">
                      Under $500
                    </option>
                    <option value="500-2000">
                      $500 – $2,000
                    </option>
                    <option value="2000-10000">
                      $2,000 – $10,000
                    </option>
                    <option value="above-10000">
                      Above $10,000
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="challenge"
                    className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Main challenge
                  </label>

                  <select
                    id="challenge"
                    value={form.challenge}
                    onChange={(event) =>
                      updateField(
                        "challenge",
                        event.target
                          .value as TradingChallenge,
                      )
                    }
                    className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)]"
                  >
                    <option value="entry-timing">
                      Entry timing
                    </option>
                    <option value="risk-management">
                      Risk management
                    </option>
                    <option value="psychology">
                      Trading psychology
                    </option>
                    <option value="stop-loss">
                      Stop-loss placement
                    </option>
                    <option value="trend-identification">
                      Trend identification
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <section className="surface p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                Communication preferences
              </h2>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <input
                  id="whatsappConsent"
                  type="checkbox"
                  checked={
                    form.whatsappConsent
                  }
                  onChange={(event) =>
                    updateField(
                      "whatsappConsent",
                      event.target.checked,
                    )
                  }
                  className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                />

                <label
                  htmlFor="whatsappConsent"
                  className="text-sm leading-6 text-[var(--text-secondary)]"
                >
                  I agree to receive account
                  updates, product education and
                  premium-service information on
                  WhatsApp. I can opt out at any
                  time.
                </label>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="surface p-5">
              <h2 className="text-base font-semibold text-[var(--text)]">
                Save your changes
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Updated preferences will be used
                in future GoldScope responses.
              </p>

              {errorMessage ? (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
                >
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--success)]/20 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]"
                >
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  {successMessage}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={isSaving}
                className="mt-5 w-full"
              >
                <Save
                  size={17}
                  aria-hidden="true"
                />

                {isSaving
                  ? "Saving..."
                  : "Save changes"}
              </Button>
            </section>

            <section className="rounded-2xl border border-[var(--danger)]/20 bg-white p-5 shadow-[var(--shadow-sm)]">
              <h2 className="text-base font-semibold text-[var(--text)]">
                Account access
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Sign out from this browser and
                return to the login page.
              </p>

              <Button
                type="button"
                variant="danger"
                onClick={handleLogout}
                className="mt-5 w-full"
              >
                <LogOut
                  size={17}
                  aria-hidden="true"
                />
                Logout
              </Button>
            </section>

            <div className="flex items-start gap-2 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary-soft)] p-4 text-xs leading-5 text-[var(--text-secondary)]">
              <ShieldCheck
                size={16}
                className="mt-0.5 shrink-0 text-[var(--primary)]"
                aria-hidden="true"
              />

              Prototype data is stored only in
              this browser session. Backend
              profile storage will replace it
              before launch.
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}