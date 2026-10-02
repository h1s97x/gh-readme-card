import { CustomError } from "./error.ts";
import { getConfig } from "./config.ts";
import { RequestError } from "./http.ts";
import { logger } from "./log.ts";

// Script variables.

// How many tokens to rotate through before giving up. Tests get a fixed
// budget so they can simulate a rate limit without PAT_1..PAT_7 in the env.
const RETRIES = process.env.NODE_ENV === "test" ? 7 : getConfig().pats.length;

/** A GitHub API response, or an error response when the call was rejected. */
type GitHubResponse = {
  data?: {
    errors?: { type?: string; message?: string }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

/** Performs one API call with a single token. */
type FetcherFunction<
  TVariables = unknown,
  TResponse extends GitHubResponse = GitHubResponse,
> = (
  variables: TVariables,
  token: string,
  retriesForTests?: number,
) => Promise<TResponse>;

/**
 * Run a fetcher until it succeeds, rotating tokens each time GitHub rate-limits.
 *
 * @param fetcher The fetcher function.
 * @param variables Arguments to pass to the fetcher function.
 * @param retries How many times we have already retried.
 * @returns The response from the fetcher function.
 */
const retryer = async <TResponse extends GitHubResponse, TVariables = unknown>(
  fetcher: (
    variables: TVariables,
    token: string,
    retries?: number,
  ) => Promise<TResponse>,
  variables: TVariables,
  retries = 0,
): Promise<TResponse> => {
  if (!RETRIES) {
    throw new CustomError("No GitHub API tokens found", CustomError.NO_TOKENS);
  }

  if (retries > RETRIES) {
    throw new CustomError(
      "Downtime due to GitHub API rate limiting",
      CustomError.MAX_RETRY,
    );
  }

  try {
    // try to fetch with the first token since RETRIES is 0 index i'm adding +1
    let response = await fetcher(
      variables,
      getConfig().pats[retries]?.value ?? "",
      // used in tests for faking rate limit
      retries,
    );

    // react on both type and message-based rate-limit signals.
    // https://github.com/anuraghazra/github-readme-stats/issues/4425
    const errors = response?.data?.errors;
    const errorType = errors?.[0]?.type;
    const errorMsg = errors?.[0]?.message || "";
    const isRateLimited =
      (errors && errorType === "RATE_LIMITED") || /rate limit/i.test(errorMsg);

    // if rate limit is hit increase the RETRIES and recursively call the retryer
    // with username, and current RETRIES
    if (isRateLimited) {
      logger.log(`PAT_${retries + 1} Failed`);
      retries++;
      // directly return from the function
      return retryer(fetcher, variables, retries);
    }

    // finally return the response
    return response;
  } catch (err) {
    // network or unexpected error: let the caller treat it as a failure
    const e = err as RequestError;
    if (!e?.response) {
      throw err;
    }

    // also check for bad credentials in case a token gets invalidated
    const message = e.response.data?.message;
    const isBadCredential = message === "Bad credentials";
    const isAccountSuspended = message === "Sorry. Your account was suspended.";

    if (isBadCredential || isAccountSuspended) {
      logger.log(`PAT_${retries + 1} Failed`);
      retries++;
      // directly return from the function
      return retryer(fetcher, variables, retries);
    }

    // HTTP error with a response: hand it back so the caller can read the
    // GraphQL error the API returned rather than seeing a thrown error.
    return e.response as unknown as TResponse;
  }
};

export { retryer, RETRIES };
export type { FetcherFunction, GitHubResponse };
export default retryer;
