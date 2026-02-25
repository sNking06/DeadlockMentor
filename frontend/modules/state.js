/* ── Shared mutable application state ───────────────────── */

export const state = {
  heroesMap: {},
  itemsMap: {},
  ranksMap: {},
  matchMetadataCache: new Map(),
  playerNameCache: new Map(),
  playerMmrCache: new Map(),
  itemsListCache: [],

  // History tab
  historyAllMatchesCache: [],
  historyMatchesCache: [],
  historyRenderedCount: 0,
  historyRenderContext: { accountId: null, playerName: "Joueur", playerProfileUrl: "" },

  // Leaderboard
  leaderboardEntriesCache: [],

  // Builds
  buildsEntriesCache: [],
  buildsCatalogLoaded: false,
  buildsCatalogPromise: null,

  // Tier list
  tierListLoaded: false,
  tierListPromise: null,

  // Compositions
  compositionTierListLoaded: false,
  compositionTierListPromise: null,
};

export const CONSTANTS = {
  deadlockApiBase: "https://api.deadlock-api.com",
  HISTORY_PAGE_SIZE: 10,
  HISTORY_AVG_DURATION_SAMPLE: 100000,
  TIERLIST_MIN_MATCHES_FIXED: 200,
  SCOUT_MATCH_COUNT: 300,
};
