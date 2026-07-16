"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { FileText, MessageSquare, LogOut, Moon, Sun, Users, Shield, FolderOpen } from "lucide-react";
import { useTheme } from "@/context/ColorContext";
import { usePermissions } from "@/context/PermissionsContext";
import { clearAuthState, getStoredUser } from "@/lib/authSession";
import SiteLogo from "@/assets/Logo/Logo Visibility Live_pixian_ai.png";

type StoredUser = {
    fullName?: string;
    email?: string;
    username?: string;
    role?: string;
};

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const colors = theme.colors;
    const isDark = theme.name === "dark";
    const user = getStoredUser<StoredUser>();
    const { role: permRole, canChat, canUpload, canViewDocs } = usePermissions();
    const role = permRole || user?.role || "team";

    const nav: {
        href: string;
        label: string;
        icon: React.ElementType;
        roles: string[];
        allow?: () => boolean;
    }[] = [
        {
            href: "/documents",
            label: "Documents",
            icon: FileText,
            roles: ["superAdmin", "admin", "team", "service_account"],
            allow: () => canViewDocs() || canUpload() || role === "admin" || role === "superAdmin",
        },
        {
            href: "/chat",
            label: "AI Chat",
            icon: MessageSquare,
            roles: ["superAdmin", "admin", "team", "service_account"],
            allow: () => canChat(),
        },
        { href: "/team", label: "Team", icon: Users, roles: ["admin"] },
        { href: "/admin/admins", label: "Admins", icon: Shield, roles: ["superAdmin"] },
        { href: "/admin/documents", label: "All Documents", icon: FolderOpen, roles: ["superAdmin"] },
    ];

    const visibleNav = nav.filter((n) => n.roles.includes(role) && (n.allow ? n.allow() : true));

    const logout = () => {
        clearAuthState();
        router.replace("/login");
    };

    return (
        <aside className={`w-64 shrink-0 h-full border-r ${colors.borderPrimary} ${colors.bgSidebar} flex flex-col overflow-hidden`}>
            <div className={`px-5 py-5 border-b ${colors.borderPrimary}`}>
                <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2 ${isDark ? "bg-white/95" : "bg-white border border-slate-200"}`}>
                        <Image src={SiteLogo} alt="Visibility" className="h-8 w-auto" priority />
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${colors.textPrimary}`}>Docs AI</p>
                        <p className={`text-[10px] uppercase tracking-wider ${colors.textMuted}`}>Visibility Bots</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {visibleNav.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname?.startsWith(`${href}/`);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                active ? colors.sidebarItemActive : colors.sidebarItemInactive
                            }`}
                        >
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                                active ? colors.sidebarIconBgActive : colors.sidebarIconBgInactive
                            }`}>
                                <Icon size={16} />
                            </span>
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className={`px-3 py-4 border-t ${colors.borderPrimary} space-y-2`}>
                <button type="button" onClick={toggleTheme} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${colors.sidebarItemInactive}`}>
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    {isDark ? "Light mode" : "Dark mode"}
                </button>
                <div className={`px-3 py-2 text-xs ${colors.textMuted}`}>
                    <p className={`font-semibold ${colors.textSecondary} truncate`}>{user?.fullName || user?.username}</p>
                    <p className="truncate">{user?.email}</p>
                    <p className="mt-1 uppercase tracking-wider text-[10px]">{role}</p>
                </div>
                <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10">
                    <LogOut size={16} />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
