/* ── Health tab ──────────────────────────────────────────── */

import { apiGet } from './api.js';

const healthGrid = document.getElementById("health-grid");
const healthMeta = document.getElementById("health-meta");
const apiStatus  = document.getElementById("api-status");

function setHealthLight(key, ok) {
  if (!healthGrid) return;
  const tile = healthGrid.querySelector(`[data-health-key="${key}"]`);
  if (!tile) return;
  tile.classList.remove("ok", "err", "pending");
  tile.classList.add(ok ? "ok" : "err");
}

function setHealthPending() {
  if (!healthGrid) return;
  healthGrid.querySelectorAll(".health-tile").forEach((tile) => {
    tile.classList.remove("ok", "err", "pending");
    tile.classList.add("pending");
  });
}

export async function loadHealth() {
  setHealthPending();
  if (healthMeta) healthMeta.textContent = "Verification en cours...";
  try {
    const data = await apiGet("/health");
    const services = data?.services || {};
    const clickhouseOk = Boolean(services.clickhouse);
    const postgresOk = Boolean(services.postgres);
    const redisOk = Boolean(services.redis);
    const ok = clickhouseOk && postgresOk && redisOk;

    setHealthLight("clickhouse", clickhouseOk);
    setHealthLight("postgres", postgresOk);
    setHealthLight("redis", redisOk);
    setHealthLight("global", ok);

    if (apiStatus) {
      apiStatus.className = `api-status ${ok ? "ok" : "err"}`;
      const label = apiStatus.querySelector(".api-label");
      if (label) label.textContent = ok ? "API en ligne" : "API degradee";
    }
    if (healthMeta) {
      healthMeta.textContent = `Derniere verification: ${new Date().toLocaleTimeString("fr-FR")}`;
    }
  } catch (e) {
    setHealthLight("clickhouse", false);
    setHealthLight("postgres", false);
    setHealthLight("redis", false);
    setHealthLight("global", false);

    if (apiStatus) {
      apiStatus.className = "api-status err";
      const label = apiStatus.querySelector(".api-label");
      if (label) label.textContent = "Injoignable";
    }
    if (healthMeta) healthMeta.textContent = "Derniere verification: echec";
  }
}
