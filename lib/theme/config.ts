export type ThemeConfig = {
  colors: {
    brand: Record<string, string>;
    accent: Record<string, string>;
    neutral: Record<string, string>;
    semantic: Record<string, string>;
    elements: Record<string, string>;
  };
  fonts: {
    heading: string;
    body: string;
    chinese: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  layout: {
    container_max_width: string;
    section_spacing: string;
    hero_variant: string;
    feature_variant: string;
    spacing_density: "compact" | "comfortable" | "spacious";
  };
};

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  colors: {
    brand: {
      "100": "#E8F5EE",
      "200": "#A3D1B7",
      "300": "#76BA93",
      "400": "#4AA370",
      "500": "#2D8C54",
      "600": "#247043",
      "700": "#1B5432",
      "800": "#123822",
      "900": "#091C11",
    },
    accent: {
      "100": "#FFF8E7",
      "300": "#FFD666",
      "500": "#D4A843",
      "700": "#8B6F2A",
    },
    neutral: {
      "50": "#FAFAF9",
      "100": "#F5F5F4",
      "200": "#E7E5E4",
      "300": "#D6D3D1",
      "400": "#A8A29E",
      "500": "#78716C",
      "700": "#44403C",
      "900": "#1C1917",
    },
    semantic: {
      success: "#16A34A",
      warning: "#EAB308",
      error: "#DC2626",
      info: "#2563EB",
    },
    elements: {
      wood: "#4AA370",
      fire: "#DC4A3F",
      earth: "#D4A843",
      metal: "#A0A0A0",
      water: "#2563EB",
    },
  },
  fonts: {
    heading: "DM Serif Display, Georgia, serif",
    body: "Inter, -apple-system, sans-serif",
    chinese: "Noto Sans SC, PingFang SC, sans-serif",
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
    md: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)",
    xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)",
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
  layout: {
    container_max_width: "1280px",
    section_spacing: "64px",
    hero_variant: "split",
    feature_variant: "grid",
    spacing_density: "comfortable",
  },
};

function mergeObject<T extends Record<string, unknown>>(base: T, value: unknown): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const [key, baseValue] of Object.entries(base)) {
    const nextValue = source[key];
    if (baseValue && typeof baseValue === "object" && !Array.isArray(baseValue)) {
      out[key] = mergeObject(baseValue as Record<string, unknown>, nextValue);
    } else if (typeof nextValue === "string") {
      out[key] = nextValue;
    } else if (typeof baseValue === "number" && typeof nextValue === "number") {
      out[key] = nextValue;
    } else if (typeof baseValue === "boolean" && typeof nextValue === "boolean") {
      out[key] = nextValue;
    } else {
      out[key] = baseValue;
    }
  }
  return out as T;
}

function legacyColorFromConfig(config: Record<string, unknown>, key: string) {
  const colors = config.colors as Record<string, unknown> | undefined;
  if (!colors || typeof colors !== "object") return null;
  const direct = colors[key];
  return typeof direct === "string" ? direct : null;
}

export function resolveThemeConfig(themeConfig: unknown): ThemeConfig {
  const base = mergeObject(DEFAULT_THEME_CONFIG, themeConfig) as ThemeConfig;
  if (themeConfig && typeof themeConfig === "object") {
    const legacy = themeConfig as Record<string, unknown>;
    const legacyBrand = legacyColorFromConfig(legacy, "brand_500") || legacyColorFromConfig(legacy, "brand-500");
    const legacyAccent = legacyColorFromConfig(legacy, "accent_500") || legacyColorFromConfig(legacy, "accent-500");
    if (legacyBrand) base.colors.brand["500"] = legacyBrand;
    if (legacyAccent) base.colors.accent["500"] = legacyAccent;
    const legacyFonts = legacy.fonts as Record<string, unknown> | undefined;
    if (legacyFonts) {
      if (typeof legacyFonts.heading === "string") base.fonts.heading = legacyFonts.heading;
      if (typeof legacyFonts.body === "string") base.fonts.body = legacyFonts.body;
      if (typeof legacyFonts.chinese === "string") base.fonts.chinese = legacyFonts.chinese;
    }
  }
  return base;
}

export function themeToCssVars(theme: ThemeConfig): Record<string, string> {
  return {
    "--brand": theme.colors.brand["500"] || DEFAULT_THEME_CONFIG.colors.brand["500"],
    "--brand-2": theme.colors.accent["500"] || DEFAULT_THEME_CONFIG.colors.accent["500"],
    "--color-brand-100": theme.colors.brand["100"],
    "--color-brand-200": theme.colors.brand["200"],
    "--color-brand-300": theme.colors.brand["300"],
    "--color-brand-400": theme.colors.brand["400"],
    "--color-brand-500": theme.colors.brand["500"],
    "--color-brand-600": theme.colors.brand["600"],
    "--color-brand-700": theme.colors.brand["700"],
    "--color-brand-800": theme.colors.brand["800"],
    "--color-brand-900": theme.colors.brand["900"],
    "--color-accent-100": theme.colors.accent["100"],
    "--color-accent-300": theme.colors.accent["300"],
    "--color-accent-500": theme.colors.accent["500"],
    "--color-accent-700": theme.colors.accent["700"],
    "--font-heading": theme.fonts.heading,
    "--font-body": theme.fonts.body,
    "--font-chinese": theme.fonts.chinese,
    "--shadow-sm": theme.shadows.sm,
    "--shadow-md": theme.shadows.md,
    "--shadow-lg": theme.shadows.lg,
    "--shadow-xl": theme.shadows.xl,
    "--radius-sm": theme.radius.sm,
    "--radius-md": theme.radius.md,
    "--radius-lg": theme.radius.lg,
    "--radius-xl": theme.radius.xl,
    "--radius-full": theme.radius.full,
  };
}
