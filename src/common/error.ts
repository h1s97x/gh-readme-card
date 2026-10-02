/** A general message to ask the user to try again later. */
const TRY_AGAIN_LATER = "Please try again later";

/** Recognised error types, mapped to the secondary line shown on a card. */
const SECONDARY_ERROR_MESSAGES = {
  MAX_RETRY:
    "GitHub's API rate limit was reached. Try again later, or use more than one token.",
  NO_TOKENS:
    "No token found. Set PAT_1 in the action's environment, or pass one as the token input.",
  USER_NOT_FOUND: "Make sure the provided username is not an organization",
  GRAPHQL_ERROR: TRY_AGAIN_LATER,
  GITHUB_REST_API_ERROR: TRY_AGAIN_LATER,
} as const;

type ErrorType = keyof typeof SECONDARY_ERROR_MESSAGES;

/** An error raised deliberately by this codebase, carrying a known type. */
class CustomError extends Error {
  /** One of the keys of `SECONDARY_ERROR_MESSAGES`, or a free-form string. */
  type: string;
  /** The line to show under the message; falls back to `type`. */
  secondaryMessage: string;

  /**
   * @param message Error message.
   * @param type Error type.
   */
  constructor(message: string, type: string) {
    super(message);
    this.type = type;
    const known = SECONDARY_ERROR_MESSAGES[type as ErrorType];
    this.secondaryMessage = known ?? type;
  }

  static MAX_RETRY: ErrorType = "MAX_RETRY";
  static NO_TOKENS: ErrorType = "NO_TOKENS";
  static USER_NOT_FOUND: ErrorType = "USER_NOT_FOUND";
  static GRAPHQL_ERROR: ErrorType = "GRAPHQL_ERROR";
  static GITHUB_REST_API_ERROR: ErrorType = "GITHUB_REST_API_ERROR";
}

/** A required parameter was absent from the input. */
class MissingParamError extends Error {
  /** Names of the parameters that were required but not supplied. */
  missedParams: string[];
  /** Optional secondary message to display. */
  secondaryMessage: string | undefined;

  /**
   * @param missedParams Names of the missing parameters.
   * @param secondaryMessage Optional secondary message to display.
   */
  constructor(missedParams: string[], secondaryMessage?: string) {
    const msg = `Missing params ${missedParams
      .map((p) => `"${p}"`)
      .join(", ")} make sure you pass the parameters in URL`;
    super(msg);
    this.missedParams = missedParams;
    this.secondaryMessage = secondaryMessage;
  }
}

/**
 * Read the secondary message off an error, if it carries one.
 *
 * @param err The error object.
 * @returns The secondary message, or `undefined` when there is none.
 */
const retrieveSecondaryMessage = (err: unknown): string | undefined => {
  if (
    typeof err === "object" &&
    err !== null &&
    "secondaryMessage" in err &&
    typeof (err as { secondaryMessage: unknown }).secondaryMessage === "string"
  ) {
    return (err as { secondaryMessage: string }).secondaryMessage;
  }
  return undefined;
};

export {
  CustomError,
  MissingParamError,
  SECONDARY_ERROR_MESSAGES,
  TRY_AGAIN_LATER,
  retrieveSecondaryMessage,
};
export type { ErrorType };
