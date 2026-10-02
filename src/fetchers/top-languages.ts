import { CustomError, MissingParamError } from "../common/error.ts";
import { getConfig } from "../common/config.ts";
import { wrapTextMultiline } from "../common/fmt.ts";
import { request } from "../common/http.ts";
import { logger } from "../common/log.ts";
import { retryer } from "../common/retryer.ts";
import type { TopLangData } from "./types.ts";

/** One repository's contribution to one language. */
interface LanguageEdge {
  size: number;
  node: { name: string; color: string | null };
}

/** A repository, as the languages query returns it. */
interface RepoNode {
  name: string;
  size: number;
  languages: { edges: LanguageEdge[] };
}

/** GitHub answers with `data`, `errors`, or both. */
interface LanguagesQueryResult {
  data?: { user: { repositories: { nodes: RepoNode[] } } | null };
  errors?: { type?: string; message?: string }[];
  statusText?: string;
}

/** A language while it is being tallied, before the weights are applied. */
interface LanguageTally {
  name: string;
  color: string | null;
  size: number;
  count: number;
}

/**
 * Top languages fetcher.
 *
 * @param variables Fetcher variables.
 * @param token GitHub token.
 * @returns Languages fetcher response.
 */
const fetcher = (
  variables: { login: string },
  token: string,
): Promise<{ data: LanguagesQueryResult }> => {
  return request(
    {
      query: `
      query userInfo($login: String!) {
        user(login: $login) {
          # fetch only owner repos & not forks
          repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
            nodes {
              name
              size
              languages(
                first: 100
                orderBy: { field: SIZE, direction: DESC }
              ) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
        }
      }
    `,
      variables,
    },
    {
      Authorization: `token ${token}`,
    },
  );
};

/**
 * Fetch top languages for a given username.
 *
 * @param username GitHub username.
 * @param exclude_repo List of repositories to exclude.
 * @param size_weight Weightage to be given to size.
 * @param count_weight Weightage to be given to count.
 * @returns Top languages data.
 */
const fetchTopLanguages = async (
  username: string,
  exclude_repo: string[] = [],
  size_weight = 1,
  count_weight = 0,
): Promise<TopLangData> => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  const res = await retryer(fetcher, { login: username });

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
        "GRAPHQL_ERROR",
      );
    }
    throw new CustomError(
      "Something went wrong while trying to retrieve the language data using the GraphQL API.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const repoNodes = res.data.data?.user?.repositories.nodes ?? [];

  const excluded = new Set([
    ...exclude_repo,
    ...getConfig().excludeRepositories,
  ]);

  // Tally every language across the repositories that are not excluded.
  // `repoCount` is deliberately carried across the reduce rather than reset
  // per repository: it counts how many repositories a language appears in.
  const tallies: Record<string, LanguageTally> = {};
  let repoCount = 0;

  for (const repo of repoNodes) {
    if (excluded.has(repo.name)) {
      continue;
    }

    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      const existing = tallies[name];
      if (existing) {
        existing.size += edge.size;
        repoCount += 1;
        tallies[name] = { ...existing, count: repoCount };
      } else {
        // A language must appear in at least one repository to be counted.
        repoCount = 1;
        tallies[name] = {
          name,
          color: edge.node.color,
          size: edge.size,
          count: repoCount,
        };
      }
    }
  }

  // comparison index: weighting bytes by size_weight and repo count by
  // count_weight, so callers can rank by either or a blend of both.
  for (const tally of Object.values(tallies)) {
    tally.size =
      Math.pow(tally.size, size_weight) * Math.pow(tally.count, count_weight);
  }

  const topLangs: TopLangData = {};
  for (const name of Object.keys(tallies).sort(
    (a, b) => tallies[b].size - tallies[a].size,
  )) {
    const { name: langName, color, size, count } = tallies[name];
    topLangs[langName] = { name: langName, color: color ?? "", size, count };
  }

  return topLangs;
};

export { fetchTopLanguages };
export default fetchTopLanguages;
