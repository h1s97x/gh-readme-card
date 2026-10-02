import githubUsernameRegex from "github-username-regex";
import { calculateRank } from "../calculateRank.ts";
import { retryer } from "../common/retryer.ts";
import { logger } from "../common/log.ts";
import { getConfig } from "../common/config.ts";
import { CustomError, MissingParamError } from "../common/error.ts";
import { wrapTextMultiline } from "../common/fmt.ts";
import { request, USER_AGENT } from "../common/http.ts";
import type { StatsData } from "./types.ts";
import type { GitHubResponse } from "../common/http.ts";

/** Variables the two GraphQL queries take. */
interface StatsVariables {
  login: string;
  after?: string | null;
  includeMergedPullRequests?: boolean;
  includeDiscussions?: boolean;
  includeDiscussionsAnswers?: boolean;
  startTime?: string;
  ownerAffiliations?: string;
  includeUserRepositories?: boolean;
}

/** A repository as the star-count query returns it. */
interface RepoNode {
  name: string;
  stargazers: { totalCount: number };
}

/** The user object the stats query selects. */
interface UserInfo {
  name: string | null;
  login: string;
  commits: { totalCommitContributions: number };
  reviews: { totalPullRequestReviewContributions: number };
  repositoriesContributedTo: { totalCount: number };
  pullRequests: { totalCount: number };
  mergedPullRequests?: { totalCount: number };
  openIssues: { totalCount: number };
  closedIssues: { totalCount: number };
  followers: { totalCount: number };
  repositoryDiscussions?: { totalCount: number };
  repositoryDiscussionComments?: { totalCount: number };
  repositories: {
    totalCount: number;
    nodes: RepoNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

/** GitHub answers with `data`, `errors`, or both. */
interface StatsQueryResult {
  data?: { user: UserInfo | null };
  errors?: { type?: string; message?: string }[];
}

interface StatsResponse {
  data: StatsQueryResult;
  statusText?: string;
}

// GraphQL queries.
const GRAPHQL_REPOS_FIELD = `
  repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}, after: $after) {
    totalCount
    nodes {
      name
      stargazers {
        totalCount
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
`;

const GRAPHQL_REPOS_QUERY = `
  query userInfo($login: String!, $after: String) {
    user(login: $login) {
      ${GRAPHQL_REPOS_FIELD}
    }
  }
`;

const GRAPHQL_STATS_QUERY = `
  query userInfo($login: String!, $after: String, $includeMergedPullRequests: Boolean!, $includeDiscussions: Boolean!, $includeDiscussionsAnswers: Boolean!, $startTime: DateTime = null) {
    user(login: $login) {
      name
      login
      commits: contributionsCollection (from: $startTime) {
        totalCommitContributions,
      }
      reviews: contributionsCollection {
        totalPullRequestReviewContributions
      }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
        totalCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      mergedPullRequests: pullRequests(states: MERGED) @include(if: $includeMergedPullRequests) {
        totalCount
      }
      openIssues: issues(states: OPEN) {
        totalCount
      }
      closedIssues: issues(states: CLOSED) {
        totalCount
      }
      followers {
        totalCount
      }
      repositoryDiscussions @include(if: $includeDiscussions) {
        totalCount
      }
      repositoryDiscussionComments(onlyAnswers: true) @include(if: $includeDiscussionsAnswers) {
        totalCount
      }
      ${GRAPHQL_REPOS_FIELD}
    }
  }
`;

/**
 * Stats fetcher object.
 *
 * @param variables Fetcher variables.
 * @param token GitHub token.
 * @returns The search response.
 */
const fetcher = (
  variables: StatsVariables,
  token: string,
): Promise<StatsResponse> => {
  const query = variables.after ? GRAPHQL_REPOS_QUERY : GRAPHQL_STATS_QUERY;
  return request(
    {
      query,
      variables,
    },
    {
      Authorization: `bearer ${token}`,
    },
  );
};

/**
 * Fetch stats information for a given username.
 *
 * @param {object} variables Fetcher variables.
 * @param {string} variables.username GitHub username.
 * @param {boolean} variables.includeMergedPullRequests Include merged pull requests.
 * @param {boolean} variables.includeDiscussions Include discussions.
 * @param {boolean} variables.includeDiscussionsAnswers Include discussions answers.
 * @param {string|undefined} variables.startTime Time to start the count of total commits.
 * @returns The response.
 *
 * @description This function supports multi-page fetching if the 'FETCH_MULTI_PAGE_STARS' environment variable is set to true.
 */
interface StatsFetcherArgs {
  username: string;
  includeMergedPullRequests: boolean;
  includeDiscussions: boolean;
  includeDiscussionsAnswers: boolean;
  startTime?: string;
}

const statsFetcher = async ({
  username,
  includeMergedPullRequests,
  includeDiscussions,
  includeDiscussionsAnswers,
  startTime,
}: StatsFetcherArgs): Promise<StatsResponse> => {
  let stats: StatsResponse | undefined;
  let hasNextPage = true;
  let endCursor: string | null = null;
  while (hasNextPage) {
    const variables: StatsVariables = {
      login: username,
      after: endCursor,
      includeMergedPullRequests,
      includeDiscussions,
      includeDiscussionsAnswers,
      startTime,
    };
    let res = await retryer(fetcher, variables);
    if (res.data.errors) {
      return res;
    }

    const user = res.data.data?.user;
    if (!user) {
      return res;
    }

    // Accumulate the repository nodes across pages.
    const repoNodes = user.repositories.nodes;
    if (stats?.data.data?.user) {
      stats.data.data.user.repositories.nodes.push(...repoNodes);
    } else {
      stats = res;
    }

    // Disable multi page fetching on public Vercel instance due to rate limits.
    const repoNodesWithStars = repoNodes.filter(
      (node) => node.stargazers.totalCount !== 0,
    );
    hasNextPage =
      process.env.FETCH_MULTI_PAGE_STARS === "true" &&
      repoNodes.length === repoNodesWithStars.length &&
      user.repositories.pageInfo.hasNextPage;
    endCursor = user.repositories.pageInfo.endCursor;
  }

  if (!stats) {
    throw new CustomError("Could not fetch stats.", CustomError.GRAPHQL_ERROR);
  }
  return stats;
};

/**
 * Fetch total commits using the REST API.
 *
 * @param variables Fetcher variables.
 * @param token GitHub token.
 * @returns The search response.
 *
 * @see https://developer.github.com/v3/search/#search-commits
 */
const fetchTotalCommits = async (
  variables: { login: string },
  token: string,
): Promise<GitHubResponse<{ total_count: number }>> => {
  const response = await fetch(
    `https://api.github.com/search/commits?q=author:${variables.login}`,
    {
      headers: {
        Accept: "application/vnd.github.cloak-preview",
        "User-Agent": USER_AGENT,
        Authorization: `token ${token}`,
      },
    },
  );

  const body = (await response.json()) as { total_count: number };
  return {
    data: body,
    status: response.status,
    statusText: response.statusText,
  };
};

/**
 * Fetch all the commits for all the repositories of a given username.
 *
 * @param {string} username GitHub username.
 * @returns {Promise<number>} Total commits.
 *
 * @description Done like this because the GitHub API does not provide a way to fetch all the commits. See
 * #92#issuecomment-661026467 and #211 for more information.
 */
const totalCommitsFetcher = async (username: string): Promise<number> => {
  if (!githubUsernameRegex.test(username)) {
    logger.log("Invalid username provided.");
    throw new Error("Invalid username provided.");
  }

  let res;
  try {
    res = await retryer(fetchTotalCommits, { login: username });
  } catch (err) {
    logger.log(err);
    throw new Error(String(err));
  }

  const totalCount = res.data.total_count;
  if (!totalCount || isNaN(totalCount)) {
    throw new CustomError(
      "Could not fetch total commits.",
      CustomError.GITHUB_REST_API_ERROR,
    );
  }
  return totalCount;
};

/**
 * Fetch stats for a given username.
 *
 * @param username GitHub username.
 * @param {boolean} include_all_commits Include all commits.
 * @param {string[]} exclude_repo Repositories to exclude.
 * @param {boolean} include_merged_pull_requests Include merged pull requests.
 * @param {boolean} include_discussions Include discussions.
 * @param {boolean} include_discussions_answers Include discussions answers.
 * @param {number|undefined} commits_year Year to count total commits
 * @returns Stats data.
 */
const fetchStats = async (
  username: string,
  include_all_commits = false,
  exclude_repo: string[] = [],
  include_merged_pull_requests = false,
  include_discussions = false,
  include_discussions_answers = false,
  commits_year?: number,
): Promise<StatsData> => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  const stats = {
    name: "",
    totalPRs: 0,
    totalPRsMerged: 0,
    mergedPRsPercentage: 0,
    totalReviews: 0,
    totalCommits: 0,
    totalIssues: 0,
    totalStars: 0,
    totalDiscussionsStarted: 0,
    totalDiscussionsAnswered: 0,
    contributedTo: 0,
    rank: { level: "C", percentile: 100 },
  };

  let res = await statsFetcher({
    username,
    includeMergedPullRequests: include_merged_pull_requests,
    includeDiscussions: include_discussions,
    includeDiscussionsAnswers: include_discussions_answers,
    startTime: commits_year ? `${commits_year}-01-01T00:00:00Z` : undefined,
  });

  // Catch GraphQL errors.
  if (res.data.errors) {
    logger.error(res.data.errors);
    if (res.data.errors[0].type === "NOT_FOUND") {
      throw new CustomError(
        res.data.errors[0].message || "Could not fetch user.",
        CustomError.USER_NOT_FOUND,
      );
    }
    if (res.data.errors[0].message) {
      throw new CustomError(
        wrapTextMultiline(res.data.errors[0].message, 90, 1)[0],
        res.statusText ?? "GRAPHQL_ERROR",
      );
    }
    throw new CustomError(
      "Something went wrong while trying to retrieve the stats data using the GraphQL API.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const user = res.data.data?.user;
  if (!user) {
    throw new CustomError("Could not fetch user.", CustomError.USER_NOT_FOUND);
  }

  stats.name = user.name || user.login;

  // if include_all_commits, fetch all commits using the REST API.
  if (include_all_commits) {
    stats.totalCommits = await totalCommitsFetcher(username);
  } else {
    stats.totalCommits = user.commits.totalCommitContributions;
  }

  stats.totalPRs = user.pullRequests.totalCount;
  if (include_merged_pull_requests) {
    stats.totalPRsMerged = user.mergedPullRequests?.totalCount ?? 0;
    stats.mergedPRsPercentage =
      ((user.mergedPullRequests?.totalCount ?? 0) /
        user.pullRequests.totalCount) *
        100 || 0;
  }
  stats.totalReviews = user.reviews.totalPullRequestReviewContributions;
  stats.totalIssues = user.openIssues.totalCount + user.closedIssues.totalCount;
  if (include_discussions) {
    stats.totalDiscussionsStarted = user.repositoryDiscussions?.totalCount ?? 0;
  }
  if (include_discussions_answers) {
    stats.totalDiscussionsAnswered =
      user.repositoryDiscussionComments?.totalCount ?? 0;
  }
  stats.contributedTo = user.repositoriesContributedTo.totalCount;

  // Retrieve stars while filtering out repositories to be hidden.
  const allExcludedRepos = [
    ...exclude_repo,
    ...getConfig().excludeRepositories,
  ];
  let repoToHide = new Set(allExcludedRepos);

  stats.totalStars = user.repositories.nodes
    .filter((node: RepoNode) => !repoToHide.has(node.name))
    .reduce((prev: number, curr: RepoNode) => {
      return prev + curr.stargazers.totalCount;
    }, 0);

  stats.rank = calculateRank({
    all_commits: include_all_commits,
    commits: stats.totalCommits,
    prs: stats.totalPRs,
    reviews: stats.totalReviews,
    issues: stats.totalIssues,
    stars: stats.totalStars,
    followers: user.followers.totalCount,
  });

  return stats;
};

export { fetchStats };
export default fetchStats;
