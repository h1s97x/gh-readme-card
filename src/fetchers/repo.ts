import { MissingParamError } from "../common/error.ts";
import { request } from "../common/http.ts";
import { retryer } from "../common/retryer.ts";
import type { RepositoryData } from "./types.ts";

/** Shown when a required parameter is missing. */
const urlExample = "card=repo&username=USERNAME&repo=REPO_NAME";

/** Variables the repo query takes. */
interface RepoVariables {
  login: string;
  repo: string;
}

/** The shape the repo query returns, for either a user or an organization. */
interface RepoQueryResult {
  user: { repository: RepositoryData | null } | null;
  organization: { repository: RepositoryData | null } | null;
}

/**
 * Repo data fetcher.
 *
 * @param variables Fetcher variables.
 * @param token GitHub token.
 * @returns The response.
 */
const fetcher = (
  variables: RepoVariables,
  token: string,
): Promise<{ data: { data: RepoQueryResult } }> => {
  return request(
    {
      query: `
      fragment RepoInfo on Repository {
        name
        nameWithOwner
        isPrivate
        isArchived
        isTemplate
        stargazers {
          totalCount
        }
        description
        primaryLanguage {
          color
          id
          name
        }
        forkCount
      }
      query getRepo($login: String!, $repo: String!) {
        user(login: $login) {
          repository(name: $repo) {
            ...RepoInfo
          }
        }
        organization(login: $login) {
          repository(name: $repo) {
            ...RepoInfo
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
 * Fetch repository data.
 *
 * Looks the repository up under both the user and the organization namespace,
 * because a repository can belong to either.
 *
 * @param username GitHub username or organization login.
 * @param reponame GitHub repository name.
 * @returns Repository data.
 */
const fetchRepo = async (
  username: string,
  reponame: string,
): Promise<RepositoryData> => {
  if (!username && !reponame) {
    throw new MissingParamError(["username", "repo"], urlExample);
  }
  if (!username) {
    throw new MissingParamError(["username"], urlExample);
  }
  if (!reponame) {
    throw new MissingParamError(["repo"], urlExample);
  }

  const res = await retryer(fetcher, { login: username, repo: reponame });

  const data = res.data!.data;

  if (!data.user && !data.organization) {
    throw new Error("Not found");
  }

  // Exactly one of the two namespaces holds the repository; GitHub returns
  // null for the other. The guards below narrow the union so the repository
  // field is known to exist.
  const owner = data.user
    ? { kind: "user" as const, repository: data.user.repository }
    : data.organization
      ? {
          kind: "organization" as const,
          repository: data.organization.repository,
        }
      : null;

  if (!owner || !owner.repository || owner.repository.isPrivate) {
    throw new Error(
      owner?.kind === "organization"
        ? "Organization Repository Not found"
        : "User Repository Not found",
    );
  }

  return {
    ...owner.repository,
    starCount: owner.repository.stargazers.totalCount,
  };
};

export { fetchRepo };
export default fetchRepo;
