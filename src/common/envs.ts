/**
 * Split a comma-separated environment variable.
 *
 * @param value The raw environment variable.
 * @returns The parsed values, or `undefined` when the variable is unset.
 */
const parseCsv = (value: string | undefined): string[] | undefined =>
  value ? value.split(",") : undefined;

const whitelist = parseCsv(process.env.WHITELIST);

const gistWhitelist = parseCsv(process.env.GIST_WHITELIST);

const excludeRepositories = parseCsv(process.env.EXCLUDE_REPO) ?? [];

export { whitelist, gistWhitelist, excludeRepositories };
