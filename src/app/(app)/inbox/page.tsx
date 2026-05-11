"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import {
  MailOpen, RefreshCw, Link2, ChevronRight, User, Building2,
  MailPlus, AlertCircle, ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface InboxMessage {
  id: string;
  gmail_id: string;
  thread_id: string;
  from_email: string;
  from_name: string;
  subject: string;
  snippet: string;
  is_read: boolean;
  received_at: string;
  labels: string[];
  contact: { id: string; first_name: string; last_name: string } | null;
  company: { id: string; name: string } | null;
}

interface MessageDetail extends InboxMessage {
  body_html: string;
  body_text: string;
  to_emails: string[];
  deal: { id: string; name: string } | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notConnected, setNotConnected] = useState(false);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showReply, setShowReply] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/inbox?limit=50");
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      setTotal(data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  async function sync() {
    setSyncing(true);
    const res = await fetch("/api/inbox/sync", { method: "POST" });
    const data = await res.json();
    if (data.code === "not_connected") {
      setNotConnected(true);
    } else {
      await loadMessages();
    }
    setSyncing(false);
  }

  async function openMessage(id: string) {
    setLoadingDetail(true);
    setSelected(null);
    setShowReply(false);
    setReplyBody("");
    const res = await fetch(`/api/inbox/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSelected(data);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    }
    setLoadingDetail(false);
  }

  async function sendReply() {
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    await fetch(`/api/inbox/${selected.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyBody }),
    });
    setSending(false);
    setShowReply(false);
    setReplyBody("");
  }

  async function linkContact(messageId: string, contactId: string | null) {
    await fetch(`/api/inbox/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contactId }),
    });
    await loadMessages();
    if (selected?.id === messageId) {
      const res = await fetch(`/api/inbox/${messageId}`);
      if (res.ok) setSelected(await res.json());
    }
  }

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 -m-4 md:-m-8">
      {/* ── Message list ──────────────────────────────── */}
      <div className="w-full md:w-96 shrink-0 border-r flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">Bandeja de entrada</h1>
            {unreadCount > 0 && (
              <Badge className="h-5 text-xs px-1.5">{unreadCount}</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={sync} disabled={syncing} title="Sincronizar Gmail">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {notConnected && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Gmail no está conectado.{" "}
              <Link href="/settings/integrations" className="underline font-medium">
                Conectar Gmail →
              </Link>
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <PageSpinner containerClassName="py-12" />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <MailOpen className="h-10 w-10 opacity-30" />
              <p className="text-sm">Sin mensajes</p>
              <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
                {syncing ? <Spinner size="xs" tone="current" className="mr-1" /> : null}
                Sincronizar Gmail
              </Button>
            </div>
          ) : (
            messages.map(msg => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-accent/50 transition-colors ${
                  selected?.id === msg.id ? "bg-accent" : ""
                } ${!msg.is_read ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm truncate ${!msg.is_read ? "font-semibold" : "font-medium"}`}>
                    {msg.from_name || msg.from_email}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {msg.received_at ? formatDate(msg.received_at) : ""}
                  </span>
                </div>
                <p className={`text-xs truncate ${!msg.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                  {msg.subject || "(sin asunto)"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.snippet}</p>
                {(msg.contact || msg.company) && (
                  <div className="flex items-center gap-1 mt-1">
                    {msg.contact && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 rounded px-1">
                        <User className="h-2.5 w-2.5" />
                        {msg.contact.first_name} {msg.contact.last_name}
                      </span>
                    )}
                    {msg.company && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-purple-600 bg-purple-50 rounded px-1">
                        <Building2 className="h-2.5 w-2.5" />
                        {msg.company.name}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {total > 50 && (
          <div className="px-4 py-2 border-t text-xs text-muted-foreground text-center">
            Mostrando 50 de {total} mensajes
          </div>
        )}
      </div>

      {/* ── Message detail ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden hidden md:flex">
        {loadingDetail ? (
          <PageSpinner />
        ) : !selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <MailOpen className="h-12 w-12 opacity-20" />
            <p className="text-sm">Selecciona un mensaje para leerlo</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b space-y-1">
              <h2 className="text-lg font-semibold">{selected.subject || "(sin asunto)"}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  De: <span className="text-foreground">{selected.from_name || selected.from_email}</span>
                  {selected.from_name && <span className="text-xs ml-1">{"<"}{selected.from_email}{">"}</span>}
                </span>
                <ChevronRight className="h-3 w-3" />
                <span>{selected.received_at ? new Date(selected.received_at).toLocaleString("es-ES") : ""}</span>
              </div>
              {/* Link to CRM entities */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {selected.contact ? (
                  <Link
                    href={`/contacts/${selected.contact.id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 hover:bg-blue-100"
                  >
                    <User className="h-3 w-3" />
                    {selected.contact.first_name} {selected.contact.last_name}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                ) : (
                  <button
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-dashed rounded-full px-2 py-0.5 hover:border-blue-400 hover:text-blue-600"
                    title="Buscar contacto con este email"
                    onClick={async () => {
                      const res = await fetch(`/api/contacts?email=${encodeURIComponent(selected.from_email)}&limit=1`);
                      if (res.ok) {
                        const data = await res.json();
                        const contacts = Array.isArray(data) ? data : (data.data ?? []);
                        if (contacts[0]) {
                          await linkContact(selected.id, contacts[0].id);
                        }
                      }
                    }}
                  >
                    <Link2 className="h-3 w-3" />
                    Vincular contacto
                  </button>
                )}
                {selected.company && (
                  <Link
                    href={`/companies/${selected.company.id}`}
                    className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 hover:bg-purple-100"
                  >
                    <Building2 className="h-3 w-3" />
                    {selected.company.name}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selected.body_html ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: selected.body_html }}
                />
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-sans">{selected.body_text}</pre>
              )}
            </div>

            {/* Reply area */}
            <div className="border-t px-6 py-3">
              {showReply ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-none"
                    placeholder={`Responder a ${selected.from_email}...`}
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={sendReply} disabled={sending || !replyBody.trim()}>
                      {sending ? <Spinner size="xs" tone="current" className="mr-1" /> : null}
                      Enviar respuesta
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowReply(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowReply(true)} className="gap-1.5">
                  <MailPlus className="h-3.5 w-3.5" />
                  Responder
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
