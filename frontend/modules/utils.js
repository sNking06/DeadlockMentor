/* ── Pure utility functions (no dependencies) ────────────── */

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim();
}

export function dateFromUnix(unixTs) {
  if (!unixTs) return "-";
  return new Date(unixTs * 1000).toLocaleString("fr-FR");
}

export function spinnerRow(cols) {
  return `<tr><td colspan="${cols}" class="loading-row"><span class="spinner"></span> Chargement...</td></tr>`;
}

export function historyLoadingBlock(text = "Chargement...") {
  return `<div class="loading-row"><span class="spinner"></span> ${escapeHtml(text)}</div>`;
}

export function parseAccountId(rawValue) {
  const accountId = Number(rawValue);
  if (!Number.isInteger(accountId) || accountId <= 0) return null;
  return accountId;
}

export function normalizeSteamSearchResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export function normalizeMmrResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

export function didPlayerWinMatch(match) {
  const explicit = match?.player_won ?? match?.is_win ?? null;
  if (explicit === true || explicit === 1) return true;
  if (explicit === false || explicit === 0) return false;

  const team = Number(match?.player_team ?? match?.team ?? match?.team_number);
  const result = Number(match?.match_result ?? match?.winning_team);

  if (Number.isInteger(team) && Number.isInteger(result) && team >= 0 && result >= 0) {
    return team === result;
  }
  return false;
}

export function formatRelativeTime(unixTs) {
  if (!unixTs) return "-";
  const diffMs = Date.now() - unixTs * 1000;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "a l'instant";
  if (diffHours < 24) return `il y a ${diffHours}h`;
  const days = Math.floor(diffHours / 24);
  return `il y a ${days}j`;
}

export function formatDurationLabel(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}m ${secs}s`;
}

export function formatBadgeLabel(badgeValue) {
  const badge = Number(badgeValue);
  if (!Number.isInteger(badge) || badge <= 0) return "Rang inconnu";
  const division = Math.floor(badge / 10);
  const subrank = badge % 10;
  const rankName = `Rank ${division}`;
  if (subrank >= 1 && subrank <= 6) return `${rankName} ${subrank}`;
  return `${rankName} (${badge})`;
}

export function formatNumericValue(raw) {
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return String(raw);
  if (Math.abs(num) >= 1000) return `${num > 0 ? "+" : ""}${Math.round(num)}`;
  if (Math.abs(num % 1) > 0.001) return `${num > 0 ? "+" : ""}${num.toFixed(2)}`;
  return `${num > 0 ? "+" : ""}${num}`;
}

export function kdaClass(k, d, a) {
  if (!d || d === 0) return "kda-good";
  const ratio = (k + a) / d;
  if (ratio >= 3)   return "kda-good";
  if (ratio < 1.5)  return "kda-bad";
  return "kda-mid";
}

export function pickBestSearchMatch(results, rawQuery) {
  if (!Array.isArray(results) || !results.length) return null;
  const query = String(rawQuery || "").trim().toLowerCase();
  if (!query) return results[0];

  const exact = results.find((r) => String(r?.personaname || "").trim().toLowerCase() === query);
  if (exact) return exact;

  const startsWith = results.find((r) => String(r?.personaname || "").trim().toLowerCase().startsWith(query));
  if (startsWith) return startsWith;

  return results[0];
}

export async function runWithConcurrency(values, concurrency, worker) {
  const results = [];
  let i = 0;

  async function runNext() {
    while (i < values.length) {
      const index = i++;
      results[index] = await worker(values[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, values.length) }, runNext);
  await Promise.all(workers);
  return results;
}

export function buildQuery(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      usp.set(key, String(value));
    }
  });
  const query = usp.toString();
  return query ? `?${query}` : "";
}
