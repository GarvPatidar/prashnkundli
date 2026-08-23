"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  getConversations,
  type BackendConversation,
} from "@/features/chat/chat.api";

interface ParsedAssistantContent {
  summary?: string;

  marketCondition?: string;

  nextStep?: string;
}

function formatConversationDate(
  dateValue: string,
): string {
  const date =
    new Date(dateValue);

  const today =
    new Date();

  const todayStart =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

  const dateStart =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

  const differenceInDays =
    Math.round(
      (
        todayStart.getTime() -
        dateStart.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );

  if (
    differenceInDays ===
    0
  ) {
    return "Today";
  }

  if (
    differenceInDays ===
    1
  ) {
    return "Yesterday";
  }

  if (
    differenceInDays <=
    7
  ) {
    return "Previous 7 Days";
  }

  return "Older";
}

function formatConversationDisplayDate(
  dateValue: string,
): string {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    },
  ).format(
    new Date(
      dateValue,
    ),
  );
}

function formatConversationTime(
  dateValue: string,
): string {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour:
        "numeric",

      minute:
        "2-digit",

      hour12:
        true,
    },
  ).format(
    new Date(
      dateValue,
    ),
  );
}

function getConversationPreview(
  conversation:
    BackendConversation,
): string {
  const assistantMessage =
    [
      ...conversation.messages,
    ]
      .reverse()
      .find(
        (
          message,
        ) =>
          message.role ===
            "assistant" &&
          message.status ===
            "completed" &&
          message.content
            .trim()
            .length >
            0,
      );

  const userMessage =
    [
      ...conversation.messages,
    ]
      .reverse()
      .find(
        (
          message,
        ) =>
          message.role ===
            "user" &&
          message.content
            .trim()
            .length >
            0,
      );

  const selectedMessage =
    assistantMessage ??
    userMessage;

  if (
    !selectedMessage
  ) {
    return "No messages are available in this conversation yet.";
  }

  if (
    selectedMessage.role !==
    "assistant"
  ) {
    return selectedMessage.content;
  }

  try {
    const parsedContent =
      JSON.parse(
        selectedMessage.content,
      ) as ParsedAssistantContent;

    return (
      parsedContent.summary ??
      parsedContent.marketCondition ??
      parsedContent.nextStep ??
      "Structured XAU/USD analysis completed."
    );
  } catch {
    return selectedMessage.content;
  }
}

function getConversationType(
  conversation:
    BackendConversation,
): string {
  const normalizedTitle =
    conversation.title
      .toLowerCase();

  if (
    normalizedTitle.includes(
      "screenshot",
    ) ||
    normalizedTitle.includes(
      "chart",
    )
  ) {
    return "Screenshot";
  }

  if (
    normalizedTitle.includes(
      "buy",
    )
  ) {
    return "BUY review";
  }

  if (
    normalizedTitle.includes(
      "sell",
    )
  ) {
    return "SELL review";
  }

  if (
    normalizedTitle.includes(
      "risk",
    ) ||
    normalizedTitle.includes(
      "position",
    )
  ) {
    return "Risk review";
  }

  return "Market analysis";
}

function getErrorMessage(
  error:
    unknown,
): string {
  return error instanceof
    Error
    ? error.message
    : "Unable to load conversation history.";
}

interface ConversationGroup {
  label:
    string;

  conversations:
    BackendConversation[];
}

function groupConversationsByDate(
  conversations:
    BackendConversation[],
): ConversationGroup[] {
  const groupOrder = [
    "Today",
    "Yesterday",
    "Previous 7 Days",
    "Older",
  ] as const;

  const groups =
    new Map<
      string,
      BackendConversation[]
    >();

  for (
    const conversation
    of conversations
  ) {
    const groupLabel =
      formatConversationDate(
        conversation.updatedAt,
      );

    const existing =
      groups.get(
        groupLabel,
      ) ?? [];

    existing.push(
      conversation,
    );

    groups.set(
      groupLabel,
      existing,
    );
  }

  return groupOrder
    .map(
      (
        label,
      ) => ({
        label,

        conversations:
          groups.get(
            label,
          ) ?? [],
      }),
    )
    .filter(
      (
        group,
      ) =>
        group.conversations
          .length >
        0,
    );
}

export default function HistoryPage() {
  const [
    conversations,
    setConversations,
  ] =
    useState<
      BackendConversation[]
    >(
      [],
    );

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  useEffect(
    () => {
      const controller =
        new AbortController();

      const loadInitialConversations =
        async (): Promise<void> => {
          try {
            const loadedConversations =
              await getConversations(
                controller.signal,
              );

            if (
              controller.signal
                .aborted
            ) {
              return;
            }

            setConversations(
              loadedConversations,
            );

            setError(
              "",
            );
          } catch (
            requestError
          ) {
            if (
              requestError instanceof
                DOMException &&
              requestError.name ===
                "AbortError"
            ) {
              return;
            }

            if (
              !controller.signal
                .aborted
            ) {
              setError(
                getErrorMessage(
                  requestError,
                ),
              );
            }
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setIsLoading(
                false,
              );
            }
          }
        };

      void loadInitialConversations();

      return () => {
        controller.abort();
      };
    },
    [],
  );

  const handleRetry =
    async (): Promise<void> => {
      setIsLoading(
        true,
      );

      setError(
        "",
      );

      try {
        const loadedConversations =
          await getConversations();

        setConversations(
          loadedConversations,
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setIsLoading(
          false,
        );
      }
    };

  const filteredConversations =
    useMemo(
      () => {
        const normalizedQuery =
          searchQuery
            .trim()
            .toLowerCase();

        if (
          !normalizedQuery
        ) {
          return conversations;
        }

        return conversations
          .filter(
            (
              conversation,
            ) => {
              const preview =
                getConversationPreview(
                  conversation,
                )
                  .toLowerCase();

              return (
                conversation.title
                  .toLowerCase()
                  .includes(
                    normalizedQuery,
                  ) ||
                preview.includes(
                  normalizedQuery,
                ) ||
                conversation.symbol
                  .toLowerCase()
                  .includes(
                    normalizedQuery,
                  )
              );
            },
          );
      },
      [
        conversations,
        searchQuery,
      ],
    );

  const groupedConversations =
    useMemo(
      () =>
        groupConversationsByDate(
          filteredConversations,
        ),
      [
        filteredConversations,
      ],
    );

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--background)] p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <section className="surface p-5 md:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                CONVERSATIONS
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)]">
                History
              </h1>

              <p className="mt-2 text-[15px] leading-7 text-[var(--text-muted)]">
                Review your previous XAU/USD questions,
                chart uploads and structured analyses.
              </p>
            </div>

            <Link
              href={`/app/chat?new=${crypto.randomUUID()}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
            >
              New analysis

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </Link>
          </div>

          <div className="relative mt-6">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
              aria-hidden="true"
            />

            <input
              type="search"
              value={
                searchQuery
              }
              onChange={(
                event,
              ) =>
                setSearchQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search conversations"
              className="focus-ring h-12 w-full rounded-xl border border-[var(--border)] bg-white pl-11 pr-4 text-base text-[var(--text)] placeholder:text-[var(--text-subtle)]"
            />
          </div>
        </section>

        {isLoading ? (
          <section className="mt-5 flex min-h-52 items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
            <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
              <LoaderCircle
                size={20}
                className="animate-spin text-[var(--primary)]"
                aria-hidden="true"
              />

              Loading conversation history…
            </div>
          </section>
        ) : null}

        {!isLoading &&
        error ? (
          <section className="mt-5 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-[var(--danger)]"
                aria-hidden="true"
              />

              <div className="flex-1">
                <p className="font-semibold text-[var(--danger)]">
                  History could not be loaded
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--danger)]">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void handleRetry()
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--danger)]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--danger)]"
                >
                  <RefreshCw
                    size={16}
                    aria-hidden="true"
                  />

                  Retry
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!isLoading &&
        !error &&
        conversations.length ===
          0 ? (
          <section className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-white px-5 py-14 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <MessageSquareText
                size={22}
                aria-hidden="true"
              />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[var(--text)]">
              No conversations yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-[15px] leading-7 text-[var(--text-muted)]">
              Start your first XAU/USD analysis and it will
              automatically appear here.
            </p>

            <Link
              href={`/app/chat?new=${crypto.randomUUID()}`}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white"
            >
              Start analysis

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </Link>
          </section>
        ) : null}

        {!isLoading &&
        !error &&
        conversations.length >
          0 &&
        filteredConversations.length ===
          0 ? (
          <section className="mt-5 rounded-2xl border border-[var(--border)] bg-white px-5 py-12 text-center">
            <h2 className="text-base font-semibold text-[var(--text)]">
              No matching conversations
            </h2>

            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Try searching with another keyword.
            </p>
          </section>
        ) : null}

        {!isLoading &&
        !error &&
        groupedConversations.length >
          0 ? (
          <div className="mt-6 space-y-8">
            {groupedConversations.map(
              (
                group,
              ) => (
                <section
                  key={
                    group.label
                  }
                >
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {
                      group.label
                    }
                  </h2>

                  <div className="space-y-3">
                    {group.conversations.map(
                      (
                        conversation,
                      ) => {
                        const preview =
                          getConversationPreview(
                            conversation,
                          );

                        return (
                          <Link
                            key={
                              conversation.id
                            }
                            href={`/app/chat?conversation=${conversation.id}`}
                            className="group block rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)]/25 hover:shadow-[var(--shadow-md)]"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                                <MessageSquareText
                                  size={
                                    20
                                  }
                                  aria-hidden="true"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <h3 className="truncate text-base font-semibold text-[var(--text)]">
                                    {
                                      conversation.title
                                    }
                                  </h3>

                                  <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                                    {getConversationType(
                                      conversation,
                                    )}
                                  </span>
                                </div>

                                <p className="mt-2 line-clamp-2 text-[15px] leading-7 text-[var(--text-muted)]">
                                  {
                                    preview
                                  }
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-subtle)]">
                                  <span className="flex items-center gap-2">
                                    <CalendarDays
                                      size={
                                        14
                                      }
                                      aria-hidden="true"
                                    />

                                    {formatConversationDisplayDate(
                                      conversation.updatedAt,
                                    )}

                                    {" · "}

                                    {formatConversationTime(
                                      conversation.updatedAt,
                                    )}
                                  </span>

                                  <span>
                                    {
                                      conversation
                                        .messages
                                        .length
                                    }{" "}
                                    {conversation
                                      .messages
                                      .length ===
                                    1
                                      ? "message"
                                      : "messages"}
                                  </span>
                                </div>
                              </div>

                              <ArrowRight
                                size={
                                  18
                                }
                                className="mt-1 shrink-0 text-[var(--text-subtle)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--primary)]"
                                aria-hidden="true"
                              />
                            </div>
                          </Link>
                        );
                      },
                    )}
                  </div>
                </section>
              ),
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}