import { themes } from "../../themes/index.ts";

/**
 * A theme's colours, before they are resolved into card colours.
 *
 * Not every theme defines every key: `default_repocard` omits `border_color`,
 * and only the stats card's themes define `ring_color`. Every key is therefore
 * optional and falls back to the default theme.
 */
export type Theme = {
  title_color: string;
  icon_color: string;
  text_color: string;
  bg_color: string;
  border_color?: string;
  ring_color?: string;
};

/** Colours a card renders with, after theme resolution. */
export interface CardColors {
  titleColor: string;
  iconColor: string;
  textColor: string;
  bgColor: string | string[];
  borderColor: string;
  ringColor: string;
}

/**
 * Checks if a string is a valid hex color.
 *
 * @param hexColor String to check.
 * @returns True if the given string is a valid hex color.
 */
const isValidHexColor = (hexColor: string): boolean => {
  return new RegExp(
    /^([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/,
  ).test(hexColor);
};

/**
 * Check if the given string is a valid gradient.
 *
 * A gradient is an angle followed by at least two colour stops.
 *
 * @param colors Array of colors.
 * @returns True if the given string is a valid gradient.
 */
const isValidGradient = (colors: string[]): boolean => {
  return (
    colors.length > 2 &&
    colors.slice(1).every((color) => isValidHexColor(color))
  );
};

/**
 * Resolve a gradient if the value holds more than one valid hex code, else a
 * single colour.
 *
 * @param color The color to parse.
 * @param fallbackColor The fallback color.
 * @returns The gradient or color.
 */
const fallbackColor = (
  color: string,
  fallbackColor: string,
): string | string[] => {
  let gradient: string[] | null = null;

  const colors = color ? color.split(",") : [];
  if (colors.length > 1 && isValidGradient(colors)) {
    gradient = colors;
  }

  return (
    (gradient ? gradient : isValidHexColor(color) && `#${color}`) ||
    fallbackColor
  );
};

export interface ColorParams {
  title_color?: string;
  text_color?: string;
  icon_color?: string;
  bg_color?: string;
  border_color?: string;
  ring_color?: string;
  theme?: string;
}

/**
 * Resolve theme colours, letting explicit parameters win.
 *
 * A user-supplied colour that is not valid falls back to the default theme
 * rather than rendering a broken card.
 *
 * @param args Colours and theme name to resolve.
 * @returns Card colors.
 */
const getCardColors = ({
  title_color,
  text_color,
  icon_color,
  bg_color,
  border_color,
  ring_color,
  theme,
}: ColorParams): CardColors => {
  const defaultTheme = themes["default"] as Theme;
  const selectedTheme: Theme =
    theme !== null && theme !== undefined && theme in themes
      ? (themes[theme as keyof typeof themes] as Theme)
      : defaultTheme;

  const defaultBorderColor = defaultTheme.border_color ?? "e4e2e2";

  const titleColor = fallbackColor(
    title_color || selectedTheme.title_color,
    "#" + defaultTheme.title_color,
  );

  const ringColor = fallbackColor(
    ring_color || selectedTheme.ring_color || "",
    titleColor as string,
  );

  const iconColor = fallbackColor(
    icon_color || selectedTheme.icon_color,
    "#" + defaultTheme.icon_color,
  );

  const textColor = fallbackColor(
    text_color || selectedTheme.text_color,
    "#" + defaultTheme.text_color,
  );

  const bgColor = fallbackColor(
    bg_color || selectedTheme.bg_color,
    "#" + defaultTheme.bg_color,
  );

  const borderColor = fallbackColor(
    border_color || selectedTheme.border_color || defaultBorderColor,
    "#" + defaultBorderColor,
  );

  if (
    typeof titleColor !== "string" ||
    typeof textColor !== "string" ||
    typeof ringColor !== "string" ||
    typeof iconColor !== "string" ||
    typeof borderColor !== "string"
  ) {
    throw new Error(
      "Unexpected behavior, all colors except background should be string.",
    );
  }

  return { titleColor, iconColor, textColor, bgColor, borderColor, ringColor };
};

export { isValidHexColor, isValidGradient, getCardColors };
