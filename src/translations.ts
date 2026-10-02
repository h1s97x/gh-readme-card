import { encodeHTML } from "./common/html.ts";

/**
 * Retrieves stat card labels in the available locales.
 *
 * @param {object} props Function arguments.
 * @param {string} props.name The name of the locale.
 * @param {string} props.apostrophe Whether to use apostrophe or not.
 * @returns {object} The locales object.
 *
 * @see https://www.andiamo.co.uk/resources/iso-language-codes/ for language codes.
 */
const statCardLocales = ({
  name,
  apostrophe,
}: {
  name: string;
  apostrophe: string;
}) => {
  const encodedName = encodeHTML(name);
  return {
    "statcard.lastyear": {
      en: "last year",
      cn: "去年",
      "zh-tw": "去年",
    },
    "statcard.title": {
      en: `${encodedName}'${apostrophe} GitHub Stats`,
      cn: `${encodedName} 的 GitHub 统计数据`,
      "zh-tw": `${encodedName} 的 GitHub 統計資料`,
    },
    "statcard.ranktitle": {
      en: `${encodedName}'${apostrophe} GitHub Rank`,
      cn: `${encodedName} 的 GitHub 统计数据`,
      "zh-tw": `${encodedName} 的 GitHub 統計資料`,
    },
    "statcard.totalstars": {
      en: "Total Stars Earned",
      cn: "获标星数",
      "zh-tw": "得標星星數量（Star）",
    },
    "statcard.commits": {
      en: "Total Commits",
      cn: "累计提交总数",
      "zh-tw": "累計提交數量（Commit）",
    },
    "statcard.prs": {
      en: "Total PRs",
      cn: "发起的 PR 总数",
      "zh-tw": "拉取請求數量（PR）",
    },
    "statcard.issues": {
      en: "Total Issues",
      cn: "提出的 issue 总数",
      "zh-tw": "提出問題數量（Issue）",
    },
    "statcard.contribs": {
      en: "Contributed to (last year)",
      cn: "贡献的项目数（去年）",
      "zh-tw": "參與項目數量（去年）",
    },
    "statcard.reviews": {
      en: "Total PRs Reviewed",
      cn: "审查的 PR 总数",
      "zh-tw": "審核的 PR 總計",
    },
    "statcard.discussions-started": {
      en: "Total Discussions Started",
      cn: "发起的讨论总数",
      "zh-tw": "發起的討論總數",
    },
    "statcard.discussions-answered": {
      en: "Total Discussions Answered",
      cn: "回复的讨论总数",
      "zh-tw": "回覆討論總計",
    },
    "statcard.prs-merged": {
      en: "Total PRs Merged",
      cn: "合并的 PR 总数",
      "zh-tw": "合併的 PR 總計",
    },
    "statcard.prs-merged-percentage": {
      en: "Merged PRs Percentage",
      cn: "被合并的 PR 占比",
      "zh-tw": "合併的 PR 百分比",
    },
  };
};

const repoCardLocales = {
  "repocard.template": {
    en: "Template",
    cn: "模板",
    "zh-tw": "模板",
  },
  "repocard.archived": {
    en: "Archived",
    cn: "已归档",
    "zh-tw": "已封存",
  },
};

const langCardLocales = {
  "langcard.title": {
    en: "Most Used Languages",
    cn: "最常用的语言",
    "zh-tw": "最常用的語言",
  },
  "langcard.nodata": {
    en: "No languages data.",
    cn: "没有语言数据。",
    "zh-tw": "沒有語言資料。",
  },
};

const availableLocales = Object.keys(repoCardLocales["repocard.archived"]);

/**
 * Checks whether the locale is available or not.
 *
 * @param {string} locale The locale to check.
 * @returns {boolean} Boolean specifying whether the locale is available or not.
 */
const isLocaleAvailable = (locale: string): boolean => {
  return availableLocales.includes(locale.toLowerCase());
};

export {
  availableLocales,
  isLocaleAvailable,
  langCardLocales,
  repoCardLocales,
  statCardLocales,
};
