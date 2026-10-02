type Env = Record<string, string | undefined>;

/** A personal access token found in the environment, with the name it had. */
interface PersonalAccessToken {
  /** The variable name, e.g. `PAT_1`. */
  name: string;
  /** The token value. */
  value: string;
}

interface Config {
  /** Tokens to rotate through when GitHub rate-limits one of them. */
  pats: PersonalAccessToken[];
  /** Repositories kept out of every card, e.g. to hide private work. */
  excludeRepositories: string[];
}

/**
 * Split a comma-separated environment variable.
 *
 * @param value The raw environment variable.
 * @returns The parsed values, or `undefined` when the variable is unset.
 */
const parseCsv = (value: string | undefined): string[] | undefined =>
  value ? value.split(",") : undefined;

/**
 * Collect every `PAT_<n>` variable, so the fetcher can rotate between them.
 *
 * @param env Environment variables to inspect.
 * @returns The tokens, in the order the variables appear.
 */
const parsePATsFromEnv = (env: Env): PersonalAccessToken[] => {
  return Object.keys(env)
    .filter((key) => /PAT_\d*$/.exec(key))
    .map((name) => ({ name, value: env[name] ?? "" }));
};

/**
 * Read `process.env`, or an empty object where it does not exist.
 *
 * @returns The environment to read configuration from.
 */
const getDefaultEnv = (): Env => {
  const processEnv = (globalThis as { process?: { env?: Env } }).process?.env;
  return processEnv ?? {};
};

let currentConfig: Config;

/**
 * Build the configuration from environment variables.
 *
 * @param env Environment variables to read. Injectable so tests can supply
 *   their own instead of mutating `process.env`.
 */
export const loadConfigFromEnv = (env: Env = getDefaultEnv()): void => {
  currentConfig = {
    pats: parsePATsFromEnv(env),
    excludeRepositories: parseCsv(env["EXCLUDE_REPO"]) ?? [],
  };
};

loadConfigFromEnv();

/** @returns The active configuration. */
export const getConfig = (): Config => currentConfig;
