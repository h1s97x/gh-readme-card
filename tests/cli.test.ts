import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { renderCard } from "../src/cli.ts";
import { mockFetch } from "./fetch-mock.ts";

const GRAPHQL = "https://api.github.com/graphql";

const userPayload = {
  data: {
    user: {
      name: "octocat",
      login: "octocat",
      commits: { totalCommitContributions: 1234 },
      reviews: { totalPullRequestReviewContributions: 56 },
      repositoriesContributedTo: { totalCount: 7 },
      pullRequests: { totalCount: 89 },
      mergedPullRequests: { totalCount: 40 },
      openIssues: { totalCount: 10 },
      closedIssues: { totalCount: 20 },
      followers: { totalCount: 42 },
      repositoryDiscussions: { totalCount: 3 },
      repositoryDiscussionComments: { totalCount: 5 },
      repositories: {
        totalCount: 2,
        nodes: [
          { name: "alpha", stargazers: { totalCount: 12 } },
          { name: "beta", stargazers: { totalCount: 8 } },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    },
  },
};

const repoPayload = {
  data: {
    user: {
      repository: {
        name: "hello-world",
        nameWithOwner: "octocat/hello-world",
        isPrivate: false,
        isArchived: false,
        isTemplate: false,
        stargazers: { totalCount: 42 },
        description: "A repository used to exercise the card renderer.",
        primaryLanguage: { color: "#3178c6", id: "1", name: "TypeScript" },
        forkCount: 7,
      },
    },
    organization: null,
  },
};

const langsPayload = {
  data: {
    user: {
      repositories: {
        nodes: [
          {
            name: "alpha",
            size: 900,
            languages: {
              edges: [
                { size: 500, node: { name: "TypeScript", color: "#3178c6" } },
              ],
            },
          },
          {
            name: "beta",
            size: 400,
            languages: {
              edges: [
                { size: 200, node: { name: "Python", color: "#3572A5" } },
              ],
            },
          },
        ],
      },
    },
  },
};

describe("cli", () => {
  let dir: string;
  let mock: ReturnType<typeof mockFetch>;

  const out = (name: string): string => join(dir, name);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gh-readme-card-"));
    mock = mockFetch();
  });

  afterEach(() => {
    mock.restore();
    rmSync(dir, { recursive: true, force: true });
  });

  describe("renderCard", () => {
    it("writes a stats card to the requested path", async () => {
      mock.onPost(GRAPHQL, userPayload);

      const svg = await renderCard({
        card: "user",
        params: new URLSearchParams("username=octocat&show_icons=true"),
        path: out("user.svg"),
      });

      expect(existsSync(out("user.svg"))).toBe(true);
      expect(svg).toBe(readFileSync(out("user.svg"), "utf8"));
      expect(svg.trimStart().startsWith("<svg")).toBe(true);
      expect(svg).toContain("</svg>");
      expect(svg).toContain("octocat");
    });

    it("applies theme and colour options from the query string", async () => {
      mock.onPost(GRAPHQL, userPayload);

      const svg = await renderCard({
        card: "user",
        params: new URLSearchParams("username=octocat&theme=dark"),
        path: out("dark.svg"),
      });

      // `dark` sets a near-black background; `default` does not.
      expect(svg).toContain("#151515");
    });

    it("creates directories that do not exist yet", async () => {
      mock.onPost(GRAPHQL, userPayload);

      await renderCard({
        card: "user",
        params: new URLSearchParams("username=octocat"),
        path: out("profile/cards/user.svg"),
      });

      expect(existsSync(out("profile/cards/user.svg"))).toBe(true);
    });

    it("renders a repo card", async () => {
      mock.onPost(GRAPHQL, repoPayload);

      const svg = await renderCard({
        card: "repo",
        params: new URLSearchParams("username=octocat&repo=hello-world"),
        path: out("repo.svg"),
      });

      expect(svg).toContain("hello-world");
      expect(svg).toContain("TypeScript");
    });

    it("renders a languages card", async () => {
      mock.onPost(GRAPHQL, langsPayload);

      const svg = await renderCard({
        card: "langs",
        params: new URLSearchParams("username=octocat&layout=compact"),
        path: out("langs.svg"),
      });

      expect(svg).toContain("TypeScript");
      expect(svg).toContain("Python");
    });

    it("passes exclude_repo through to the fetcher", async () => {
      mock.onPost(GRAPHQL, langsPayload);

      const svg = await renderCard({
        card: "langs",
        params: new URLSearchParams("username=octocat&exclude_repo=alpha"),
        path: out("excluded.svg"),
      });

      // `alpha` held all of the TypeScript, so excluding it leaves only Python.
      expect(svg).toContain("Python");
      expect(svg).not.toContain("TypeScript");
    });

    it("rejects when a required parameter is missing", async () => {
      await expect(
        renderCard({
          card: "user",
          params: new URLSearchParams(""),
          path: out("never.svg"),
        }),
      ).rejects.toThrow(/username/);

      expect(existsSync(out("never.svg"))).toBe(false);
    });
  });

  describe("main", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("rejects an unknown card name and exits non-zero", async () => {
      process.env.INPUT_CARD = "bogus";
      process.env.INPUT_PATH = out("x.svg");
      process.exitCode = undefined;

      const { main } = await import("../src/cli.ts");
      await main();

      expect(process.exitCode).toBe(1);
    });

    it("ignores a system PATH when no output path is given", async () => {
      // An unprefixed fallback would match the shell's PATH here and aim the
      // card at a system directory.
      process.env.INPUT_CARD = "user";
      process.env.INPUT_PARAMS = "username=octocat";
      delete process.env.INPUT_PATH;
      process.env.PATH = "/usr/bin:/bin";
      process.exitCode = undefined;

      const { main } = await import("../src/cli.ts");
      await main();

      expect(process.exitCode).toBe(1);
      expect(existsSync("/usr/bin/user.svg")).toBe(false);
    });

    it("accepts the GH_CARD_ prefix outside a workflow", async () => {
      mock.onPost(GRAPHQL, userPayload);
      delete process.env.INPUT_CARD;
      delete process.env.INPUT_PARAMS;
      delete process.env.INPUT_PATH;
      process.env.GH_CARD_CARD = "user";
      process.env.GH_CARD_PARAMS = "username=octocat";
      process.env.GH_CARD_PATH = out("local.svg");
      process.exitCode = undefined;

      const { main } = await import("../src/cli.ts");
      await main();

      expect(process.exitCode).toBeFalsy();
      expect(readFileSync(out("local.svg"), "utf8")).toContain("octocat");
    });

    it("requires an output path", async () => {
      process.env.INPUT_CARD = "user";
      delete process.env.INPUT_PATH;
      process.exitCode = undefined;

      const { main } = await import("../src/cli.ts");
      await main();

      expect(process.exitCode).toBe(1);
    });

    it("renders from INPUT_* variables the way the action passes them", async () => {
      mock.onPost(GRAPHQL, userPayload);
      process.env.INPUT_CARD = "user";
      process.env.INPUT_PARAMS = "username=octocat&theme=dark";
      process.env.INPUT_PATH = out("action.svg");
      process.exitCode = undefined;

      const { main } = await import("../src/cli.ts");
      await main();

      expect(process.exitCode).toBeFalsy();
      expect(readFileSync(out("action.svg"), "utf8")).toContain("octocat");
    });
  });
});
