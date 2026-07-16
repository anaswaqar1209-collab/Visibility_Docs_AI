"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/context/ColorContext";
import SiteLogo from "@/assets/Logo/Logo Visibility Live_pixian_ai.png";

interface AuthLayoutProps {
    children: React.ReactNode;
    onBack?: () => void;
    showBack?: boolean;
    wide?: boolean;
}

export default function AuthLayout({ children, onBack, showBack = false, wide = false }: AuthLayoutProps) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const isDark = theme.name === "dark";

    return (
        <div className={`auth-theme ${isDark ? "auth-theme-dark" : "auth-theme-light"} min-h-screen w-full flex flex-col p-4 sm:p-6 lg:p-8 relative overflow-x-hidden overflow-y-auto ${isDark ? "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700" : colors.bgPrimary} ${colors.textPrimary}`}>
            {/* IoT Mesh Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <svg className="absolute w-full h-full" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="auth-grid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={isDark ? "#cbd5e1" : "#64748b"} stopOpacity={isDark ? "0.2" : "0.12"} />
                            <stop offset="100%" stopColor={isDark ? "#94a3b8" : "#475569"} stopOpacity={isDark ? "0.2" : "0.12"} />
                        </linearGradient>
                    </defs>
                    <path d="M0 0h800v600h-800z" fill="url(#auth-grid-gradient)" className="animate-[pulse_2s_ease-in-out_infinite]" />
                    <g className="animate-pulse">
                        <circle cx="200" cy="200" r="5" fill={isDark ? "#f3f4f6" : "#334155"} />
                        <circle cx="600" cy="400" r="5" fill={isDark ? "#f3f4f6" : "#334155"} />
                        <circle cx="400" cy="300" r="5" fill={isDark ? "#f3f4f6" : "#334155"} />
                        <circle cx="700" cy="200" r="5" fill={isDark ? "#f3f4f6" : "#334155"} />
                        <circle cx="100" cy="400" r="5" fill={isDark ? "#f3f4f6" : "#334155"} />
                        <path d="M200 200 L400 300" stroke={isDark ? "#f3f4f6" : "#334155"} strokeWidth="1" strokeOpacity="0.5" />
                        <path d="M400 300 L600 400" stroke={isDark ? "#f3f4f6" : "#334155"} strokeWidth="1" strokeOpacity="0.5" />
                        <path d="M400 300 L700 200" stroke={isDark ? "#f3f4f6" : "#334155"} strokeWidth="1" strokeOpacity="0.5" />
                        <path d="M400 300 L100 400" stroke={isDark ? "#f3f4f6" : "#334155"} strokeWidth="1" strokeOpacity="0.5" />
                    </g>
                    <circle cx="400" cy="300" r="150" stroke={isDark ? "#f3f4f6" : "#334155"} strokeWidth="1" strokeOpacity="0.25" fill="none" className="animate-pulse" />
                    <circle cx="400" cy="300" r="250" stroke={isDark ? "#f3f4f6" : "#334155"} strokeWidth="1" strokeOpacity="0.18" fill="none" className="animate-pulse" />
                </svg>
            </div>

            {/* Ambient Glow — Layered orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.08, 0.16, 0.08],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[180px] ${isDark ? "bg-blue-600/20" : "bg-blue-500/15"}`}
                />
                <motion.div
                    animate={{
                        scale: [1.1, 1, 1.1],
                        opacity: [0.05, 0.12, 0.05],
                    }}
                    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[160px] ${isDark ? "bg-purple-600/15" : "bg-purple-500/12"}`}
                />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.03, 0.08, 0.03],
                    }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full blur-[140px] ${isDark ? "bg-indigo-500/10" : "bg-indigo-400/10"}`}
                />
            </div>

            {/* Fine Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "48px 48px",
                }} />

            <div className={`w-full relative z-10 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] m-auto py-4 ${wide ? 'max-w-7xl' : 'max-w-lg'}`}>

                {/* Branded Header */}
                <div className="mb-5 text-center relative flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
                    >
                        <div className={`rounded-2xl p-3 border backdrop-blur-xl ${isDark
                                ? "bg-white/95 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                                : "bg-white border-slate-300/70 shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
                            }`}>
                            <Image
                                src={SiteLogo}
                                alt="Visibility Live"
                                className="h-12 w-auto"
                                priority
                            />
                        </div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className={`mt-2 text-[9px] font-bold uppercase tracking-[0.25em] ${colors.textMuted}`}
                    >
                        Visibility Docs AI
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className={`mt-1 text-xs ${isDark ? "text-blue-200" : colors.textMuted}`}
                    >
                        Understand • Search • Automate
                    </motion.p>

                    {showBack && (
                        <motion.button
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            onClick={onBack}
                            className={`absolute left-0 top-2 ${colors.textMuted} ${colors.groupHoverPrimary} transition-all group flex items-center gap-2`}
                        >
                            <div className="h-8 w-8 rounded-lg border border-white/8 flex items-center justify-center group-hover:border-white/20 group-hover:bg-white/5 transition-all duration-300">
                                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] hidden sm:block">Back</span>
                        </motion.button>
                    )}
                </div>

                {/* Main Content Area */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                    className={`p-4 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 backdrop-blur-xl ${isDark
                            ? "bg-white/10 border-white/20 shadow-[0_0_50px_rgba(209,213,219,0.15)]"
                            : "bg-white/85 border-slate-300/70 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                        } overflow-y-auto`}
                    suppressHydrationWarning
                >
                    {children}
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className={`mt-4 text-center ${colors.textMuted} font-semibold text-[8px] uppercase tracking-[0.3em]`}
                >
                    Visibility Bots &mdash; Industrial Intelligence Platform &copy; 2026
                </motion.div>
            </div>
        </div>
    );
}
