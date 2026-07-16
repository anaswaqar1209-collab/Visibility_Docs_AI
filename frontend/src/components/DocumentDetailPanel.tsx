"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Loader2, Star, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/apiClient";
import { inferDocTypeFromFilename } from "@/lib/documentAgents";
import {
    appendAuthToken,
    getDocumentAiImageUrl,
    getDocumentDownloadUrl,
} from "@/lib/documents";

type DocRecord = {
    documentId: string;
    originalFilename: string;
    mimeType?: string;
    sizeBytes: number;
    status: string;
    storagePath?: string;
    pythonDocumentId?: string | null;
    classification?: string | null;
    pageCount?: number;
    createdAt: string;
    metadata?: { cvScore?: number; phase3Agent?: string } | null;
};

type SimilarDoc = {
    document_id: string;
    document_title?: string;
    score: number;
};

type ExtractedImage = {
    page?: number;
    image_path?: string;
    description?: string;
};

function formatBytes(n: number) {
    if (!n) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function scoreColor(score: number) {
    if (score >= 70) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
    if (score >= 40) return "bg-amber-500/15 text-amber-300 border-amber-500/25";
    return "bg-red-500/15 text-red-300 border-red-500/25";
}

function barColor(pct: number) {
    if (pct >= 70) return "bg-emerald-500";
    if (pct >= 40) return "bg-amber-500";
    return "bg-red-500";
}

function statusBadgeClass(status: string) {
    const s = status.toLowerCase();
    if (s === "ready" || s === "processed") return "bg-green-500/15 text-green-300 border-green-500/25";
    if (s === "failed" || s === "error") return "bg-red-500/15 text-red-300 border-red-500/25";
    if (s === "processing" || s === "uploaded") return "bg-amber-500/15 text-amber-300 border-amber-500/25";
    return "bg-slate-500/15 text-slate-300 border-slate-500/25";
}

function typeBadgeClass(docType: string) {
    const t = docType.toLowerCase();
    if (t === "resume" || t === "cv") return "bg-cyan-500/15 text-cyan-300 border-cyan-500/25";
    if (t === "invoice") return "bg-blue-500/15 text-blue-300 border-blue-500/25";
    if (t === "contract") return "bg-purple-500/15 text-purple-300 border-purple-500/25";
    return "bg-slate-500/15 text-slate-300 border-slate-500/25";
}

function statusLabel(status: string) {
    if (status === "ready") return "processed";
    if (status === "uploaded") return "processing";
    return status;
}

function hasModelData(ai?: Record<string, unknown> | null) {
    if (!ai) return false;
    if (ai.cv_score != null) return true;
    if (ai.cv_extraction_data && typeof ai.cv_extraction_data === "object") return true;
    if (ai.extracted_data && typeof ai.extracted_data === "object" && Object.keys(ai.extracted_data as object).length) return true;
    if (typeof ai.raw_text === "string" && ai.raw_text.length > 50) return true;
    return false;
}

function isAnalysisFinished(
    ai?: Record<string, unknown> | null,
    job?: Record<string, unknown> | null,
    docStatus?: string
) {
    const aiStatus = String(ai?.status || "").toLowerCase();
    if (["processed", "ready", "completed", "failed", "error"].includes(aiStatus)) return true;
    if (docStatus === "ready" || docStatus === "failed") return true;
    const jobStatus = String(job?.status || "").toLowerCase();
    const jobStage = String(job?.stage || "").toLowerCase();
    if (jobStatus === "completed" || jobStatus === "failed") return true;
    if (jobStage === "completed") return true;
    return false;
}

export default function DocumentDetailPanel({
    doc,
    ai,
    isDark,
    colors,
    onDelete,
    showDelete = false,
    analyzing = false,
}: {
    doc: DocRecord;
    ai?: Record<string, unknown> | null;
    isDark: boolean;
    colors: { textMuted: string; textPrimary: string };
    onDelete?: () => void;
    showDelete?: boolean;
    analyzing?: boolean;
}) {
    const [similar, setSimilar] = useState<SimilarDoc[]>([]);
    const [images, setImages] = useState<ExtractedImage[]>([]);
    const [descFileUrl, setDescFileUrl] = useState("");

    const inferredType = inferDocTypeFromFilename(doc.originalFilename);
    const docType = String(ai?.document_type || doc.classification || inferredType || "unknown");
    const cvScore = Number(ai?.cv_score ?? doc.metadata?.cvScore ?? NaN);
    const cvData = (ai?.cv_extraction_data || null) as Record<string, unknown> | null;
    const rawText = typeof ai?.raw_text === "string" ? ai.raw_text : "";
    const extracted = (ai?.extracted_data || null) as Record<string, unknown> | null;
    const pageCount = ai?.page_count ?? doc.pageCount;
    const fileSize = ai?.file_size ? Number(ai.file_size) : doc.sizeBytes;
    const displayStatus = statusLabel(String(ai?.status || doc.status));
    const finished = isAnalysisFinished(ai, undefined, doc.status);
    const isProcessing = analyzing && !finished && (displayStatus === "processing" || doc.status === "processing");
    const showCv = docType === "resume" || inferredType === "resume";

    useEffect(() => {
        if (!doc.documentId || !hasModelData(ai)) return;
        apiRequest(`/docs/documents/${doc.documentId}/similar?limit=5`)
            .then((d) => setSimilar(d?.data?.results || []))
            .catch(() => setSimilar([]));
        apiRequest(`/docs/documents/${doc.documentId}/images`)
            .then((d) => {
                setImages(d?.data?.images || []);
                setDescFileUrl(d?.data?.descriptions_file || "");
            })
            .catch(() => {
                setImages([]);
                setDescFileUrl("");
            });
    }, [doc.documentId, ai]);

    const cardClass = isDark ? "glass rounded-xl border border-white/10" : "bg-slate-50 border border-slate-200 rounded-xl";

    return (
        <div className="space-y-5 max-w-2xl">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className={`text-2xl font-bold ${colors.textPrimary}`}>{doc.originalFilename}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeBadgeClass(docType)}`}>
                            {docType}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeClass(displayStatus)}`}>
                            {isProcessing && <Loader2 size={10} className="animate-spin" />}
                            {isProcessing ? "processing" : displayStatus}
                        </span>
                        {showCv && !Number.isNaN(cvScore) && (
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${scoreColor(cvScore)}`}>
                                Score: {cvScore}
                            </span>
                        )}
                    </div>
                </div>
                {showDelete && onDelete && (
                    <button type="button" onClick={onDelete} className="btn-ghost rounded-lg px-2 py-2 text-red-300 hover:bg-red-500/10" title="Delete">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {isProcessing && (
                <div className="glass rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-200 border border-amber-500/20">
                    <Loader2 size={16} className="animate-spin" />
                    AI model is analyzing this document…
                </div>
            )}

            {finished && !hasModelData(ai) && !isProcessing && (
                <div className="glass rounded-xl px-4 py-3 text-sm text-slate-300 border border-white/10">
                    Analysis finished but scores are not available yet. Try re-opening this document in a moment.
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                {[
                    ["File", doc.originalFilename],
                    ["Pages", pageCount ?? "—"],
                    ["Size", formatBytes(Number(fileSize))],
                    ["Created", doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"],
                ].map(([label, value]) => (
                    <div key={label} className={`p-4 ${cardClass}`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${colors.textMuted}`}>{label}</p>
                        <p className={`text-sm font-semibold mt-1 truncate ${colors.textPrimary}`}>{value}</p>
                    </div>
                ))}
            </div>

            <a href={getDocumentDownloadUrl(doc.documentId)} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm">
                <Download size={14} /> Open File
            </a>

            {rawText && (
                <details className={`${cardClass} overflow-hidden`}>
                    <summary className={`px-4 py-3 text-sm font-semibold cursor-pointer ${colors.textPrimary}`}>
                        OCR Preview ({rawText.length.toLocaleString()} chars)
                        {descFileUrl && (
                            <a
                                href={appendAuthToken(descFileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-3 text-xs text-blue-400 hover:underline"
                            >
                                Download All Descriptions
                            </a>
                        )}
                    </summary>
                    <div className={`max-h-96 overflow-y-auto p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap ${colors.textMuted}`}>
                        {rawText.slice(0, 10000)}
                        {rawText.length > 10000 && "…"}
                    </div>
                </details>
            )}

            {images.length > 0 && (
                <details className={`${cardClass} overflow-hidden`}>
                    <summary className={`px-4 py-3 text-sm font-semibold cursor-pointer ${colors.textPrimary}`}>
                        Image Previews ({images.length})
                    </summary>
                    <div className="divide-y divide-white/5">
                        {images.map((img, i) => (
                            <div key={i} className="p-4">
                                <p className={`text-xs font-medium mb-2 ${colors.textMuted}`}>Page {img.page ?? i + 1}</p>
                                {img.image_path && (
                                    <img
                                        src={getDocumentAiImageUrl(doc.documentId, img.image_path)}
                                        alt={`Page ${img.page ?? i + 1}`}
                                        className="max-h-48 rounded-lg border border-white/10 mb-2 object-contain bg-black/20"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {showCv && cvData && (
                <div className={`${cardClass} overflow-hidden`}>
                    <div className={`px-4 py-3 flex items-center gap-2 border-b border-white/10 ${colors.textPrimary}`}>
                        <Star size={14} className="text-amber-400" />
                        <span className="text-sm font-semibold">CV Evaluation</span>
                        {!Number.isNaN(cvScore) && (
                            <span className={`ml-auto inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${scoreColor(cvScore)}`}>
                                Score: {cvScore}/100
                            </span>
                        )}
                    </div>
                    <div className="p-4 space-y-3">
                        {(["skills_score", "experience_score", "education_score", "completeness_score"] as const).map((key) => {
                            const val = cvData[key];
                            if (val == null) return null;
                            const pct = Math.min(100, Math.max(0, Number(val)));
                            return (
                                <div key={key}>
                                    <div className={`flex justify-between text-xs mb-1 ${colors.textMuted}`}>
                                        <span className="capitalize">{key.replace(/_score$/, "")} Score</span>
                                        <span>{pct}/100</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}

                        {Array.isArray(cvData.strengths) && cvData.strengths.length > 0 && (
                            <div>
                                <p className={`text-xs font-semibold mb-1.5 ${colors.textPrimary}`}>Strengths</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {(cvData.strengths as string[]).map((s, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {Array.isArray(cvData.areas_for_improvement) && cvData.areas_for_improvement.length > 0 && (
                            <div>
                                <p className={`text-xs font-semibold mb-1.5 ${colors.textPrimary}`}>Areas for Improvement</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {(cvData.areas_for_improvement as string[]).map((a, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-xs border border-amber-500/20">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {typeof cvData.recommendation === "string" && cvData.recommendation && (
                            <div>
                                <p className={`text-xs font-semibold mb-1 ${colors.textPrimary}`}>Recommendation</p>
                                <p className={`text-sm rounded-lg p-3 glass border border-white/10 ${colors.textPrimary}`}>{cvData.recommendation}</p>
                            </div>
                        )}

                        {typeof cvData.evaluation_summary === "string" && cvData.evaluation_summary && (
                            <div>
                                <p className={`text-xs font-semibold mb-1 ${colors.textPrimary}`}>Evaluation Summary</p>
                                <p className={`text-sm rounded-lg p-3 glass border border-white/10 ${colors.textMuted}`}>{cvData.evaluation_summary}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {extracted && Object.keys(extracted).length > 0 && !showCv && (
                <div className={`${cardClass} p-4`}>
                    <p className={`text-xs font-semibold mb-2 ${colors.textPrimary}`}>Extracted Data</p>
                    <pre className={`text-xs overflow-x-auto max-h-48 ${colors.textMuted}`}>{JSON.stringify(extracted, null, 2)}</pre>
                </div>
            )}

            {similar.length > 0 && (
                <div>
                    <p className={`text-sm font-semibold mb-2 ${colors.textPrimary}`}>Similar Documents</p>
                    <div className="space-y-2">
                        {similar.slice(0, 5).map((s, i) => (
                            <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 glass border border-white/10`}>
                                <span className={`text-sm truncate ${colors.textPrimary}`}>{s.document_title || s.document_id?.slice(0, 12)}</span>
                                <span className={`text-xs ml-2 ${colors.textMuted}`}>{(s.score * 100).toFixed(0)}% match</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Link href={`/documents/${doc.documentId}`} className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs">
                <ExternalLink size={12} /> Preview file
            </Link>
        </div>
    );
}

export { hasModelData, isAnalysisFinished };
