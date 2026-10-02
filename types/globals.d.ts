/**
 * Ambient types for dependencies that ship no types of their own.
 *
 * Kept in one place so the declarations are easy to delete once any of these
 * packages publish their own.
 */

/** `emoji-name-map` — CommonJS `module.exports = { emoji, get }`. */
declare module "emoji-name-map" {
  const emojiNameMap: {
    /** Every `:name:` → emoji pair the package knows about. */
    emoji: Record<string, string>;
    /**
     * Look up an emoji by its `:name:` form.
     *
     * @param name The shortcode, including the surrounding colons.
     * @returns The emoji, or `undefined` when the name is not in the map.
     */
    get(name: string): string | undefined;
  };
  export default emojiNameMap;
}

/** `github-username-regex` — CommonJS `module.exports = /regex/`. */
declare module "github-username-regex" {
  const githubUsernameRegex: RegExp;
  export default githubUsernameRegex;
}
