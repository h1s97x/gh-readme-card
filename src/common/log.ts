const noop = (): void => {};

/** Only the two methods the project actually calls. */
type Logger = Pick<Console, "log" | "error">;

/**
 * Return console instance based on the environment.
 */
const logger: Logger =
  process.env.NODE_ENV === "test" ? { log: noop, error: noop } : console;

export { logger };
export type { Logger };
export default logger;
