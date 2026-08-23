import {
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import { randomUUID } from "node:crypto";

import type {
  StoredAttachment,
  SupportedAttachmentMimeType,
} from "./attachment.types.js";

const UPLOAD_ROOT =
  path.resolve(
    process.cwd(),
    "storage",
    "chat-attachments",
  );

const MAX_ATTACHMENT_SIZE_BYTES =
  8 * 1024 * 1024;

const SUPPORTED_MIME_TYPES:
  readonly SupportedAttachmentMimeType[] = [
    "image/png",
    "image/jpeg",
    "image/webp",
  ];

function getExtension(
  mimeType:
    SupportedAttachmentMimeType,
): string {
  switch (mimeType) {
    case "image/png":
      return ".png";

    case "image/jpeg":
      return ".jpg";

    case "image/webp":
      return ".webp";
  }
}

function isSupportedMimeType(
  value: string,
): value is SupportedAttachmentMimeType {
  return SUPPORTED_MIME_TYPES.includes(
    value as SupportedAttachmentMimeType,
  );
}

function getMetadataPath(
  attachmentId:
    string,
): string {
  return path.join(
    UPLOAD_ROOT,
    `${attachmentId}.json`,
  );
}

export class AttachmentService {
  async save(
    input: {
      userId: string;

      fileName: string;

      mimeType: string;

      buffer: Buffer;
    },
  ): Promise<StoredAttachment> {
    if (
      !isSupportedMimeType(
        input.mimeType,
      )
    ) {
      throw new Error(
        "Unsupported attachment type.",
      );
    }

    if (
      input.buffer.length >
      MAX_ATTACHMENT_SIZE_BYTES
    ) {
      throw new Error(
        "Attachment exceeds the maximum allowed size.",
      );
    }

    await mkdir(
      UPLOAD_ROOT,
      {
        recursive: true,
      },
    );

    const id =
      randomUUID();

    const extension =
      getExtension(
        input.mimeType,
      );

    const absolutePath =
      path.join(
        UPLOAD_ROOT,
        `${id}${extension}`,
      );

    await writeFile(
      absolutePath,
      input.buffer,
    );

    const attachment:
      StoredAttachment = {
      id,

      userId:
        input.userId,

      fileName:
        input.fileName,

      mimeType:
        input.mimeType,

      size:
        input.buffer.length,

      absolutePath,

      createdAt:
        new Date()
          .toISOString(),
    };

    await writeFile(
      getMetadataPath(
        id,
      ),
      JSON.stringify(
        attachment,
      ),
      "utf8",
    );

    return attachment;
  }

  async getForUser(
    attachmentId:
      string,

    userId:
      string,
  ): Promise<StoredAttachment | null> {
    try {
      const metadataBuffer =
        await readFile(
          getMetadataPath(
            attachmentId,
          ),
        );

      const attachment =
        JSON.parse(
          metadataBuffer.toString(
            "utf8",
          ),
        ) as StoredAttachment;

      if (
        attachment.userId !==
        userId
      ) {
        return null;
      }

      await stat(
        attachment.absolutePath,
      );

      return attachment;
    } catch {
      return null;
    }
  }

  async readAsDataUrl(
    attachment:
      StoredAttachment,
  ): Promise<string> {
    const buffer =
      await readFile(
        attachment.absolutePath,
      );

    return `data:${attachment.mimeType};base64,${buffer.toString(
      "base64",
    )}`;
  }
}

export const attachmentService =
  new AttachmentService();