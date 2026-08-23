import type {
  MessageRole,
  MessageStatus,
} from "./generated/prisma/enums.js";
import { prisma } from "./prisma.js";
import type {
  Conversation,
  Message,
} from "./types.js";

type DatabaseConversation = Awaited<
  ReturnType<typeof prisma.conversation.findFirstOrThrow>
>;

type DatabaseMessage = Awaited<
  ReturnType<typeof prisma.message.findFirstOrThrow>
>;

function mapMessageRole(
  role: Message["role"],
): MessageRole {
  return role.toUpperCase() as MessageRole;
}

function mapMessageStatus(
  status: Message["status"],
): MessageStatus {
  return status.toUpperCase() as MessageStatus;
}

function mapDatabaseMessage(
  message: DatabaseMessage,
): Message {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role:
      message.role.toLowerCase() as Message["role"],
    status:
      message.status.toLowerCase() as Message["status"],
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

function mapDatabaseConversation(
  conversation: DatabaseConversation & {
    messages?: DatabaseMessage[];
  },
): Conversation {
  return {
    id: conversation.id,
    title: conversation.title,
    symbol:
      conversation.symbol as Conversation["symbol"],
    messages: (
      conversation.messages ?? []
    ).map(mapDatabaseMessage),
    createdAt:
      conversation.createdAt.toISOString(),
    updatedAt:
      conversation.updatedAt.toISOString(),
  };
}

export class ConversationRepository {
  async create(
    userId: string,
    title: string,
  ): Promise<Conversation> {
    const conversation =
      await prisma.conversation.create({
        data: {
          userId,
          title,
          symbol: "XAUUSD",
        },

        include: {
          messages: true,
        },
      });

    return mapDatabaseConversation(conversation);
  }

  async get(
    userId: string,
    conversationId: string,
  ): Promise<Conversation | null> {
    const conversation =
      await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },

        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    if (!conversation) {
      return null;
    }

    return mapDatabaseConversation(conversation);
  }

  async list(
    userId: string,
  ): Promise<Conversation[]> {
    const conversations =
      await prisma.conversation.findMany({
        where: {
          userId,
        },

        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },

        orderBy: {
          updatedAt: "desc",
        },
      });

    return conversations.map(
      mapDatabaseConversation,
    );
  }

  async add(
    userId: string,
    conversationId: string,
    message: Message,
  ): Promise<void> {
    const conversation =
      await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },

        select: {
          id: true,
        },
      });

    if (!conversation) {
      throw new Error(
        "Conversation not found.",
      );
    }

    await prisma.$transaction([
      prisma.message.create({
        data: {
          id: message.id,
          conversationId,
          role: mapMessageRole(
            message.role,
          ),
          status: mapMessageStatus(
            message.status,
          ),
          content: message.content,
          createdAt: new Date(
            message.createdAt,
          ),
        },
      }),

      prisma.conversation.update({
        where: {
          id: conversationId,
        },

        data: {
          updatedAt: new Date(),
        },
      }),
    ]);
  }

  async update(
    userId: string,
    conversationId: string,
    messageId: string,
    content: string,
    status: Message["status"],
  ): Promise<void> {
    const conversation =
      await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },

        select: {
          id: true,
        },
      });

    if (!conversation) {
      throw new Error(
        "Conversation not found.",
      );
    }

    const updatedMessage =
      await prisma.message.updateMany({
        where: {
          id: messageId,
          conversationId,
        },

        data: {
          content,
          status:
            mapMessageStatus(status),
        },
      });

    if (updatedMessage.count === 0) {
      throw new Error(
        "Message not found.",
      );
    }

    await prisma.conversation.update({
      where: {
        id: conversationId,
      },

      data: {
        updatedAt: new Date(),
      },
    });
  }

  async delete(
    userId: string,
    conversationId: string,
  ): Promise<boolean> {
    const result =
      await prisma.conversation.deleteMany({
        where: {
          id: conversationId,
          userId,
        },
      });

    return result.count > 0;
  }
}

export const conversationRepository =
  new ConversationRepository();