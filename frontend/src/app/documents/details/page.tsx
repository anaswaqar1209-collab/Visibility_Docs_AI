"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";
import DocumentDetailPanel, { hasModelData, isAnalysisFinished } from "@/components/DocumentDetailPanel";
import FilterSelect from "@/components/FilterSelect";
import { useTheme } from "@/context/ColorContext";
import { apiRequest } from "@/lib/apiClient";
import { AGENT_FILTER_OPTIONS, inferDocTypeFromFilename, resolveDocAgent } from "@/lib/documentAgents";
import { usePermissions } from "@/context/PermissionsContext";

type DocIntel = {
    document: {
        documentId: string;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
        status: string;
        storagePath?: string;
        pythonDocumentId?: string | null;
        aiProcessingStatus?: string | null;
        aiErrorMessage?: string | null;
        classification?: string | null;
        pageCount?: number;
        createdAt: string;
        metadata?: { cvScore?: number; phase3Agent?: string } | null;
    };
    aiDocument?: Record<string, unknown> | null;
    job?: Record<string, unknown> | null;
    validations?: unknown[];
};

function normalizeDocIntel(items: unknown[]): DocIntel[] {
    if (!Array.isArray(items)) return [];
    return items
        .map((item: unknown) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const nested = row.document as DocIntel["document"] | undefined;
            if (nested?.documentId) {
                return {
                    document: nested,
                    aiDocument: (row.aiDocument as Record<string, unknown> | null) ?? null,
                    job: (row.job as Record<string, unknown> | null) ?? null,
                    validations: (row.validations as unknown[]) ?? [],
                };
            }
            const flat = item as DocIntel["document"];
            if (flat?.documentId) {
                return {
                    document: flat,
                    aiDocument: null,
                    job: null,
                    validations: [],
                };
            }
            return null;
        })
        .filter((x): x is DocIntel => x !== null);
}

async function enrichDocuments(items: DocIntel[]): Promise<DocIntel[]> {
    if (!items.length) return items;
    return Promise.all(
        items.map(async (item) => {
            try {
                const intel = await apiRequest(`/docs/documents/${item.document.documentId}/intelligence`);
                return {
                    document: intel?.data?.document || item.document,
                    aiDocument: intel?.data?.aiDocument ?? item.aiDocument,
                    job: intel?.data?.job ?? item.job,
                    validations: intel?.data?.validations ?? item.validations,
                };
            } catch {
                return item;
            }
        })
    );
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function listStatusLabel(status: string) {
    if (status === "ready") return "processed";
    if (status === "uploaded") return "processing";
    return status;
}

function typeBadge(docType: string) {
    const t = docType.toLowerCase();
    if (t === "resume" || t === "cv") return "bg-cyan-500/15 text-cyan-300 border-cyan-500/25";
    if (t === "invoice") return "bg-blue-500/15 text-blue-300 border-blue-500/25";
    if (t === "contract") return "bg-purple-500/15 text-purple-300 border-purple-500/25";
    return "bg-slate-500/15 text-slate-300 border-slate-500/25";
}

function statusBadge(status: string) {
    const s = status.toLowerCase();
    if (s === "ready" || s === "processed") return "bg-green-500/15 text-green-300 border-green-500/25";
    if (s === "failed" || s === "error") return "bg-red-500/15 text-red-300 border-red-500/25";
    return "bg-amber-500/15 text-amber-300 border-amber-500/25";
}

function scoreBadge(score: number) {
    if (score >= 70) return "bg-green-500/15 text-green-300 border-green-500/25";
    if (score >= 40) return "bg-amber-500/15 text-amber-300 border-amber-500/25";
    return "bg-red-500/15 text-red-300 border-red-500/25";
}

function getDocType(item: DocIntel) {
    return String(
        item.aiDocument?.document_type ||
            item.document.classification ||
            inferDocTypeFromFilename(item.document.originalFilename) ||
            "unknown"
    );
}

function getCvScore(item: DocIntel) {
    const fromAi = item.aiDocument?.cv_score;
    if (fromAi != null) return Number(fromAi);
    if (item.document.metadata?.cvScore != null) return Number(item.document.metadata.cvScore);
    return null;
}

function getListStatus(item: DocIntel) {
    return listStatusLabel(String(item.aiDocument?.status || item.document.status));
}

function DetailsWorkspace() {
    const { theme } = useTheme();
    const colors = theme.colors;
    const isDark = theme.name === "dark";
    const router = useRouter();
    const { canViewDocs, canDeleteDocs } = usePermissions();
    const searchParams = useSearchParams();
    const docParam = searchParams.get("doc");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documents, setDocuments] = useState<DocIntel[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(docParam);
    const [search, setSearch] = useState("");
    const [agentFilter, setAgentFilter] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const attemptedRunRef = useRef<Set<string>>(new Set());

    const applyIntel = useCallback((id: string, data: Record<string, unknown>) => {
        setDocuments((prev) =>
            prev.map((item) =>
                item.document.documentId === id
                    ? {
                          document: (data.document as DocIntel["document"]) || item.document,
                          aiDocument: (data.aiDocument as Record<string, unknown> | null) ?? item.aiDocument,
                          job: (data.job as Record<string, unknown> | null) ?? item.job,
                          validations: (data.validations as unknown[]) ?? item.validations,
                      }
                    : item
            )
        );
    }, []);

    const fetchIntelligence = useCallback(
        async (id: string) => {
            const intel = await apiRequest(`/docs/documents/${id}/intelligence`);
            if (intel?.data) applyIntel(id, intel.data);
            return intel?.data;
        },
        [applyIntel]
    );

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPolling = useCallback(
        (id: string) => {
            stopPolling();
            let attempts = 0;
            pollRef.current = setInterval(async () => {
                attempts += 1;
                try {
                    const data = await fetchIntelligence(id);
                    const ai = data?.aiDocument as Record<string, unknown> | null;
                    const job = data?.job as Record<string, unknown> | null;
                    const docStatus = (data?.document as { status?: string } | undefined)?.status;
                    if (hasModelData(ai) || isAnalysisFinished(ai, job, docStatus)) {
                        stopPolling();
                        setAnalyzing(false);
                    } else if (attempts >= 60) {
                        stopPolling();
                        setAnalyzing(false);
                    }
                } catch {
                    if (attempts >= 60) {
                        stopPolling();
                        setAnalyzing(false);
                    }
                }
            }, 3000);
        },
        [fetchIntelligence, stopPolling]
    );

    const runModelIfNeeded = useCallback(
        async (id: string, ai?: Record<string, unknown> | null, job?: Record<string, unknown> | null, docStatus?: string) => {
            if (hasModelData(ai) || isAnalysisFinished(ai, job, docStatus)) return false;
            if (attemptedRunRef.current.has(id)) return false;
            attemptedRunRef.current.add(id);
            setAnalyzing(true);
            try {
                await apiRequest(`/docs/documents/${id}/processing?runModel=true`);
            } catch {
                /* processing endpoint may still have triggered */
            }
            startPolling(id);
            return true;
        },
        [startPolling]
    );

    const load = useCallback(async () => {
        setError(null);
        try {
            let result: DocIntel[] = [];

            try {
                const intel = await apiRequest("/docs/documents/intelligence/all");
                result = normalizeDocIntel(intel?.data?.documents || []);
            } catch {
                /* fallback below */
            }

            if (!result.length) {
                try {
                    const withIntel = await apiRequest("/docs/documents?withIntel=true&limit=100");
                    result = normalizeDocIntel(withIntel?.data?.documents || []);
                } catch {
                    /* fallback below */
                }
            }

            if (!result.length) {
                const list = await apiRequest("/docs/documents?limit=100&page=1");
                const base = normalizeDocIntel(list?.data?.documents || []);
                result = await enrichDocuments(base);
            } else if (result.some((d) => !d.aiDocument)) {
                result = await enrichDocuments(result);
            }

            setDocuments(result);
        } catch (e: any) {
            setError(e.message || "Failed to load documents");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        return () => stopPolling();
    }, [load, stopPolling]);

    const hasProcessing = documents.some(
        (d) => d.document.status === "processing" || d.document.status === "uploaded"
    );

    useEffect(() => {
        if (!hasProcessing && !analyzing) return;
        const interval = setInterval(load, 4000);
        return () => clearInterval(interval);
    }, [hasProcessing, analyzing, load]);

    useEffect(() => {
        if (docParam) setSelectedId(docParam);
    }, [docParam]);

    const filtered = useMemo(() => {
        return documents
            .filter((item) => {
                const name = item.document.originalFilename.toLowerCase();
                const matchSearch = !search || name.includes(search.toLowerCase());
                const agent = resolveDocAgent({
                    phase3_agent: item.aiDocument?.phase3_agent as string,
                    document_type: getDocType(item),
                    classification: item.document.classification,
                    metadata: item.document.metadata,
                });
                const matchAgent = !agentFilter || agent === agentFilter;
                return matchSearch && matchAgent;
            })
            .sort((a, b) => {
                const aResume = getDocType(a) === "resume";
                const bResume = getDocType(b) === "resume";
                if (aResume && bResume) return (getCvScore(b) || 0) - (getCvScore(a) || 0);
                if (aResume) return -1;
                if (bResume) return 1;
                return new Date(b.document.createdAt).getTime() - new Date(a.document.createdAt).getTime();
            });
    }, [documents, search, agentFilter]);

    useEffect(() => {
        if (!filtered.length) return;
        if (selectedId && filtered.some((d) => d.document.documentId === selectedId)) return;
        setSelectedId(filtered[0].document.documentId);
    }, [filtered, selectedId]);

    const selected = filtered.find((d) => d.document.documentId === selectedId) || null;

    const selectDoc = useCallback(
        async (id: string) => {
            setSelectedId(id);
            router.replace(`/documents/details?doc=${id}`, { scroll: false });
            stopPolling();
            setAnalyzing(false);

            try {
                const data = await fetchIntelligence(id);
                const ai = data?.aiDocument as Record<string, unknown> | null;
                const job = data?.job as Record<string, unknown> | null;
                const docStatus = (data?.document as { status?: string } | undefined)?.status;
                if (!hasModelData(ai) && !isAnalysisFinished(ai, job, docStatus)) {
                    const started = await runModelIfNeeded(id, ai, job, docStatus);
                    if (started) return;
                }
                if (hasModelData(ai)) return;
                const jobStage = String(job?.stage || "").toLowerCase();
                const jobStatus = String(job?.status || "").toLowerCase();
                const stillRunning =
                    ["running", "queued"].includes(jobStatus) ||
                    ["ocr_processing", "classifying", "extracting", "embedding", "queued"].includes(jobStage);
                if (stillRunning) {
                    setAnalyzing(true);
                    startPolling(id);
                }
            } catch {
                /* keep cached */
            }
        },
        [router, fetchIntelligence, runModelIfNeeded, stopPolling, startPolling]
    );

    useEffect(() => {
        if (!docParam || loading) return;
        const item = documents.find((d) => d.document.documentId === docParam);
        if (!item) return;
        if (hasModelData(item.aiDocument) || isAnalysisFinished(item.aiDocument, item.job, item.document.status)) return;
        if (attemptedRunRef.current.has(docParam)) return;
        runModelIfNeeded(docParam, item.aiDocument, item.job, item.document.status);
    }, [docParam, loading, documents, runModelIfNeeded]);

    const handleDelete = async () => {
        if (!selected) return;
        if (!confirm("Delete this document?")) return;
        stopPolling();
        await apiRequest(`/docs/documents/${selected.document.documentId}`, { method: "DELETE" });
        setDocuments((prev) => prev.filter((d) => d.document.documentId !== selected.document.documentId));
        setSelectedId(null);
        router.replace("/documents/details", { scroll: false });
    };

    if (!canViewDocs()) {
        return (
            <div className="fixed inset-y-0 right-0 left-64 flex items-center justify-center z-0 p-8">
                <div className={`glass rounded-2xl max-w-md p-6 text-center space-y-2 ${colors.textPrimary}`}>
                    <p className="text-lg font-semibold">View not available</p>
                    <p className={`text-sm ${colors.textMuted}`}>
                        You do not have View permission. Ask your admin to enable document access.
                    </p>
                    <Link href="/documents" className="inline-block mt-2 text-sm text-purple-300 hover:underline">
                        Back to documents
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-y-0 right-0 left-64 flex overflow-hidden z-0 bg-inherit">
            <div className={`w-[min(100%,420px)] shrink-0 flex flex-col border-r ${colors.borderPrimary} ${isDark ? "bg-black/20" : "bg-white/80"}`}>
                <div className="p-4 space-y-3 border-b border-white/5">
                    <Link href="/documents" className={`inline-flex items-center gap-2 text-xs ${colors.textMuted} hover:text-white`}>
                        <ArrowLeft size={12} /> Back to upload
                    </Link>
                    <h1 className={`text-lg font-bold ${colors.textPrimary}`}>Document details</h1>
                    <div className="relative">
                        <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${colors.textMuted}`} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search documents..."
                            className="w-full premium-input rounded-xl py-2.5 pl-9 pr-3 text-sm"
                        />
                    </div>
                    <FilterSelect
                        label="Agent"
                        value={agentFilter}
                        onChange={setAgentFilter}
                        options={AGENT_FILTER_OPTIONS}
                        minWidth="w-full"
                    />
                    {(hasProcessing || analyzing) && (
                        <p className={`text-[11px] flex items-center gap-1.5 ${colors.textMuted}`}>
                            <Loader2 size={11} className="animate-spin text-amber-400" />
                            {analyzing ? "AI model running…" : "Auto-refreshing while processing…"}
                        </p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                    {loading &&
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                        ))}

                    {!loading && filtered.length === 0 && (
                        <div className={`text-center py-12 ${colors.textMuted}`}>
                            <p className="text-3xl mb-2">📄</p>
                            <p className="text-sm font-medium">
                                {documents.length === 0 ? "No documents yet" : "No documents match your filters"}
                            </p>
                            <p className="text-xs mt-1">
                                {documents.length === 0 ? (
                                    <>
                                        Upload files on the{" "}
                                        <Link href="/documents" className="text-blue-400 hover:underline">
                                            Documents page
                                        </Link>
                                    </>
                                ) : (
                                    "Try clearing search or agent filter"
                                )}
                            </p>
                            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
                        </div>
                    )}

                    {filtered.map((item) => {
                        const doc = item.document;
                        const docType = getDocType(item);
                        const cvScore = getCvScore(item);
                        const st = getListStatus(item);
                        const isSelected = selectedId === doc.documentId;
                        const isProcessing =
                            (doc.status === "processing" || doc.status === "uploaded" || (isSelected && analyzing)) &&
                            !isAnalysisFinished(item.aiDocument, item.job, doc.status);

                        return (
                            <button
                                key={doc.documentId}
                                type="button"
                                onClick={() => {
                                    attemptedRunRef.current.delete(doc.documentId);
                                    selectDoc(doc.documentId);
                                }}
                                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
                                    isSelected
                                        ? "border-indigo-400/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                                        : `${colors.borderPrimary} hover:border-white/20 hover:bg-white/5`
                                }`}
                            >
                                <p className={`font-semibold text-sm truncate ${colors.textPrimary}`}>
                                    {doc.originalFilename}
                                </p>
                                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeBadge(docType)}`}>
                                        {docType}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge(st)}`}>
                                        {isProcessing && <Loader2 size={9} className="animate-spin" />}
                                        {isProcessing ? "processing" : st}
                                    </span>
                                    {docType === "resume" && cvScore != null && (
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${scoreBadge(cvScore)}`}>
                                            Score: {cvScore}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-[11px] mt-1.5 ${colors.textMuted}`}>{timeAgo(doc.createdAt)}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={`flex-1 min-w-0 overflow-y-auto ${isDark ? "bg-black/10" : "bg-slate-50"}`}>
                {error && <div className="p-4 text-red-400 text-sm">{error}</div>}

                {!selected && !loading && (
                    <div className={`h-full flex items-center justify-center ${colors.textMuted}`}>
                        <div className="text-center">
                            <p className="text-5xl mb-4">📋</p>
                            <p className={`text-lg font-medium ${colors.textPrimary}`}>Select a document to view details</p>
                        </div>
                    </div>
                )}

                {selected && (
                    <div className="p-6">
                        <DocumentDetailPanel
                            doc={selected.document}
                            ai={selected.aiDocument}
                            isDark={isDark}
                            colors={colors}
                            onDelete={handleDelete}
                            showDelete={canDeleteDocs()}
                            analyzing={analyzing && !isAnalysisFinished(selected.aiDocument, selected.job, selected.document.status)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AllFilesDetailsPage() {
    return (
        <ClientLayout>
            <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-slate-400">Loading…</div>}>
                <DetailsWorkspace />
            </Suspense>
        </ClientLayout>
    );
}
