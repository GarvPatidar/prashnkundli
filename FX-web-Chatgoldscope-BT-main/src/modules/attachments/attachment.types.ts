export type SupportedAttachmentMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/webp";

export interface StoredAttachment {
  id: string;

  userId: string;

  fileName: string;

  mimeType: SupportedAttachmentMimeType;

  size: number;

  absolutePath: string;

  createdAt: string;
}

export interface ChatAttachmentReference {
  id: string;

  fileName: string;

  mimeType: SupportedAttachmentMimeType;

  size: number;
}