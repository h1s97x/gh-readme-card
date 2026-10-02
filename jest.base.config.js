/**
 * Settings shared by every Jest project in this repo (unit, e2e, bench).
 *
 * Two things live here:
 *
 * - the swc transform, which *strips* types rather than checking them. Type
 *   errors are caught by `npm run typecheck`, not by the test run.
 * - `moduleNameMapper`, which lets sources keep the `.js` extensions that Node
 *   ESM requires while still resolving to the `.ts` files on disk.
 */
export default {
  clearMocks: true,
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          // `typescript` is a superset of `ecmascript`, so one parser handles
          // both the converted `.ts` sources and the not-yet-converted `.js`.
          parser: { syntax: "typescript", tsx: true },
          target: "es2022",
        },
        module: { type: "es6" },
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  // package.json says `type: module`, but Jest only applies that to `.js`.
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
