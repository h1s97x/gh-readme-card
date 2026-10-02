import toEmoji from "emoji-name-map";

/**
 * Returns boolean if value is either "true" or "false" else undefined.
 *
 * @param value The value to parse.
 * @returns The parsed value.
 */
const parseBoolean = (
  value: string | boolean | undefined,
): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    } else if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return undefined;
};

/**
 * Parse string to array of strings.
 *
 * @param str The string to parse.
 * @returns The array of strings, empty when nothing was given.
 */
const parseArray = (str: string | undefined): string[] => {
  if (!str) {
    return [];
  }
  return str.split(",");
};

/**
 * Clamp the given number between the given range.
 *
 * Numeric strings are coerced the same way `Math.min`/`Math.max` used to coerce
 * them; anything `parseInt` cannot read falls back to `min`.
 *
 * @param number The number to clamp.
 * @param min The minimum value.
 * @param max The maximum value.
 * @returns The clamped number.
 */
const clampValue = (
  number: number | string,
  min: number,
  max: number,
): number => {
  if (Number.isNaN(parseInt(String(number), 10))) {
    return min;
  }
  // `Number` rather than the implicit coercion `Math.min` used to do, so the
  // behaviour is visible to the type checker.
  return Math.max(min, Math.min(Number(number), max));
};

/**
 * Lowercase and trim string.
 *
 * @param name String to lowercase and trim.
 * @returns Lowercased and trimmed string.
 */
const lowercaseTrim = (name: string): string => name.toLowerCase().trim();

/**
 * Split array of languages in two columns.
 *
 * @param arr Array of languages.
 * @param perChunk Number of languages per column.
 * @returns Array of languages split in two columns.
 */
const chunkArray = <T>(arr: T[], perChunk: number): T[][] => {
  return arr.reduce<T[][]>((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / perChunk);
    resultArray[chunkIndex] ??= [];
    resultArray[chunkIndex].push(item);
    return resultArray;
  }, []);
};

/**
 * Parse emoji from string.
 *
 * @param str String to parse emoji from.
 * @returns String with emoji parsed.
 * @throws If `str` is not provided.
 */
const parseEmojis = (str: string): string => {
  if (!str) {
    throw new Error("[parseEmoji]: str argument not provided");
  }
  return str.replace(/:\w+:/gm, (emoji) => {
    return toEmoji.get(emoji) || "";
  });
};

/**
 * Get diff in minutes between two dates.
 *
 * @param d1 First date.
 * @param d2 Second date.
 * @returns Number of minutes between the two dates.
 */
const dateDiff = (d1: Date, d2: Date): number => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  const diff = date1.getTime() - date2.getTime();
  return Math.round(diff / (1000 * 60));
};

export {
  parseBoolean,
  parseArray,
  clampValue,
  lowercaseTrim,
  chunkArray,
  parseEmojis,
  dateDiff,
};
