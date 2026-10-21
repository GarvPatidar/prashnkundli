"use client";

import { useState } from "react";

import { ThumbsDown, ThumbsUp } from "lucide-react";

import { authenticatedFetch } from "@/features/auth/auth.api";
import { cn } from "@/lib/cn";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

interface FeedbackButtonsProps {
  messageId: string;
}

export function FeedbackButtons({ messageId }: FeedbackButtonsProps) {
  const [rating, setRating] = useState<"UP" | "DOWN" | null>(null);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [thanks, setThanks] = useState(false);

  const send = async (next: "UP" | "DOWN", why?: string) => {
    setRating(next);

    try {
      await authenticatedFetch(`${API_BASE_URL}/v1/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating: next, reason: why || null }),
      });
    } catch {
      /* feedback is best effort */
    }
  };

  const button = (value: "UP" | "DOWN", label: string, Icon: typeof ThumbsUp) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={rating === value}
      onClick={() => {
        void send(value);
        setAsking(value === "DOWN");
        setThanks(value === "UP");
      }}
      className={cn(
        "rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
        rating === value && "bg-[var(--surface-muted)] text-[var(--primary)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="mt-1 text-xs text-[var(--text-muted)]">
      <div className="flex items-center gap-1">
        {button("UP", "Helpful", ThumbsUp)}
        {button("DOWN", "Not helpful", ThumbsDown)}
        {thanks ? <span className="ml-1">Thanks!</span> : null}
      </div>

      {asking ? (
        <form
          className="mt-2 flex max-w-md items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send("DOWN", reason.trim());
            setAsking(false);
            setThanks(true);
          }}
        >
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            placeholder="What was wrong? (optional)"
            className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text)]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Send
          </button>
        </form>
      ) : null}
    </div>
  );
}
