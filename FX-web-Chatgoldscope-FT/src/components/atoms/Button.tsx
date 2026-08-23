import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    [
      "bg-[var(--primary)]",
      "text-white",
      "hover:bg-[var(--primary-hover)]",
      "shadow-[var(--shadow-sm)]",
    ].join(" "),

  secondary:
    [
      "border",
      "border-[var(--border)]",
      "bg-white",
      "text-[var(--text)]",
      "hover:bg-[var(--surface-soft)]",
    ].join(" "),

  ghost:
    [
      "bg-transparent",
      "text-[var(--text-secondary)]",
      "hover:bg-[var(--primary-soft)]",
      "hover:text-[var(--primary)]",
    ].join(" "),

  danger:
    [
      "bg-[var(--danger)]",
      "text-white",
      "hover:opacity-90",
    ].join(" "),
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex",
        "min-h-11",
        "items-center",
        "justify-center",
        "gap-2",
        "rounded-xl",
        "px-5",
        "text-sm",
        "font-semibold",
        "transition-all",
        "duration-200",
        "focus:outline-none",
        "focus:ring-4",
        "focus:ring-[var(--primary)]/15",
        "disabled:pointer-events-none",
        "disabled:opacity-50",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}