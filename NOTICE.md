# NOTICE

`gh-readme-card` is an independent, TypeScript-based rewrite of
[`github-readme-stats`](https://github.com/anuraghazra/github-readme-stats) by
Anurag Hazra, which is no longer maintained upstream.

## Licensing

This project is distributed under the MIT License — see [LICENSE](./LICENSE).

The original project is MIT-licensed, and that licence grants permission to use,
copy, modify, merge, publish, distribute, sublicense and sell the software.
**The MIT terms are conditional on retaining the original copyright notice**,
so the original copyright is preserved in `LICENSE` alongside the copyright for
this rewrite. This project is a derivative work under those terms.

## What came from where

Everything that is not listed below as new work originated in
`github-readme-stats` and remains under the original MIT copyright:

- the card rendering logic (`src/cards/`, `src/common/Card.js`, `src/common/render.js`)
- the GitHub GraphQL and WakaTime fetchers (`src/fetchers/`)
- the request retry and rate-limit handling (`src/common/retryer.js`)
- the colour system and the bundled themes (`themes/`)
- the translations (`src/translations.js`) and the language colours
  (`src/common/languageColors.json`), both of which include contributions
  from the upstream community

## What this project changed

- Rewrote the source in TypeScript, with a `strict` compiler configuration and
  a `npm run typecheck` gate.
- Rebranded: the project name, endpoints, documentation, default card titles
  and error messages are this project's own.
- Removed upstream-only automation: issue triage, stale-theme and theme-pull-request
  workflows, the theme preview tooling, and the barrel files that existed only
  for the published npm package.
- Tightened tooling: a single shared Jest configuration, ESLint coverage for
  both JavaScript and TypeScript, and hand-written ambient types for the
  dependencies that ship none.

## Trademarks

This project is **not** affiliated with, endorsed by, or sponsored by GitHub,
Inc. or Vercel Inc. "GitHub" is a trademark of GitHub, Inc.; all GitHub marks
are used for identification of the service the cards display data from. The
card icons and theme colours derived from the original project remain under the
original MIT copyright.
