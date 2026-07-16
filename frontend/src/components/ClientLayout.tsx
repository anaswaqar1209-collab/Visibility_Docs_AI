"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { ToastProvider } from "./Toast";
import { ColorProvider, useTheme } from "@/context/ColorContext";
import { PermissionsProvider, usePermissions } from "@/context/PermissionsContext";
import { clearAuthState, hasValidAccessToken, canRefreshSession, getAuthValue } from "@/lib/authSession";

function Shell({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const router = useRouter();
    const pathname = usePathname();
    const { ready, reload } = usePermissions();

    useEffect(() => {
        const token = getAuthValue("accessToken") || getAuthValue("token");
        if (!token || (!hasValidAccessToken() && !canRefreshSession())) {
            clearAuthState();
            router.replace("/login");
        }
    }, [router]);

    // Pick up permission changes when team member navigates (admin may have updated them)
    useEffect(() => {
        if (ready) reload();
    }, [pathname, ready, reload]);

    if (!ready) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${colors.bgPrimary} ${colors.textMuted}`}>
                Loading workspace…
            </div>
        );
    }

    return (
        <div className={`h-screen flex overflow-hidden ${colors.bgPrimary} ${colors.textPrimary}`}>
            <Sidebar />
            <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">{children}</main>
        </div>
    );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <ColorProvider>
            <ToastProvider>
                <PermissionsProvider>
                    <Shell>{children}</Shell>
                </PermissionsProvider>
            </ToastProvider>
        </ColorProvider>
    );
}
