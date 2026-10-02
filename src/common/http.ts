/** GitHub's GraphQL endpoint; the only host the project talks to for user data. */
const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

/**
 * Identifies this project to GitHub's API.
 *
 * GitHub requires a `User-Agent` on every request and rejects calls without
 * one. Set `USER_AGENT` to identify your own deployment.
 */
const USER_AGENT =
  process.env.USER_AGENT ??
  "gh-readme-card (https://github.com/h1s97x/gh-readme-card)";

/** A response from the GitHub API, or the error response it rejected with. */
export interface GitHubResponse<TData = unknown> {
  data: TData;
  /** HTTP status, for callers that branch on it. */
  status: number;
  /** HTTP status text, surfaced in error messages. */
  statusText: string;
}

/**
 * A rejected GitHub call, carrying the response so callers can read the error
 * body instead of only a message.
 */
export class RequestError extends Error {
  response?: {
    status: number;
    data: { message?: string };
  };

  constructor(message: string, response?: RequestError["response"]) {
    super(message);
    this.name = "RequestError";
    this.response = response;
  }
}

/**
 * Send a GraphQL request to the GitHub API.
 *
 * Uses the global `fetch` rather than a client library, which is what lets the
 * action run straight from a checkout with nothing installed.
 *
 * @typeParam TResponse Shape the caller expects back in `data`.
 * @param data Request data — the query text and its variables.
 * @param headers Request headers, including the `Authorization` token.
 * @returns The parsed response body.
 * @throws {RequestError} When GitHub answers with a non-2xx status.
 */
const request = async <TResponse = unknown>(
  data: { query: string; variables?: unknown },
  headers: Record<string, string> = {},
): Promise<GitHubResponse<TResponse>> => {
  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      ...headers,
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as TResponse) : ({} as TResponse);

  if (!response.ok) {
    throw new RequestError(
      (body as { message?: string }).message ?? response.statusText,
      {
        status: response.status,
        data: body as { message?: string },
      },
    );
  }

  return {
    data: body,
    status: response.status,
    statusText: response.statusText,
  };
};

export { GITHUB_GRAPHQL_ENDPOINT, USER_AGENT, request };
