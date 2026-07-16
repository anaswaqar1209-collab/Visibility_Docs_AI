"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, RefreshCw, UserCheck, UserX } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";
import { useTheme } from "@/context/ColorContext";
import { apiRequest } from "@/lib/apiClient";

type Admin = { userId: string; fullName: string; email: string; status: string; organizationId?: string };

function AdminsContent() {
    const { theme } = useTheme();
    const colors = theme.colors;
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const data = await apiRequest("/docs/super-admin/admins");
            setAdmins(data?.data?.admins || []);
        } catch (e: any) {
            setError(e.message);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggleStatus = async (userId: string, status: string) => {
        const next = status === "active" ? "blocked" : "active";
        await apiRequest(`/docs/super-admin/admins/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
        await load();
    };

    return (
        <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${colors.textPrimary}`}>Admins</h1>
                    <p className={`text-sm ${colors.textMuted}`}>Manage company admins platform-wide</p>
                </div>
                <button type="button" onClick={load} className="btn-secondary rounded-xl px-4 py-2 text-sm"><RefreshCw size={14} className="inline mr-1" />Refresh</button>
            </div>
            {error && <div className="text-red-300 text-sm">{error}</div>}
            <div className="glass rounded-2xl overflow-hidden">
                <ul className="divide-y divide-white/5">
                    {admins.map((a) => (
                        <li key={a.userId} className="px-5 py-4 flex flex-wrap justify-between gap-3">
                            <div>
                                <p className={`font-semibold ${colors.textPrimary}`}>{a.fullName}</p>
                                <p className={`text-sm ${colors.textMuted}`}>{a.email} · org: {a.organizationId || "—"} · <span className={a.status === "active" ? "text-green-400" : "text-red-400"}>{a.status}</span></p>
                            </div>
                            <button type="button" onClick={() => toggleStatus(a.userId, a.status)} className="btn-secondary rounded-lg px-3 py-2 text-sm">
                                {a.status === "active" ? <><UserX size={14} className="inline" /> Deactivate</> : <><UserCheck size={14} className="inline" /> Activate</>}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default function AdminsPage() {
    return <ClientLayout><AdminsContent /></ClientLayout>;
}
