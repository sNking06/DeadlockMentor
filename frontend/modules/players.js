/* ── Player name/MMR resolution and display ──────────────── */

import { state } from './state.js';
import { deadlockGet } from './api.js';
import { parseAccountId } from './utils.js';
import { hydratePlayerMmr } from './ranks.js';

export function pickPlayerPseudo(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    if (/^#?\d+$/.test(text)) continue;
    return text;
  }
  return null;
}

export function resolvePlayerPseudo(player) {
  const accountId = Number(player?.account_id);
  const fromPlayer = pickPlayerPseudo(
    player?.account_name,
    player?.persona_name,
    player?.player_name,
    player?.name,
    player?.profile_name,
    player?.steam_name,
    player?.player_info?.account_name,
    player?.player_info?.persona_name,
  );
  if (fromPlayer) {
    if (Number.isInteger(accountId) && accountId > 0) state.playerNameCache.set(accountId, fromPlayer);
    return fromPlayer;
  }
  if (Number.isInteger(accountId) && accountId > 0 && state.playerNameCache.has(accountId)) {
    return state.playerNameCache.get(accountId);
  }
  return "Joueur inconnu";
}

export async function hydratePlayerNames(players = []) {
  const missingIds = Array.from(
    new Set(
      players
        .map((p) => Number(p?.account_id))
        .filter((id) => Number.isInteger(id) && id > 0)
        .filter((id) => !state.playerNameCache.has(id))
        .filter((id) => {
          const player = players.find((p) => Number(p?.account_id) === id);
          return !pickPlayerPseudo(
            player?.account_name,
            player?.persona_name,
            player?.player_name,
            player?.name,
            player?.profile_name,
            player?.steam_name,
            player?.player_info?.account_name,
            player?.player_info?.persona_name,
          );
        })
    )
  );

  if (!missingIds.length) return;

  try {
    const profiles = await deadlockGet("/v1/players/steam", {
      account_ids: missingIds,
    });
    if (!Array.isArray(profiles)) return;
    profiles.forEach((profile) => {
      const accountId = Number(profile?.account_id);
      const pseudo = pickPlayerPseudo(profile?.personaname, profile?.realname);
      if (Number.isInteger(accountId) && accountId > 0 && pseudo) {
        state.playerNameCache.set(accountId, pseudo);
      }
    });
  } catch (_) {}
}

export function showPlayerInfo(panel, nameEl, idEl, accountId, playerName) {
  if (!panel || !nameEl || !idEl) return;
  nameEl.textContent = (playerName || "Joueur inconnu").toString();
  idEl.textContent = `(#${accountId})`;
  panel.style.display = "block";
}

export function hidePlayerInfo(panel) {
  if (!panel) return;
  panel.style.display = "none";
}

export function setHistoryAvatar(avatarUrl = "", playerName = "") {
  const historyAvatarImg = document.getElementById("history-avatar-img");
  const historyAvatarFallback = document.getElementById("history-avatar-fallback");
  if (!historyAvatarImg || !historyAvatarFallback) return;
  const src = String(avatarUrl || "").trim();
  if (src) {
    historyAvatarImg.src = src;
    historyAvatarImg.hidden = false;
    historyAvatarFallback.hidden = true;
    return;
  }
  const letter = String(playerName || "").trim().charAt(0).toUpperCase() || "S";
  historyAvatarFallback.textContent = letter;
  historyAvatarFallback.hidden = false;
  historyAvatarImg.hidden = true;
  historyAvatarImg.removeAttribute("src");
}

// ── Leaderboard player resolution ──

export function normalizeNameForMatch(value) {
  return String(value || "").trim().toLowerCase();
}

function getLeaderboardCandidateAccountIds(entry) {
  const direct = [
    entry?.account_id,
    entry?.player_account_id,
    entry?.steam_account_id,
    entry?.accountId,
  ]
    .map(parseAccountId)
    .filter(Boolean);
  if (direct.length) return [...new Set(direct)];

  const possible = Array.isArray(entry?.possible_account_ids) ? entry.possible_account_ids : [];
  return [...new Set(possible.map(parseAccountId).filter(Boolean))];
}

export function getLeaderboardProfileId(entry) {
  const candidates = getLeaderboardCandidateAccountIds(entry);
  if (candidates.length === 1) return candidates[0];
  const resolved = parseAccountId(entry?._resolved_profile_id);
  if (resolved) return resolved;
  return null;
}

function scoreLeaderboardCandidate(entry, candidateId) {
  let score = 0;
  const candidateMmr = state.playerMmrCache.get(candidateId);
  const targetDivision = Number(entry?.ranked_rank || 0);
  const targetSubrank = Number(entry?.ranked_subrank || 0);
  const targetName = normalizeNameForMatch(entry?.account_name);
  const candidateName = normalizeNameForMatch(state.playerNameCache.get(candidateId));

  if (targetName && candidateName) {
    if (targetName === candidateName) score += 30;
    else if (candidateName.startsWith(targetName) || targetName.startsWith(candidateName)) score += 10;
  }

  if (candidateMmr) {
    if (targetDivision > 0 && Number(candidateMmr.division) === targetDivision) score += 50;
    if (targetSubrank > 0 && Number(candidateMmr.divisionTier) === targetSubrank) score += 30;
    if (targetDivision > 0 && targetSubrank > 0 &&
        Number(candidateMmr.division) === targetDivision &&
        Number(candidateMmr.divisionTier) === targetSubrank) {
      score += 40;
    }
  }

  return score;
}

export async function resolveLeaderboardProfileIds(entries = []) {
  if (!Array.isArray(entries) || !entries.length) return;

  const unresolved = entries.filter((entry) => getLeaderboardCandidateAccountIds(entry).length > 1);
  if (!unresolved.length) return;

  const allCandidateIds = Array.from(
    new Set(unresolved.flatMap((entry) => getLeaderboardCandidateAccountIds(entry)))
  );
  if (!allCandidateIds.length) return;

  await Promise.all([
    hydratePlayerMmr(allCandidateIds),
    hydratePlayerNames(allCandidateIds.map((id) => ({ account_id: id }))),
  ]);

  unresolved.forEach((entry) => {
    const candidates = getLeaderboardCandidateAccountIds(entry);
    if (!candidates.length) return;

    const scored = candidates
      .map((id) => ({ id, score: scoreLeaderboardCandidate(entry, id) }))
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return;
    if (scored.length === 1) {
      entry._resolved_profile_id = scored[0].id;
      return;
    }

    const best = scored[0];
    const second = scored[1];
    if (best.score <= 0) return;
    if (second && best.score === second.score) return;
    entry._resolved_profile_id = best.id;
  });
}
