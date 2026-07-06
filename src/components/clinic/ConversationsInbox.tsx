"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, Loader2, Send, User, UserCog } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Conversation, ConversationMessage } from "@/types";

const CHANNEL_LABEL: Record<string, string> = { telegram: "تيليجرام", whatsapp: "واتساب" };

function timeAr(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function ConversationsInbox({
  clinicId,
  initial,
}: {
  clinicId: string;
  initial: Conversation[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [activeMode, setActiveMode] = useState<"ai" | "human">("ai");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [busyMode, setBusyMode] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/clinics/${clinicId}/conversations`);
    if (res.ok) {
      const json = await res.json();
      setConversations(json.conversations);
    }
  }, [clinicId]);

  const loadThread = useCallback(
    async (convId: string) => {
      const res = await fetch(
        `/api/clinics/${clinicId}/conversations/${convId}/messages`
      );
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages);
        setActiveMode(json.conversation.mode);
      }
    },
    [clinicId]
  );

  // Realtime is the primary update path; the slow poll is just a fallback in
  // case the socket drops (RLS scopes changes to this clinic's rows already).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `clinic_id=eq.${clinicId}` },
        () => loadList()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_messages", filter: `clinic_id=eq.${clinicId}` },
        () => {
          loadList();
          setActiveId((cur) => {
            if (cur) loadThread(cur);
            return cur;
          });
        }
      )
      .subscribe();

    const poll = setInterval(loadList, 20000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [clinicId, loadList, loadThread]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const t = setInterval(() => loadThread(activeId), 15000);
    return () => clearInterval(t);
  }, [activeId, loadThread]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  async function openConversation(convId: string) {
    setActiveId(convId);
    setMessages([]);
    await loadThread(convId);
  }

  async function setMode(mode: "ai" | "human") {
    if (!activeId) return;
    setBusyMode(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/conversations/${activeId}/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "فشل التغيير");
      setActiveMode(mode);
      toast.success(mode === "human" ? "استلمت المحادثة — المساعد الذكي متوقف" : "تمت إعادة المحادثة للمساعد الذكي");
      loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل التغيير");
    } finally {
      setBusyMode(false);
    }
  }

  async function sendReply() {
    if (!activeId || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/conversations/${activeId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "فشل الإرسال");
      setReply("");
      setActiveMode("human");
      await loadThread(activeId);
      loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الإرسال");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      {/* Conversation list */}
      <div
        className={cn(
          "rounded-xl border border-border/70 bg-card",
          active ? "hidden lg:block" : "block"
        )}
      >
        <div className="max-h-[70vh] overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              لا توجد محادثات بعد. ستظهر هنا فور تواصل أي مريض عبر البوت.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border/50 p-3 text-start transition-colors hover:bg-accent",
                  activeId === c.id && "bg-accent"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 truncate font-semibold">
                    {c.needs_attention && (
                      <span className="size-2 shrink-0 rounded-full bg-destructive" />
                    )}
                    {c.patient_name || c.patient_phone || c.chat_ref}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAr(c.last_message_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {c.last_sender === "patient" ? "" : "أنت/المساعد: "}
                  {c.last_message_preview ?? ""}
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {CHANNEL_LABEL[c.channel] ?? c.channel}
                  </Badge>
                  {c.mode === "human" ? (
                    <Badge className="bg-amber-500/15 text-amber-700 text-[10px] dark:text-amber-400">
                      موظف
                    </Badge>
                  ) : (
                    <Badge className="bg-primary/15 text-primary text-[10px]">مساعد ذكي</Badge>
                  )}
                  {c.needs_attention && (
                    <Badge variant="destructive" className="text-[10px]">
                      تحتاج ردّك
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div
        className={cn(
          "flex min-h-[60vh] flex-col rounded-xl border border-border/70 bg-card",
          active ? "flex" : "hidden lg:flex"
        )}
      >
        {!active ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            اختر محادثة من القائمة لعرضها والرد عليها.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border/70 p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveId(null)}
                  className="lg:hidden"
                  aria-label="رجوع"
                >
                  <ArrowRight className="size-5" />
                </button>
                <div className="leading-tight">
                  <p className="font-semibold">
                    {active.patient_name || active.patient_phone || active.chat_ref}
                  </p>
                  <p dir="ltr" className="text-end text-[11px] text-muted-foreground">
                    {active.patient_phone ?? ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeMode === "human" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMode("ai")}
                    disabled={busyMode}
                  >
                    <Bot className="size-4" />
                    إرجاع للمساعد الذكي
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setMode("human")}
                    disabled={busyMode}
                  >
                    <UserCog className="size-4" />
                    استلام المحادثة
                  </Button>
                )}
              </div>
            </div>

            <div ref={threadRef} className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => {
                const mine = m.direction === "out";
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-start" : "justify-end")}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-brand-sm",
                        mine
                          ? m.sender === "ai"
                            ? "bg-primary/10 text-foreground"
                            : "bg-emerald-600 text-white"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <div className="mb-0.5 flex items-center gap-1 text-[10px] opacity-70">
                        {m.sender === "patient" ? (
                          <User className="size-3" />
                        ) : m.sender === "ai" ? (
                          <Bot className="size-3" />
                        ) : (
                          <UserCog className="size-3" />
                        )}
                        {m.sender === "patient" ? "المريض" : m.sender === "ai" ? "المساعد الذكي" : "موظف"}
                        <span>· {timeAr(m.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد رسائل في هذه المحادثة بعد.
                </p>
              )}
            </div>

            {activeMode === "ai" && (
              <div className="border-t border-border/70 bg-amber-500/5 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
                المساعد الذكي يرد على هذه المحادثة تلقائياً. أرسل رسالة أو اضغط «استلام المحادثة» لتتدخّل بنفسك.
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendReply();
              }}
              className="flex items-center gap-2 border-t border-border/70 p-3"
            >
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="اكتب ردّك للمريض..."
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" disabled={sending || !reply.trim()} size="icon">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
