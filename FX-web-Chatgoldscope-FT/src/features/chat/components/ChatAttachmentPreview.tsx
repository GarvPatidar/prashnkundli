"use client";

import { X } from "lucide-react";
import Image from "next/image";
import type { ChatAttachment } from "../types";

interface ChatAttachmentPreviewProps {
  attachment: ChatAttachment;
  onRemove: () => void;
}

export function ChatAttachmentPreview({
  attachment,
  onRemove,
}: ChatAttachmentPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-sm)]">
      <div className="relative h-28 w-full overflow-hidden rounded-xl">
  <Image
    src={
      attachment.previewUrl
    }
    alt={
      attachment.fileName
    }
    fill
    unoptimized
    sizes="384px"
    className="object-cover"
  />
</div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attachment"
        className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/95 text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <div className="mt-2 px-1">
        <p className="truncate text-xs font-medium text-[var(--text)]">
          {attachment.fileName}
        </p>

        <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
          {(attachment.size / 1024).toFixed(1)} KB
        </p>
      </div>
    </div>
  );
}