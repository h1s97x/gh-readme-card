import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

/** GitHub's GraphQL endpoint; the only host the project talks to for user data. */
const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

/**
 * Identifies this project to GitHub's API.
 *
 * GitHub requires a `User-Agent` on every request; without one it rejects the
 * call. Set `USER_AGENT` on a self-hosted instance to something identifying
 * your own deployment.
 */
const USER_AGENT =
  process.env.USER_AGENT ||
  "gh-readme-card (https://github.com/h1s97x/gh-readme-card)";

/**
 * Send a GraphQL request to the GitHub API.
 *
 * @typeParam TResponse Shape the caller expects back in `response.data`.
 * @param data Request data — the query text and its variables.
 * @param headers Request headers, including the `Authorization` token.
 * @returns The response, whose `data` is typed as `TResponse`.
 */
const request = <TResponse = unknown>(
  data: AxiosRequestConfig["data"],
  headers?: AxiosRequestConfig["headers"],
): Promise<AxiosResponse<TResponse>> => {
  return axios<TResponse>({
    url: GITHUB_GRAPHQL_ENDPOINT,
    method: "post",
    headers: { "User-Agent": USER_AGENT, ...headers },
    data,
  });
};

export { GITHUB_GRAPHQL_ENDPOINT, USER_AGENT, request };
