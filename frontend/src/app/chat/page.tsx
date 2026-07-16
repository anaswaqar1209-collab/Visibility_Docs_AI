"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
    Sparkles, ChevronLeft, ChevronRight, FileText, CheckSquare, Square,
    Plus, Trash2, MessageSquare, Search,
} from "lucide-react";
import ClientLayout from "@/components/ClientLayout";
import ChatComposer from "@/components/ChatComposer";
import { useTheme } from "@/context/ColorContext";
import { apiRequest } from "@/lib/apiClient";
import { usePermissions } from "@/context/PermissionsContext";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: Array<{
        documentId?: string;
        filename?: string;
        pageNumber?: number;
        snippet?: string;
    }>;
};

type LibraryDoc = {
    documentId: string;
    originalFilename: string;
    status: string;
    pythonDocumentId?: string | null;
};

type ChatSessionSummary = {
    id: string;
    title: string;
    document_ids?: string[];
    updated_at?: string;
    created_at?: string;
};

type ChatScope = "all" | "selected";
type DocStatusFilter = "" | "ready" | "processing" | "failed";

const WELCOME_MSG: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content:
        "Ask about your uploaded documents — summaries, expiries, invoice fields, and more. Use **New chat** to start a thread, or pick a past conversation from the sidebar.",
};

const LAST_SESSION_KEY = "docs_ai_last_chat_session";

function isChitchatMessage(text: string): boolean {
    const q = text.trim().toLowerCase();
    if (!q || q.length > 80) return false;
    const docHints = [
        "resume", "cv", "invoice", "document", "file", "score", "candidate",
        "pdf", "contract", "find", "show", "list", "who", "what is", "kitne",
        "kitna", "batao", "tell me", "search", "summar", "extract",
    ];
    if (docHints.some((h) => q.includes(h))) return false;
    return /^(hi|hii+|hello|hey|hy|helo|hola|salam|assalam|aoa|slm|good\s*(morning|afternoon|evening|night)|gm|gn|how are you|how's it going|how r u|whats? up|sup|thanks?|thank you|thx|ty|shukriya|ok|okay|k|cool|great|nice|bye|goodbye|yes|no|yep|yup|nope|yeah|help|who are you|what can you do)\b/i.test(
        q
    );
}

function dedupeCitations(
    items: Array<{ documentId?: string; filename?: string; pageNumber?: number; snippet?: string }>
) {
    const seen = new Set<string>();
    const out: typeof items = [];
    for (const c of items) {
        const key = String(c.documentId || c.filename || "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(c);
        if (out.length >= 3) break;
    }
    return out;
}

function mapSessionMessages(raw: any[], pythonToNode: Map<string, string>): ChatMessage[] {
    return raw.map((m, i) => ({
        id: `m_${m.id || i}`,
        role: m.role === "user" ? "user" : "assistant",
        content: m.content || "",
        citations: Array.isArray(m.sources)
            ? dedupeCitations(
                  m.sources.map((s: any) => ({
                      documentId: pythonToNode.get(s.document_id) || s.document_id,
                      filename: s.document_title || s.title,
                      pageNumber: s.page_number,
                  }))
              )
            : undefined,
    }));
}

function ChatContent() {
    const { theme } = useTheme();
    const colors = theme.colors;
    const isDark = theme.name === "dark";
    const { canChat } = usePermissions();

    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatScope, setChatScope] = useState<ChatScope>("all");
    const [libraryDocs, setLibraryDocs] = useState<LibraryDoc[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [sessionId, setSessionId] = useState<string | undefined>();
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [docSearch, setDocSearch] = useState("");
    const [docStatusFilter, setDocStatusFilter] = useState<DocStatusFilter>("");
    const bottomRef = useRef<HTMLDivElement>(null);

    const pythonToNode = new Map(
        libraryDocs.filter((d) => d.pythonDocumentId).map((d) => [d.pythonDocumentId as string, d.documentId])
    );

    const loadDocs = useCallback(() => {
        apiRequest("/docs/documents?limit=100")
            .then((data) => setLibraryDocs(data?.data?.documents || []))
            .catch(() => setLibraryDocs([]));
    }, []);

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const data = await apiRequest("/docs/chat/sessions");
            setSessions(data?.data?.sessions || []);
        } catch {
            setSessions([]);
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDocs();
        loadSessions();
    }, [loadDocs, loadSessions]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const selectableDocs = libraryDocs.filter((d) => d.pythonDocumentId);

    const filteredDocs = selectableDocs.filter((doc) => {
        const q = docSearch.trim().toLowerCase();
        if (q && !doc.originalFilename.toLowerCase().includes(q)) return false;
        if (docStatusFilter === "ready" && doc.status !== "ready") return false;
        if (docStatusFilter === "processing" && doc.status !== "processing" && doc.status !== "uploaded") return false;
        if (docStatusFilter === "failed" && doc.status !== "failed") return false;
        return true;
    });

    const unprocessedCount = libraryDocs.length - selectableDocs.length;

    const toggleDoc = (id: string) => {
        setSelectedDocIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const selectAllFiltered = () => {
        setSelectedDocIds(filteredDocs.map((d) => d.documentId));
    };

    const clearSelection = () => setSelectedDocIds([]);

    const startNewChat = () => {
        setSessionId(undefined);
        setMessages([WELCOME_MSG]);
        localStorage.removeItem(LAST_SESSION_KEY);
    };

    const loadSession = async (id: string) => {
        try {
            const data = await apiRequest(`/docs/chat/sessions/${id}`);
            const session = data?.data?.session;
            if (!session) return;

            setSessionId(session.id);
            localStorage.setItem(LAST_SESSION_KEY, session.id);

            const pythonIds: string[] = session.document_ids || [];
            if (pythonIds.length) {
                setChatScope("selected");
                const nodeIds = pythonIds
                    .map((pid) => pythonToNode.get(pid))
                    .filter(Boolean) as string[];
                setSelectedDocIds(nodeIds);
            } else {
                setChatScope("all");
                setSelectedDocIds([]);
            }

            const msgs = mapSessionMessages(session.messages || [], pythonToNode);
            setMessages(msgs.length ? msgs : [WELCOME_MSG]);
        } catch (e: any) {
            setMessages([
                {
                    id: `e_${Date.now()}`,
                    role: "assistant",
                    content: `Could not load chat: ${e.message || "unknown error"}`,
                },
            ]);
        }
    };

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this chat permanently?")) return;
        try {
            await apiRequest(`/docs/chat/sessions/${id}`, { method: "DELETE" });
            if (sessionId === id) startNewChat();
            await loadSessions();
        } catch {
            /* ignore */
        }
    };

    useEffect(() => {
        const last = localStorage.getItem(LAST_SESSION_KEY);
        if (last && libraryDocs.length) {
            loadSession(last);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [libraryDocs.length > 0]);

    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;
        if (chatScope === "selected" && !selectedDocIds.length && !isChitchatMessage(text)) {
            setMessages((m) => [
                ...m,
                {
                    id: `e_${Date.now()}`,
                    role: "assistant",
                    content: "Select at least one processed document in the scope panel before chatting.",
                },
            ]);
            return;
        }

        const userMsg: ChatMessage = {
            id: `u_${Date.now()}`,
            role: "user",
            content: text,
        };
        setMessages((m) => [...m, userMsg]);
        setInput("");
        setSending(true);

        try {
            const body: Record<string, unknown> = {
                message: text,
                chatScope,
                sessionId,
            };
            if (chatScope === "selected") body.documentIds = selectedDocIds;

            const data = await apiRequest("/docs/chat", {
                method: "POST",
                body: JSON.stringify(body),
            });
            if (data?.data?.sessionId) {
                setSessionId(data.data.sessionId);
                localStorage.setItem(LAST_SESSION_KEY, data.data.sessionId);
                loadSessions();
            }
            setMessages((m) => [
                ...m,
                {
                    id: `a_${Date.now()}`,
                    role: "assistant",
                    content: data?.data?.reply || "No response.",
                    citations: dedupeCitations(data?.data?.citations || []),
                },
            ]);
        } catch (e: any) {
            setMessages((m) => [
                ...m,
                {
                    id: `e_${Date.now()}`,
                    role: "assistant",
                    content: `Error: ${e.message || "Chat failed"}`,
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    const scopeLabel =
        chatScope === "all"
            ? `All documents (${libraryDocs.length})`
            : `Selected (${selectedDocIds.length} of ${selectableDocs.length})`;

    if (!canChat()) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className={`glass rounded-2xl max-w-md p-6 text-center space-y-2 ${colors.textPrimary}`}>
                    <p className="text-lg font-semibold">Chat not available</p>
                    <p className={`text-sm ${colors.textMuted}`}>
                        You do not have Chat permission. Ask your admin to enable it for your account.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 flex">
            {sidebarOpen && (
                <aside className={`w-80 shrink-0 border-r ${colors.borderPrimary} flex flex-col bg-black/10`}>
                    {/* Chat history */}
                    <div className={`px-4 py-3 border-b ${colors.borderPrimary}`}>
                        <div className="flex items-center justify-between gap-2">
                            <h2 className={`text-sm font-semibold ${colors.textPrimary}`}>Chats</h2>
                            <button
                                type="button"
                                onClick={startNewChat}
                                className="btn-gradient rounded-lg px-2.5 py-1.5 text-xs inline-flex items-center gap-1"
                            >
                                <Plus size={12} /> New chat
                            </button>
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto border-b border-white/5">
                        {sessionsLoading ? (
                            <p className={`px-4 py-3 text-xs ${colors.textMuted}`}>Loading chats…</p>
                        ) : sessions.length === 0 ? (
                            <p className={`px-4 py-3 text-xs ${colors.textMuted}`}>No past chats yet.</p>
                        ) : (
                            sessions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => loadSession(s.id)}
                                    className={`w-full flex items-start gap-2 px-4 py-2.5 text-left text-xs border-b border-white/5 ${
                                        sessionId === s.id ? "bg-purple-500/10" : colors.bgHover
                                    }`}
                                >
                                    <MessageSquare size={14} className="text-purple-400 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className={`${colors.textPrimary} line-clamp-2 font-medium`}>
                                            {s.title || "New Chat"}
                                        </p>
                                        <p className={`${colors.textMuted} mt-0.5`}>
                                            {s.updated_at || s.created_at
                                                ? new Date(s.updated_at || s.created_at!).toLocaleString()
                                                : ""}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => deleteSession(s.id, e)}
                                        className="btn-ghost p-1 text-red-300 shrink-0"
                                        aria-label="Delete chat"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Document scope */}
                    <div className={`px-4 py-3 border-b ${colors.borderPrimary}`}>
                        <h2 className={`text-sm font-semibold ${colors.textPrimary}`}>Document scope</h2>
                        <p className={`text-xs mt-0.5 ${colors.textMuted}`}>{scopeLabel}</p>
                    </div>
                    <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                                type="radio"
                                name="chatScope"
                                checked={chatScope === "all"}
                                onChange={() => setChatScope("all")}
                                className="accent-purple-500"
                            />
                            <span className={colors.textPrimary}>All documents</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                                type="radio"
                                name="chatScope"
                                checked={chatScope === "selected"}
                                onChange={() => setChatScope("selected")}
                                className="accent-purple-500"
                            />
                            <span className={colors.textPrimary}>Selected only</span>
                        </label>

                        {chatScope === "selected" && (
                            <div className="space-y-2 pt-1">
                                <div className="relative">
                                    <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${colors.textMuted}`} />
                                    <input
                                        value={docSearch}
                                        onChange={(e) => setDocSearch(e.target.value)}
                                        placeholder="Search filename…"
                                        className="w-full premium-input rounded-lg py-2 pl-8 pr-3 text-xs"
                                    />
                                </div>
                                <select
                                    value={docStatusFilter}
                                    onChange={(e) => setDocStatusFilter(e.target.value as DocStatusFilter)}
                                    className="w-full premium-input rounded-lg py-2 px-3 text-xs"
                                >
                                    <option value="">All statuses</option>
                                    <option value="ready">Ready</option>
                                    <option value="processing">Processing</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <div className="flex gap-2">
                                    <button type="button" onClick={selectAllFiltered} className="btn-secondary rounded-lg px-2 py-1 text-[10px] flex-1">
                                        Select all ({filteredDocs.length})
                                    </button>
                                    <button type="button" onClick={clearSelection} className="btn-ghost rounded-lg px-2 py-1 text-[10px] flex-1">
                                        Clear
                                    </button>
                                </div>
                                <p className={`text-[10px] ${colors.textMuted}`}>
                                    {selectedDocIds.length} of {filteredDocs.length} shown selected
                                </p>
                                {filteredDocs.length === 0 ? (
                                    <p className={`text-xs ${colors.textMuted}`}>
                                        No matching processed documents.
                                    </p>
                                ) : (
                                    filteredDocs.map((doc) => {
                                        const checked = selectedDocIds.includes(doc.documentId);
                                        return (
                                            <button
                                                key={doc.documentId}
                                                type="button"
                                                onClick={() => toggleDoc(doc.documentId)}
                                                className={`w-full flex items-start gap-2 rounded-lg px-2 py-2 text-left text-xs ${colors.bgHover}`}
                                            >
                                                {checked ? (
                                                    <CheckSquare size={14} className="text-purple-400 shrink-0 mt-0.5" />
                                                ) : (
                                                    <Square size={14} className={`${colors.textMuted} shrink-0 mt-0.5`} />
                                                )}
                                                <span className={`${colors.textSecondary} line-clamp-2`}>
                                                    {doc.originalFilename}
                                                    <span className={`block text-[10px] ${colors.textMuted}`}>{doc.status}</span>
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                                {unprocessedCount > 0 && (
                                    <p className={`text-[10px] ${colors.textMuted} pt-1`}>
                                        {unprocessedCount} document(s) not yet processed by AI are hidden.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </aside>
            )}

            <div className="flex-1 min-w-0 flex flex-col max-w-4xl mx-auto w-full">
                <div className={`px-6 lg:px-8 py-5 border-b ${colors.borderPrimary} shrink-0 flex items-center gap-3`}>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((o) => !o)}
                        className="btn-ghost rounded-lg p-2"
                        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    >
                        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            isDark ? "bg-purple-500/15 text-purple-300" : "bg-purple-100 text-purple-700"
                        }`}
                    >
                        <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className={`text-xl font-bold ${colors.textPrimary}`}>AI Chat</h1>
                        <p className={`text-sm ${colors.textMuted} truncate`}>{scopeLabel}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                    msg.role === "user"
                                        ? "btn-gradient shadow-lg"
                                        : `glass ${colors.textPrimary}`
                                }`}
                            >
                                {msg.role === "assistant" ? (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        {msg.citations && msg.citations.length > 0 && (
                                            <div className={`mt-3 pt-3 border-t ${colors.borderPrimary} not-prose`}>
                                                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${colors.textMuted}`}>
                                                    Sources
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {msg.citations.map((c, i) => (
                                                        <span
                                                            key={`${c.documentId || c.filename}-${i}`}
                                                            className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border ${
                                                                isDark
                                                                    ? "bg-white/5 border-white/10 text-slate-200"
                                                                    : "bg-slate-100 border-slate-200 text-slate-700"
                                                            }`}
                                                            title={c.filename || c.documentId}
                                                        >
                                                            <FileText size={11} className="shrink-0 opacity-70" />
                                                            <span className="truncate max-w-[180px]">{c.filename || c.documentId}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                <div className={`px-6 lg:px-8 py-5 border-t ${colors.borderPrimary} shrink-0 bg-black/20`}>
                    <ChatComposer
                        value={input}
                        onChange={setInput}
                        onSend={send}
                        sending={sending}
                        placeholder={
                            chatScope === "selected" && !selectedDocIds.length
                                ? "Select documents in the scope panel…"
                                : "Ask about your documents…"
                        }
                    />
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <ClientLayout>
            <ChatContent />
        </ClientLayout>
    );
}
