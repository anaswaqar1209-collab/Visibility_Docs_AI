"use client";

import React, { createContext, useContext, ReactNode } from "react";

type ThemeColors = {
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
  borderPrimary: string;
  [key: string]: string;
};

type Theme = {
  name: "dark" | "light";
  colors: ThemeColors;
};

type ColorContextValue = {
  theme: Theme;
};

const lightTheme: Theme = {
  name: "light",
  colors: {
    bgPrimary: "bg-[var(--canvas)]",
    bgSecondary: "bg-[var(--surface-2)]",
    bgAppBar: "bg-[var(--surface)]",
    bgSidebar: "bg-[var(--surface)]",
    bgCard: "bg-[var(--surface)]",
    bgHover: "hover:bg-[var(--accent-muted)]",
    bgActive: "bg-[var(--accent)]",
    bgButton: "bg-[var(--surface-2)]",
    bgButtonHover: "hover:bg-[var(--surface-3)]",
    bgNotification: "bg-[var(--surface)]",
    bgProfile: "bg-[var(--surface)]",
    bgDialog: "bg-[var(--surface)]",

    textPrimary: "text-[var(--foreground)]",
    textSecondary: "text-[var(--foreground-secondary)]",
    textMuted: "text-[var(--foreground-muted)]",
    textInactive: "text-[var(--foreground-muted)]",
    textActive: "text-white",

    borderPrimary: "border-[var(--border)]",
    borderSecondary: "border-[var(--border)]",
    borderLight: "border-[var(--border)]",
    borderHover: "hover:border-[var(--border-strong)]",
    borderActive: "border-[var(--accent)]",
    borderActive1: "border-[var(--border-strong)]",

    gradientPrimary: "from-teal-600 via-teal-700 to-teal-800",
    gradientSecondary: "from-white via-slate-50 to-white",
    gradientButton: "from-teal-500 via-teal-600 to-teal-700",

    iconPrimary: "text-[var(--foreground)]",
    iconSecondary: "text-[var(--foreground-muted)]",
    iconActive: "text-white",

    sidebarItemActive: "bg-gradient-to-r from-teal-50 to-cyan-50 text-[var(--accent)] border border-[rgba(13,148,136,0.25)] shadow-sm",
    sidebarItemInactive: "text-[var(--foreground-secondary)] hover:bg-slate-100 border border-transparent",
    sidebarIconBgActive: "bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm",
    sidebarIconBgInactive: "bg-teal-50 text-teal-700 border border-teal-100",

    bgDarkPanel: "bg-[var(--surface)]",
    bgDarkPanelHover: "hover:bg-[var(--surface-2)]",
    bgGlassDark: "from-white via-slate-50 to-white",
    bgGlassHeader: "from-white via-slate-50 to-white",
    borderTransparent: "border-[var(--border)]",
    textGradientBlue: "from-teal-600 to-cyan-500",
    textGradientPurple: "from-teal-700 to-teal-500",
    statusIndicator: "text-[var(--foreground-secondary)]",
    chartGridColor: "stroke-slate-300",
    chartAxisColor: "stroke-slate-400",

    bgDarkPanel1: "bg-[var(--surface-2)]",
    bgDarkPanel2: "bg-[var(--surface-3)]",
    bgDarkPanel3: "bg-[var(--canvas)]",
    bgDarkPanel4: "bg-[var(--surface)]",
    groupHoverPrimary: "group-hover:text-[var(--accent)]",

    bgGlassPanel: "bg-white/80",
    backdropBlur: "backdrop-blur-md",
    bgGradientCircle: "bg-gradient-to-br from-teal-500/10 via-transparent to-transparent",

    bgButtonDisabled: "bg-teal-100",
    bgButtonDisabledRed: "bg-rose-100",
    bgButtonEnabled: "bg-gradient-to-br from-teal-100 via-teal-50 to-transparent",
    bgButtonEnabledRed: "bg-gradient-to-br from-rose-100 via-rose-50 to-transparent",
    bgButtonHoverBlue: "hover:bg-teal-100",
    bgButtonHoverRed: "hover:bg-rose-100",
    textButtonDisabled: "text-teal-500",
    textButtonDisabledRed: "text-rose-500",
    textButtonEnabled: "text-teal-800",
    textButtonEnabledRed: "text-rose-800",
    borderBlue: "border-teal-300",
    borderRed: "border-rose-300",
    borderBlueInner: "border-teal-400",
    borderRedInner: "border-rose-400",
    bgIconBlue: "bg-teal-100",
    bgIconRed: "bg-rose-100",
    bgIconGreen: "bg-emerald-100",
    textStatusGreen: "text-emerald-600",
    textStatusRed: "text-rose-600",
    textBlue: "text-teal-700",
    textRed: "text-rose-600",
    bgGradientBlue: "bg-gradient-to-br from-teal-200/30 via-transparent to-transparent",
    bgGradientRed: "bg-gradient-to-br from-rose-200/30 via-transparent to-transparent",
    bgCardDark: "bg-[var(--surface)]",
    textError: "text-rose-600",
    textSuccess: "text-emerald-600",
    bgButtonSuccess: "bg-emerald-100",
    bgButtonError: "bg-rose-100",
    textButtonSuccess: "text-emerald-700",
    textButtonError: "text-rose-700",
    accent: "text-[var(--accent)]",
    accentBg: "bg-[var(--accent)]",
    accentMuted: "bg-[var(--accent-muted)]",
  },
};

const ColorContext = createContext<ColorContextValue | null>(null);

export const useTheme = (): ColorContextValue => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error("useTheme must be used within a ColorProvider");
  }
  return context;
};

export const ColorProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ColorContext.Provider value={{ theme: lightTheme }}>
      {children}
    </ColorContext.Provider>
  );
};

export default ColorContext;
