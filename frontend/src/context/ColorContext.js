'use client';

import React, { createContext, useState, useContext, useEffect } from "react";

// Define theme colors
const themes = {
  dark: {
    name: "dark",
    colors: {
      // Background Colors
      bgPrimary: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
      bgSecondary: "bg-slate-800",
      bgAppBar: "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950",
      bgSidebar: "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950",
      bgCard: "bg-slate-800/80",
      bgHover: "hover:bg-slate-700/50",
      bgActive: "bg-white",
      bgButton: "bg-slate-700/60",
      bgButtonHover: "hover:bg-slate-600",
      bgNotification: "bg-slate-800",
      bgProfile: "bg-slate-800",
      bgDialog: "bg-slate-800",

      // Text Colors
      textPrimary: "text-white",
      textSecondary: "text-slate-300",
      textMuted: "text-slate-400",
      textInactive: "text-slate-500",
      textActive: "text-slate-800",

      // Border Colors
      borderPrimary: "border-slate-700",
      borderSecondary: "border-slate-600/30",
      borderLight: "border-white/10",
      borderHover: "hover:border-white/30",
      borderActive: "border-white",
      borderActive1: "border-slate-600/50",

      // Gradient Colors
      gradientPrimary: "from-white/80 via-white to-white/90",
      gradientSecondary: "from-slate-950/30 via-slate-900/50 to-slate-950/30",
      gradientButton: "from-slate-700 via-slate-800 to-slate-600",

      // Icon Colors
      iconPrimary: "text-white",
      iconSecondary: "text-slate-400",
      iconActive: "text-white",

      // Specific Component Styles
      sidebarItemActive: "bg-white text-slate-800",
      sidebarItemInactive: "text-white hover:bg-white/10",
      sidebarIconBgActive: "bg-slate-950 text-white",
      sidebarIconBgInactive: "bg-slate-700/60 text-white border-white/20",

      // Additional colors for dark theme
      bgDarkPanel: "bg-slate-950/80",
      bgDarkPanelHover: "hover:bg-slate-900/60",
      bgGlassDark: "from-slate-950/60 via-slate-900/30 to-slate-950/60",
      bgGlassHeader: "from-slate-800/50 via-slate-700/30 to-slate-900/50",
      borderTransparent: "border-slate-700/50",
      textGradientBlue: "from-blue-400 to-cyan-300",
      textGradientPurple: "from-purple-400 to-blue-300",
      statusIndicator: "text-gray-300",
      chartGridColor: "stroke-slate-700",
      chartAxisColor: "stroke-slate-400",

      bgDarkPanel1: "bg-slate-800/50",
      bgDarkPanel2: "bg-slate-700/50",
      bgDarkPanel3:
        "bg-[radial-gradient(ellipse_at_center,_#020617_0%,_#0f172a_60%,_#020617_100%)]",
      bgDarkPanel4: "bg-gradient-to-br from-slate-900/80 to-black/80",
      groupHoverPrimary: "group-hover:text-white",

      // Additional colors for DeviceControlDashboard
      bgGlassPanel: "bg-slate-800/30",
      backdropBlur: "backdrop-blur-md",
      bgGradientCircle:
        "bg-gradient-to-br from-slate-800/20 via-slate-800/10 to-transparent",

      // Button states
      bgButtonDisabled: "bg-blue-600/20",
      bgButtonDisabledRed: "bg-red-600/20",
      bgButtonEnabled:
        "bg-gradient-to-br from-blue-600/30 via-blue-500/20 to-blue-400/10",
      bgButtonEnabledRed:
        "bg-gradient-to-br from-red-600/30 via-red-500/20 to-red-400/10",

      // Button hover states
      bgButtonHoverBlue: "hover:bg-blue-500/30",
      bgButtonHoverRed: "hover:bg-red-500/30",

      // Text colors for buttons
      textButtonDisabled: "text-blue-300",
      textButtonDisabledRed: "text-red-300",
      textButtonEnabled: "text-blue-100",
      textButtonEnabledRed: "text-red-100",

      // Border colors for buttons
      borderBlue: "border-blue-500/30",
      borderRed: "border-red-500/30",
      borderBlueInner: "border-blue-400/30",
      borderRedInner: "border-red-400/30",

      // Icon background colors
      bgIconBlue: "bg-blue-500/20",
      bgIconRed: "bg-red-500/20",
      bgIconGreen: "bg-green-500/20",

      // Status colors
      textStatusGreen: "text-green-400",
      textStatusRed: "text-red-400",
      textBlue: "text-blue-300",
      textRed: "text-red-300",

      // Gradient overlays
      bgGradientBlue:
        "bg-gradient-to-br from-blue-400/10 via-transparent to-transparent",
      bgGradientRed:
        "bg-gradient-to-br from-red-400/10 via-transparent to-transparent",

      // Add to dark theme colors:
      bgCardDark: "bg-slate-900",
      textError: "text-rose-400",
      textSuccess: "text-emerald-400",
      bgButtonSuccess: "bg-emerald-900",
      bgButtonError: "bg-rose-900",
      textButtonSuccess: "text-emerald-300",
      textButtonError: "text-rose-300",
    },
  },
  light: {
    name: "light",
    colors: {
      // Background Colors
      bgPrimary: "bg-gradient-to-br from-slate-200 via-slate-200 to-slate-200",
      bgSecondary: "bg-slate-200",
      bgAppBar: "bg-gradient-to-r from-slate-100 via-slate-100 to-slate-100",
      bgSidebar: "bg-gradient-to-r from-slate-100 via-slate-100 to-slate-100",
      bgCard: "bg-slate-100/80",
      bgHover: "hover:bg-slate-300/80",
      bgActive: "bg-slate-800",
      bgButton: "bg-slate-200",
      bgButtonHover: "hover:bg-slate-300",
      bgNotification: "bg-white",
      bgProfile: "bg-white",
      bgDialog: "bg-white",

      // Text Colors
      textPrimary: "text-slate-800",
      textSecondary: "text-slate-600",
      textMuted: "text-slate-600",
      textInactive: "text-slate-400",
      textActive: "text-white",

      // Border Colors
      borderPrimary: "border-slate-200",
      borderSecondary: "border-slate-300/30",
      borderLight: "border-slate-200/50",
      borderHover: "hover:border-slate-400",
      borderActive: "border-slate-500",
      borderActive1: "border-slate-400/80",
      // Gradient Colors
      gradientPrimary: "from-slate-800/70 via-slate-800 to-slate-800/80",
      gradientSecondary: "from-white via-slate-50 to-white",
      gradientButton: "from-slate-200 via-slate-100 to-slate-200",

      // Icon Colors
      iconPrimary: "text-slate-800",
      iconSecondary: "text-slate-500",
      iconActive: "text-slate-800",

      // Specific Component Styles
      sidebarItemActive: "bg-cyan-50/80 text-cyan-700 border border-cyan-500/20 shadow-sm",
      sidebarItemInactive: "text-slate-800 hover:bg-slate-200/50 border border-slate-200/60",
      sidebarIconBgActive: "bg-cyan-500 text-white shadow-sm shadow-cyan-200 border border-cyan-400/50",
      sidebarIconBgInactive: "bg-cyan-500/10 text-cyan-600 border border-cyan-200/50",

      // Additional colors for light theme
      bgDarkPanel: "bg-slate-100",
      bgDarkPanelHover: "hover:bg-slate-100/80",
      bgGlassDark: "from-white/90 via-slate-200/60 to-white/80",
      bgGlassHeader: "from-white/90 via-slate-100/70 to-white/90",
      borderTransparent: "border-slate-300/50",
      textGradientBlue: "from-blue-600 to-cyan-500",
      textGradientPurple: "from-purple-600 to-blue-500",
      statusIndicator: "text-slate-600",
      chartGridColor: "stroke-slate-300",
      chartAxisColor: "stroke-slate-500",

      bgDarkPanel1: "bg-slate-100/50",
      bgDarkPanel2: "bg-slate-200/50",
      bgDarkPanel3:
        "bg-[radial-gradient(ellipse_at_center,_#e2e8f0_0%,_#cbd5e1_60%,_#e2e8f0_100%)]",
      bgDarkPanel4: "bg-gradient-to-br from-slate-100/80 to-white/80",

      groupHoverPrimary: "group-hover:text-black",

      // Additional colors for DeviceControlDashboard
      bgGlassPanel: "bg-white/60",
      backdropBlur: "backdrop-blur-md",
      bgGradientCircle:
        "bg-gradient-to-br from-slate-200/60 via-slate-100/40 to-transparent",

      // Button states
      bgButtonDisabled: "bg-blue-200/40",
      bgButtonDisabledRed: "bg-red-200/40",
      bgButtonEnabled:
        "bg-gradient-to-br from-blue-200/60 via-blue-100/40 to-blue-50/20",
      bgButtonEnabledRed:
        "bg-gradient-to-br from-red-200/60 via-red-100/40 to-red-50/20",

      // Button hover states
      bgButtonHoverBlue: "hover:bg-blue-200/50",
      bgButtonHoverRed: "hover:bg-red-200/50",

      // Text colors for buttons
      textButtonDisabled: "text-blue-500",
      textButtonDisabledRed: "text-red-500",
      textButtonEnabled: "text-blue-700",
      textButtonEnabledRed: "text-red-700",

      // Border colors for buttons
      borderBlue: "border-blue-300/50",
      borderRed: "border-red-300/50",
      borderBlueInner: "border-blue-400/50",
      borderRedInner: "border-red-400/50",

      // Icon background colors
      bgIconBlue: "bg-blue-100/60",
      bgIconRed: "bg-red-100/60",
      bgIconGreen: "bg-green-100/60",

      // Status colors
      textStatusGreen: "text-green-600",
      textStatusRed: "text-red-600",
      textBlue: "text-blue-600",
      textRed: "text-red-600",

      // Gradient overlays
      bgGradientBlue:
        "bg-gradient-to-br from-blue-200/20 via-transparent to-transparent",
      bgGradientRed:
        "bg-gradient-to-br from-red-200/20 via-transparent to-transparent",

      // Add to light theme colors:
      bgCardDark: "bg-slate-100",
      textError: "text-rose-600",
      textSuccess: "text-emerald-600",
      bgButtonSuccess: "bg-emerald-100",
      bgButtonError: "bg-rose-100",
      textButtonSuccess: "text-emerald-700",
      textButtonError: "text-rose-700",
    },
  },
};

// Create context
const ColorContext = createContext();

// Hook to consume theme
export const useTheme = () => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error("useTheme must be used within a ColorProvider");
  }
  return context;
};

// Provider component
export const ColorProvider = ({ children }) => {
  // Initialize with dark theme (matches server-side default)
  const [currentTheme, setCurrentTheme] = useState(themes.dark);

  // Load theme from localStorage on client (after mount to prevent hydration mismatch)
  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem("theme") : null;
    if (savedTheme === "light") {
      setCurrentTheme(themes.light);
    } else {
      setCurrentTheme(themes.dark);
    }
  }, []);

  // Apply theme to document body (only on client)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = currentTheme.name === "dark";
      
      // Toggle 'dark' class for Tailwind CSS
      document.documentElement.classList.toggle("dark", isDark);
      
      // Update data-theme for CSS variables
      document.documentElement.setAttribute("data-theme", currentTheme.name);
    }
  }, [currentTheme]);

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = currentTheme.name === "dark" ? themes.light : themes.dark;
    setCurrentTheme(newTheme);
    localStorage.setItem("theme", newTheme.name);
  };

  return (
    <ColorContext.Provider value={{ theme: currentTheme, toggleTheme }}>
      {children}
    </ColorContext.Provider>
  );
};

export default ColorContext;
