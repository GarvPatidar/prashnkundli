"use client";

import {
  useEffect,
  useState,
} from "react";

interface GoldScopeChatResponseProps {
  content:
    string | undefined;
}

const REVEAL_INTERVAL_MS =
  18;

const CHARACTERS_PER_TICK =
  3;

export function GoldScopeChatResponse({
  content,
}: GoldScopeChatResponseProps) {
  const safeContent =
    content?.trim() ?? "";

  const [
    visibleCharacterCount,
    setVisibleCharacterCount,
  ] =
    useState(0);

  useEffect(() => {
    if (!safeContent) {
      return;
    }

    const intervalId =
      window.setInterval(
        () => {
          setVisibleCharacterCount(
            (
              currentCount,
            ) => {
              const nextCount =
                Math.min(
                  currentCount +
                    CHARACTERS_PER_TICK,
                  safeContent.length,
                );

              if (
                nextCount >=
                safeContent.length
              ) {
                window.clearInterval(
                  intervalId,
                );
              }

              return nextCount;
            },
          );
        },
        REVEAL_INTERVAL_MS,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    safeContent,
  ]);

  if (!safeContent) {
    return (
      <div className="max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
        <div
          role="alert"
          className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-[15px] leading-7 text-[var(--danger)]"
        >
          GoldScope received an incomplete response.
          Please try again.
        </div>
      </div>
    );
  }

  const visibleContent =
    safeContent.slice(
      0,
      visibleCharacterCount,
    );

  const isComplete =
    visibleCharacterCount >=
    safeContent.length;

  return (
    <div className="max-w-2xl">
      <div className="text-[15px] leading-7 text-[var(--text-secondary)]">
        {visibleContent}

        {!isComplete ? (
          <span
            className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--primary)] align-middle"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}