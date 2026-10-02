import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type {
  Layout,
  RepoCardOptions,
  StatCardOptions,
  ThemeNames,
  TopLangOptions,
} from "./cards/types.ts";

/** The cards this project can render. */
const CARDS = ["user", "repo", "langs"] as const;
type CardName = (typeof CARDS)[number];

/** Everything one run needs, however it was invoked. */
interface Options {
  card: CardName;
  params: URLSearchParams;
  path: string;
}

/**
 * Read a setting, preferring the name GitHub Actions uses.
 *
 * Actions passes `with:` values as `INPUT_*`. A `GH_CARD_*` prefix is also
 * accepted so the CLI can be run outside a workflow. The prefix is required
 * rather than a bare uppercase name: an unprefixed `PATH` would otherwise pick
 * up the shell's search path and send the card to a system directory.
 *
 * @param name The setting name, as it appears in action.yml.
 * @returns The resolved value, or an empty string when it is unset.
 */
const setting = (name: string): string => {
  const key = name.toUpperCase().replace(/-/g, "_");
  return process.env[`INPUT_${key}`] || process.env[`GH_CARD_${key}`] || "";
};

/**
 * Work out what to render and where to put it.
 *
 * @returns The resolved options.
 * @throws When the card name is not one this project renders.
 */
const readOptions = (): Options => {
  const card = setting("card") as CardName;
  if (!CARDS.includes(card)) {
    throw new Error(
      `Unknown card "${card}". Expected one of: ${CARDS.join(", ")}.`,
    );
  }
  const path = setting("path");
  if (!path) {
    throw new Error("No output path given. Set the `path` input.");
  }
  return { card, params: new URLSearchParams(setting("params")), path };
};

/**
 * Render one card and write it to disk.
 *
 * Reads every option from a plain record rather than from `req.query`, so it
 * stays a pure function of its arguments and can be called from a test.
 *
 * @param options The card to render and where to put it.
 * @returns The SVG that was written.
 */
export const renderCard = async ({
  card,
  params,
  path,
}: {
  card: CardName;
  params: URLSearchParams;
  path: string;
}): Promise<string> => {
  // Imported here so the token is in the environment before config.ts reads it
  // at module load. Each card pulls in its own fetcher rather than branching on
  // a union of modules, which TypeScript cannot narrow back to one shape.
  const { renderStatsCard } = await import("./cards/stats.ts");
  const { renderRepoCard } = await import("./cards/repo.ts");
  const { renderTopLanguages } = await import("./cards/top-languages.ts");

  const q = (name: string): string => params.get(name) ?? "";
  const list = (name: string): string[] =>
    params.get(name) ? params.get(name)!.split(",") : [];
  const bool = (name: string): boolean => q(name) === "true";
  const num = (name: string): number => Number.parseInt(q(name), 10);

  const shared: Partial<StatCardOptions & RepoCardOptions & TopLangOptions> = {
    title_color: q("title_color"),
    text_color: q("text_color"),
    icon_color: q("icon_color"),
    bg_color: q("bg_color"),
    border_color: q("border_color"),
    theme: q("theme") as ThemeNames,
    border_radius: q("border_radius") ? num("border_radius") : undefined,
    hide_border: bool("hide_border"),
    locale: q("locale") || undefined,
  };

  let svg: string;
  if (card === "langs") {
    const { fetchTopLanguages } = await import("./fetchers/top-languages.ts");
    const data = await fetchTopLanguages(
      q("username"),
      list("exclude_repo"),
      q("size_weight") ? Number(q("size_weight")) : 1,
      q("count_weight") ? Number(q("count_weight")) : 0,
    );
    svg = renderTopLanguages(data, {
      ...shared,
      layout: (q("layout") || "normal") as Layout,
      langs_count: q("langs_count") ? num("langs_count") : undefined,
      hide: list("hide"),
      hide_title: bool("hide_title"),
      hide_progress: bool("hide_progress"),
      card_width: q("card_width") ? num("card_width") : undefined,
      custom_title: params.get("custom_title") ?? undefined,
      disable_animations: bool("disable_animations"),
      stats_format: (q("stats_format") || "percentages") as
        | "percentages"
        | "bytes",
    });
  } else if (card === "repo") {
    const { fetchRepo } = await import("./fetchers/repo.ts");
    const data = await fetchRepo(q("username"), q("repo"));
    svg = renderRepoCard(data, {
      ...shared,
      show_owner: bool("show_owner"),
      description_lines_count: q("description_lines_count")
        ? num("description_lines_count")
        : undefined,
    });
  } else {
    const { fetchStats } = await import("./fetchers/stats.ts");
    const data = await fetchStats(
      q("username"),
      bool("include_all_commits"),
      list("exclude_repo"),
      list("show").includes("prs_merged") ||
        list("show").includes("prs_merged_percentage"),
      list("show").includes("discussions_started"),
      list("show").includes("discussions_answered"),
      q("commits_year") ? num("commits_year") : undefined,
    );
    svg = renderStatsCard(data, {
      ...shared,
      hide: list("hide"),
      show: list("show"),
      show_icons: bool("show_icons"),
      hide_title: bool("hide_title"),
      hide_rank: bool("hide_rank"),
      card_width: q("card_width") ? num("card_width") : undefined,
      include_all_commits: bool("include_all_commits"),
      commits_year: q("commits_year") ? num("commits_year") : undefined,
      line_height: q("line_height") ? num("line_height") : undefined,
      ring_color: q("ring_color"),
      text_bold: params.get("text_bold") !== "false",
      custom_title: params.get("custom_title") ?? undefined,
      disable_animations: bool("disable_animations"),
      number_format: q("number_format") || "short",
      number_precision: q("number_precision")
        ? num("number_precision")
        : undefined,
      rank_icon: (q("rank_icon") || "default") as
        | "default"
        | "github"
        | "percentile",
    });
  }

  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, svg, "utf8");
  return svg;
};

/**
 * Entry point: read the settings, render, and report where the file went.
 *
 * Failures are reported on stderr with a non-zero exit code so the workflow
 * stops, rather than being drawn onto a card nobody would notice.
 */
const main = async (): Promise<void> => {
  try {
    const options = readOptions();
    await renderCard(options);
    console.log(`Wrote ${options.card} card to ${options.path}`);
  } catch (error) {
    console.error(
      `gh-readme-card: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
};

// Only run when invoked directly, so importing the module for a test is safe.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

export { main };
