import type { LucideIcon } from "lucide-react";

export type QuickActionTone =
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "neutral";

export interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: string;
  tone?: QuickActionTone;
  onClick: () => void;
}