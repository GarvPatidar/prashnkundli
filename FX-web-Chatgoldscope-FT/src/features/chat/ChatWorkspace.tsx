"use client";

import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import { useSearchParams } from "next/navigation";

import {
  BarChart3,
  ImagePlus,
  SendHorizontal,
  TrendingUp,
} from "lucide-react";

import {
  Button,
} from "@/components/atoms/Button";

import {
  QuickActionCard,
} from "@/components/molecules/QuickActionCard";

import {
  sendChatMessage,
  uploadChatAttachment,
  getConversation,
} from "./chat.api";

import {
  AnalysisProgress,
} from "./components/AnalysisProgress";

import {
  ChatAttachmentPreview,
} from "./components/ChatAttachmentPreview";

import {
  GoldScopeAnalysisCard,
} from "./components/GoldScopeAnalysisCard";

import {
  GoldScopeChatResponse,
} from "./components/GoldScopeChatResponse";

import {
  loadStoredConversation,
  saveConversation,
  saveConversationList,
  loadConversationById,
} from "./storage";

import type {
  ChatAttachment,
  ChatMessage,
  Conversation,
  GoldScopeAnalysis,
  ResponseMode,
} from "./types/chat.types";

import {
  createAssistantPlaceholder,
  createUserMessage,
} from "./utils";

const ANALYSIS_STEPS = [
  "Understanding your question",
  "Reviewing relevant market context",
  "Checking risk and trading conditions",
  "Preparing your response",
] as const;

const ANALYSIS_STEP_INTERVAL_MS = 1_250;
const MAX_ATTACHMENT_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 3; // 👉 Max 3 images limit

const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const quickActions = [
  {
    icon: BarChart3,
    title: "Market outlook",
    description: "Understand the current Gold trend, structure and important price areas.",
    meta: "Trend · Structure · Levels",
    tone: "primary" as const,
    prompt: "What is the current XAU/USD market outlook?",
  },
  {
    icon: TrendingUp,
    title: "Review my trade",
    description: "Review your position, entry, stop loss, target and current risk.",
    meta: "Position · Risk · Invalidation",
    tone: "success" as const,
    prompt: "I want to review my current XAU/USD trade.",
  },
] as const;

function createEmptyConversation(): Conversation {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    backendConversationId: null,
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeStoredConversation(
  storedConversation: Conversation,
): Conversation {
  return {
    ...storedConversation,
    backendConversationId:
      storedConversation.backendConversationId ?? null,
    messages: storedConversation.messages.map(
      (storedMessage) => ({
        ...storedMessage,
        attachments: storedMessage.attachments || [],
        status:
          storedMessage.status === "streaming"
            ? "failed"
            : storedMessage.status,
      }),
    ),
  };
}

export function ChatWorkspace() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const newChatParam = searchParams.get("new");
  const conversationParam = searchParams.get("conversation");

  const [conversation, setConversation] = useState<Conversation>(() => {
    if (conversationParam) {
      const historicChat = loadConversationById(conversationParam);
      if (historicChat) {
        return normalizeStoredConversation(historicChat);
      }
      
      if (typeof window !== "undefined") {
        const rawList = window.localStorage.getItem("goldscope_all_conversations");
        if (rawList) {
          try {
            const list = JSON.parse(rawList) as Conversation[];
            const matched = list.find((c) => c.id === conversationParam);
            if (matched) {
              return normalizeStoredConversation(matched);
            }
            if (list.length > 0) {
              return normalizeStoredConversation(list[0]);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    const storedConversation = loadStoredConversation();
    if (!storedConversation) return createEmptyConversation();

    return normalizeStoredConversation(storedConversation);
  });

  const [message, setMessage] = useState("");
  // 👉 Single state ko Arrays mein convert kar diya gaya hai
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  
  const [isResponding, setIsResponding] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);

  const hasUserMessages = conversation.messages.some(
    (chatMessage) => chatMessage.role === "user",
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const clearAttachments = useCallback(() => {
    attachments.forEach((att) => {
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
    });

    setAttachments([]);
    setAttachmentFiles([]);
    setAttachmentError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [attachments]);

  const removeAttachment = useCallback((indexToRemove: number) => {
    setAttachments((prev) => {
      const target = prev[indexToRemove];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== indexToRemove);
    });
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setAttachmentError(null);
  }, []);

  const handleNewChat = useCallback(() => {
    if (isResponding) return;
    clearAttachments();
    setConversation(createEmptyConversation());
  }, [isResponding, clearAttachments]);

  const handleNewChatRef = useRef(handleNewChat);
  useEffect(() => {
    handleNewChatRef.current = handleNewChat;
  }, [handleNewChat]);

  useEffect(() => {
    if (!newChatParam) return;
    const timeoutId = window.setTimeout(() => {
      handleNewChatRef.current();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [newChatParam]);

  useEffect(() => {
    const trigger = () => handleNewChatRef.current();
    (window as unknown as Record<string, unknown>).__triggerNewChat = trigger;
    return () => {
      delete (window as unknown as Record<string, unknown>).__triggerNewChat;
    };
  }, []);

  useEffect(() => {
    const conversationForStorage: Conversation = {
      ...conversation,
      messages: conversation.messages.map((chatMessage) => ({
        ...chatMessage,
        attachments: chatMessage.attachments || [],
        analysis:
          chatMessage.responseMode === "ANALYSIS"
            ? chatMessage.analysis
            : undefined,
      })),
    };

    saveConversation(conversationForStorage);
    saveConversationList(conversationForStorage);
  }, [conversation]);

  useEffect(() => {
    if (!isResponding) return;

    const intervalId = window.setInterval(() => {
      setAnalysisStepIndex((currentIndex) =>
        Math.min(currentIndex + 1, ANALYSIS_STEPS.length - 1),
      );
    }, ANALYSIS_STEP_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isResponding]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [conversation.messages, analysisStepIndex]);

  useEffect(() => {
    return () => {
      attachments.forEach((att) => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Cleanup on unmount

  useEffect(() => {
    if (!conversationParam) return;

    let isMounted = true;

    async function fetchHistoricChat() {
      try {
        const backendChat = await getConversation(conversationParam!);
        if (!isMounted) return;

        const formattedConversation: Conversation = {
          id: backendChat.id,
          backendConversationId: backendChat.id,
          title: backendChat.title,
          createdAt: backendChat.createdAt,
          updatedAt: backendChat.updatedAt,
          messages: backendChat.messages.map((msg) => ({
            id: msg.id,
            conversationId: msg.conversationId,
            role: msg.role,
            status: "completed", 
            content: msg.content,
            createdAt: msg.createdAt,
            // 👉 Yahan attachments ko properly map karke missing fields add kar di gayi hain
            attachments: (msg.attachments || []).map(att => ({
              id: att.id,
              type: "image", // 👈 Yeh type required tha
              fileName: att.fileName,
              mimeType: att.mimeType,
              size: att.size,
              previewUrl: att.previewUrl || "", // 👈 Fallback for previewUrl
            })),
            responseMode: "CONVERSATIONAL",
          })),
        };

        setConversation(formattedConversation);
      } catch (err) {
        console.error("Could not load conversation from backend:", err);
      }
    }

    void fetchHistoricChat();

    return () => {
      isMounted = false;
    };
  }, [conversationParam]);

  // 👉 Naya function jo array of files ko handle karta hai aur max limit check karta hai
  const addAttachments = (files: File[]) => {
    setAttachmentError(null);

    const validFiles = files.filter((file) => {
      if (!SUPPORTED_ATTACHMENT_TYPES.has(file.type)) {
        setAttachmentError("Please upload PNG, JPG or WebP images.");
        return false;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setAttachmentError("Each screenshot must be smaller than 8 MB.");
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return false;

    setAttachments((prevAttachments) => {
      const currentCount = prevAttachments.length;
      const allowedToAdd = Math.max(0, MAX_IMAGES - currentCount);
      const filesToAdd = validFiles.slice(0, allowedToAdd);

      if (validFiles.length > allowedToAdd || currentCount + validFiles.length > MAX_IMAGES) {
        setAttachmentError(`You can only upload up to ${MAX_IMAGES} images at a time.`);
      }

      const newAttachments = filesToAdd.map((file) => ({
        id: crypto.randomUUID(),
        type: "image" as const,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        mimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
        size: file.size,
      }));

      setAttachmentFiles((prevFiles) => [...prevFiles, ...filesToAdd]);
      return [...prevAttachments, ...newAttachments];
    });

    return true;
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    
    addAttachments(files);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const updateAssistantMessage = (
    messageId: string,
    backendConversationId: string,
    responseMode: ResponseMode,
    responseMessage: string,
    analysis: GoldScopeAnalysis,
  ) => {
    setConversation((currentConversation) => ({
      ...currentConversation,
      backendConversationId,
      updatedAt: new Date().toISOString(),
      messages: currentConversation.messages.map((chatMessage) =>
        chatMessage.id === messageId
          ? {
              ...chatMessage,
              content: responseMessage,
              responseMode,
              analysis:
                responseMode === "ANALYSIS" ? analysis : undefined,
              status: "completed",
            }
          : chatMessage,
      ),
    }));
  };

  const failAssistantMessage = (
    messageId: string,
    errorMessage: string,
  ) => {
    setConversation((currentConversation) => ({
      ...currentConversation,
      updatedAt: new Date().toISOString(),
      messages: currentConversation.messages.map((chatMessage) =>
        chatMessage.id === messageId
          ? {
              ...chatMessage,
              content: errorMessage,
              status: "failed",
            }
          : chatMessage,
      ),
    }));
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardItems = Array.from(event.clipboardData.items);
    const imageItems = clipboardItems.filter(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );

    if (imageItems.length === 0) return;
    event.preventDefault();

    const pastedFiles = imageItems.map(item => {
      const file = item.getAsFile()!;
      const extension =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/webp"
          ? "webp"
          : "png";

      return new File([file], `goldscope-screenshot-${Date.now()}.${extension}`, {
        type: file.type,
        lastModified: Date.now(),
      });
    });

    addAttachments(pastedFiles);
  };

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();

    // 👉 Condition check updated for multiple files
    if ((!trimmedMessage && attachmentFiles.length === 0) || isResponding) {
      return;
    }

    const finalMessage = trimmedMessage || "Please analyse this screenshot.";

    // Take snapshot of current state before clearing
    const currentAttachments = [...attachments];
    const currentAttachmentFiles = [...attachmentFiles];

    const userMessage = createUserMessage(
      conversation.id,
      finalMessage,
      currentAttachments,
    );

    const assistantPlaceholder = createAssistantPlaceholder(conversation.id);
    setAnalysisStepIndex(0);

    setConversation((currentConversation) => ({
      ...currentConversation,
      updatedAt: new Date().toISOString(),
      messages: [
        ...currentConversation.messages,
        userMessage,
        assistantPlaceholder,
      ],
    }));

    // Clear UI state
    setMessage("");
    setAttachments([]);
    setAttachmentFiles([]);
    setAttachmentError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setIsResponding(true);

    try {
      // 👉 Upload all selected files concurrently using Promise.all
      const uploadedAttachments = [];

      if (currentAttachmentFiles.length > 0) {
        const uploadPromises = currentAttachmentFiles.map((file) => uploadChatAttachment(file));
        const uploadResponses = await Promise.all(uploadPromises);

        for (const uploadResponse of uploadResponses) {
          uploadedAttachments.push({
            id: uploadResponse.data.id,
            fileName: uploadResponse.data.fileName,
            mimeType: uploadResponse.data.mimeType,
            size: uploadResponse.data.size,
          });
        }
      }

      // 👉 IMPORTANT: API request ab ek array bhejne ki koshish kar raha hai (`attachments`)
      const response = await sendChatMessage({
        conversationId: conversation.backendConversationId ?? null,
        message: finalMessage,
        attachments: uploadedAttachments, 
      });

      updateAssistantMessage(
        assistantPlaceholder.id,
        response.data.conversationId,
        response.data.responseMode,
        response.data.message,
        response.data.analysis,
      );
    } catch (requestError) {
      failAssistantMessage(
        assistantPlaceholder.id,
        requestError instanceof Error
          ? requestError.message
          : "GoldScope could not analyse your request.",
      );
    } finally {
      setIsResponding(false);
    }
  };

  const handlePromptSelection = (prompt: string) => {
    setMessage(prompt);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const renderUserMessage = (chatMessage: ChatMessage) => {
    return (
      <div key={chatMessage.id} className="ml-auto max-w-[520px]">
        {/* Render all attached images for a message */}
        <div className="flex flex-col gap-2">
          {chatMessage.attachments.map((messageAttachment) => (
            <div
              key={messageAttachment.id}
              className="relative h-72 w-full overflow-hidden rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)]"
            >
              <Image
                src={messageAttachment.previewUrl}
                alt={messageAttachment.fileName}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 520px"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {chatMessage.content && (
          <div className="mt-2 rounded-2xl rounded-br-md bg-[var(--primary)] px-4 py-3 text-sm leading-6 text-white shadow-[var(--shadow-sm)]">
            {chatMessage.content}
          </div>
        )}
      </div>
    );
  };

  // ... [renderStreamingMessage, renderAnalysisMessage, renderConversationalMessage, renderFallbackMessage, renderMessage functions remain same]
  const renderStreamingMessage = (chatMessage: ChatMessage) => {
    return (
      <div key={chatMessage.id} className="max-w-2xl">
        <AnalysisProgress
          completedSteps={ANALYSIS_STEPS.slice(0, analysisStepIndex)}
          currentStep={
            ANALYSIS_STEPS[analysisStepIndex] ??
            "Preparing your response"
          }
          totalSteps={ANALYSIS_STEPS.length}
        />
      </div>
    );
  };

  const renderAnalysisMessage = (chatMessage: ChatMessage) => {
    if (!chatMessage.analysis) return null;
    return (
      <div key={chatMessage.id} className="max-w-4xl">
        <GoldScopeAnalysisCard analysis={chatMessage.analysis} />
      </div>
    );
  };

  const renderConversationalMessage = (chatMessage: ChatMessage) => {
    return (
      <GoldScopeChatResponse
        key={chatMessage.id}
        content={chatMessage.content}
      />
    );
  };

  const renderFallbackMessage = (chatMessage: ChatMessage) => {
    const isFailed = chatMessage.status === "failed";
    return (
      <div key={chatMessage.id} className="max-w-2xl">
        <div
          role={isFailed ? "alert" : undefined}
          className={
            isFailed
              ? "rounded-2xl rounded-bl-md border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm leading-6 text-[var(--danger)]"
              : "rounded-2xl rounded-bl-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-7 text-[var(--text-secondary)] shadow-[var(--shadow-sm)]"
          }
        >
          {chatMessage.content}
        </div>
      </div>
    );
  };

  const renderMessage = (chatMessage: ChatMessage) => {
    if (chatMessage.role === "user") return renderUserMessage(chatMessage);
    if (chatMessage.status === "streaming") return renderStreamingMessage(chatMessage);
    if (chatMessage.status === "completed" && chatMessage.responseMode === "ANALYSIS" && chatMessage.analysis) return renderAnalysisMessage(chatMessage);
    if (chatMessage.status === "completed" && chatMessage.role === "assistant") return renderConversationalMessage(chatMessage);
    return renderFallbackMessage(chatMessage);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--surface-soft)]">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
        {!hasUserMessages ? (
          <div className="mx-auto flex min-h-[calc(100vh-220px)] max-w-5xl flex-col justify-center">
            {/* Same Welcome Screen logic */}
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-[var(--primary)]">{greeting}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)] md:text-5xl">
                What do you want to analyse?
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)]">
                Ask GoldScope about Gold, understand the current market or review an existing trade.
              </p>
            </div>
            <div className="mx-auto mt-10 grid w-full max-w-3xl gap-4 md:grid-cols-2">
              {quickActions.map((action) => (
                <QuickActionCard
                  key={action.title}
                  icon={action.icon}
                  title={action.title}
                  description={action.description}
                  meta={action.meta}
                  tone={action.tone}
                  onClick={() => handlePromptSelection(action.prompt)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            {conversation.messages.map(renderMessage)}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] bg-white/95 px-3 py-3 backdrop-blur-xl md:px-4 md:py-4">
        <div className="mx-auto max-w-4xl">
          
          {/* 👉 Multiple images preview container */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((att, index) => (
                <div key={att.id} className="w-32">
                  <ChatAttachmentPreview
                    attachment={att}
                    onRemove={() => removeAttachment(index)}
                  />
                </div>
              ))}
            </div>
          )}

          {attachmentError && (
            <p role="alert" className="mb-2 text-xs text-[var(--danger)]">
              {attachmentError}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple // 👉 Yahan multiple add ho gaya!
            onChange={handleAttachmentChange}
            className="hidden"
          />

          <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-md)] transition focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[var(--primary)]/10">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isResponding || attachments.length >= MAX_IMAGES}
              className="size-11 min-h-11 shrink-0 px-0"
              aria-label="Attach trading screenshot"
            >
              <ImagePlus size={18} aria-hidden="true" />
            </Button>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              disabled={isResponding}
              placeholder={
                isResponding
                  ? "GoldScope is working on your response..."
                  : attachments.length > 0
                  ? "Ask something about these screenshots..."
                  : "Ask GoldScope about Gold..."
              }
              className="min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-base leading-7 text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] disabled:cursor-not-allowed disabled:opacity-70"
            />

            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                (!message.trim() && attachmentFiles.length === 0) || isResponding
              }
              className="size-11 min-h-11 shrink-0 px-0"
              aria-label={isResponding ? "GoldScope is responding" : "Send message"}
            >
              <SendHorizontal size={18} aria-hidden="true" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] leading-5 text-[var(--text-subtle)]">
            GoldScope provides market decision-support, not financial advice. Verify live execution conditions and manage your own risk.
          </p>
        </div>
      </div>
    </div>
  );
}