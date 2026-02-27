import { state } from './state.js';
import { escapeHtml } from './utils.js';

const RESALE_RATE = 0.5;

const shopState = {
  inventory: new Map(),
  totalSpent: 0,
  totalEarned: 0,
  startingSouls: 3000,
};

const refs = {
  searchInput: null,
  qtyInput: null,
  startingSoulsInput: null,
  select: null,
  buyBtn: null,
  sellBtn: null,
  feedback: null,
  inventoryBody: null,
  totalSpent: null,
  totalEarned: null,
  currentValue: null,
  currentSouls: null,
  totalWorth: null,
  netValue: null,
};

export function initShopTab() {
  refs.searchInput = document.getElementById('shop-item-search');
  refs.qtyInput = document.getElementById('shop-qty');
  refs.startingSoulsInput = document.getElementById('shop-starting-souls');
  refs.select = document.getElementById('shop-item-select');
  refs.buyBtn = document.getElementById('shop-buy-btn');
  refs.sellBtn = document.getElementById('shop-sell-btn');
  refs.feedback = document.getElementById('shop-feedback');
  refs.inventoryBody = document.getElementById('shop-inventory-body');
  refs.totalSpent = document.getElementById('shop-total-spent');
  refs.totalEarned = document.getElementById('shop-total-earned');
  refs.currentValue = document.getElementById('shop-current-value');
  refs.currentSouls = document.getElementById('shop-current-souls');
  refs.totalWorth = document.getElementById('shop-total-worth');
  refs.netValue = document.getElementById('shop-net-value');

  if (!refs.select || !refs.buyBtn || !refs.sellBtn) return;

  refs.searchInput?.addEventListener('input', refreshShopOptions);
  refs.startingSoulsInput?.addEventListener('input', () => {
    shopState.startingSouls = getNonNegativeNumber(refs.startingSoulsInput?.value, 3000);
    renderSummary();
  });
  refs.buyBtn.addEventListener('click', () => executeTrade('buy'));
  refs.sellBtn.addEventListener('click', () => executeTrade('sell'));

  refreshShopOptions();
  renderInventory();
  renderSummary();
}

function getPositiveInteger(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function getTradableItems() {
  return state.itemsListCache
    .filter((item) => Number(item?.cost) > 0)
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'fr'));
}

function refreshShopOptions() {
  if (!refs.select) return;
  const query = String(refs.searchInput?.value || '').trim().toLowerCase();
  const items = getTradableItems().filter((item) => {
    if (!query) return true;
    return String(item?.name || '').toLowerCase().includes(query);
  });

  refs.select.innerHTML = items.length
    ? items.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} — ${formatSouls(item.cost)}</option>`).join('')
    : '<option value="">Aucun item trouvé</option>';

  if (!items.length) {
    setFeedback('Aucun item ne correspond à la recherche.', 'warn');
  } else {
    setFeedback(`Items disponibles: ${items.length}.`, 'ok');
  }
}

function executeTrade(type) {
  const itemId = Number(refs.select?.value);
  const quantity = getPositiveInteger(refs.qtyInput?.value, 1);
  const item = state.itemsMap[itemId];

  if (!item || Number(item?.cost) <= 0) {
    setFeedback("Choisis un item valide d'abord.", 'error');
    return;
  }

  const existing = shopState.inventory.get(itemId) || {
    itemId,
    name: item.name || `Item #${itemId}`,
    cost: Number(item.cost) || 0,
    quantity: 0,
  };

  const buyCost = existing.cost * quantity;
  const sellRevenue = Math.round(existing.cost * RESALE_RATE) * quantity;
  const currentSouls = getCurrentSouls();

  if (type === 'sell' && existing.quantity < quantity) {
    setFeedback(`Impossible de vendre ${quantity}x ${existing.name} (stock: ${existing.quantity}).`, 'error');
    return;
  }

  if (type === 'buy' && currentSouls < buyCost) {
    setFeedback(`Pas assez de souls (${formatSouls(currentSouls)} disponibles).`, 'error');
    return;
  }

  if (type === 'buy') {
    existing.quantity += quantity;
    shopState.totalSpent += buyCost;
    setFeedback(`Achat: ${quantity}x ${existing.name} pour ${formatSouls(buyCost)}.`, 'ok');
  } else {
    existing.quantity -= quantity;
    shopState.totalEarned += sellRevenue;
    setFeedback(`Vente: ${quantity}x ${existing.name} pour ${formatSouls(sellRevenue)} (${Math.round(RESALE_RATE * 100)}%).`, 'warn');
  }

  if (existing.quantity <= 0) {
    shopState.inventory.delete(itemId);
  } else {
    shopState.inventory.set(itemId, existing);
  }

  renderInventory();
  renderSummary();
}

function renderInventory() {
  if (!refs.inventoryBody) return;
  const rows = Array.from(shopState.inventory.values()).sort((a, b) => b.cost - a.cost);

  if (!rows.length) {
    refs.inventoryBody.innerHTML = '<tr><td colspan="5" class="empty-row">Aucun item acheté.</td></tr>';
    return;
  }

  refs.inventoryBody.innerHTML = rows.map((row) => {
    const value = row.quantity * row.cost;
    return `<tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${formatSouls(row.cost)}</td>
      <td>${row.quantity}</td>
      <td>${formatSouls(value)}</td>
      <td><button type="button" class="btn shop-row-sell" data-item-id="${row.itemId}">Vendre 1</button></td>
    </tr>`;
  }).join('');

  refs.inventoryBody.querySelectorAll('.shop-row-sell').forEach((btn) => {
    btn.addEventListener('click', () => {
      refs.select.value = btn.dataset.itemId;
      if (refs.qtyInput) refs.qtyInput.value = '1';
      executeTrade('sell');
    });
  });
}

function getCurrentSouls() {
  return shopState.startingSouls - shopState.totalSpent + shopState.totalEarned;
}

function renderSummary() {
  const currentValue = Array.from(shopState.inventory.values()).reduce((sum, row) => sum + (row.quantity * row.cost), 0);
  const currentSouls = getCurrentSouls();
  const totalWorth = currentSouls + currentValue;
  const realizedNet = shopState.totalEarned - shopState.totalSpent;

  if (refs.totalSpent) refs.totalSpent.textContent = formatSouls(shopState.totalSpent);
  if (refs.totalEarned) refs.totalEarned.textContent = formatSouls(shopState.totalEarned);
  if (refs.currentValue) refs.currentValue.textContent = formatSouls(currentValue);
  if (refs.currentSouls) refs.currentSouls.textContent = formatSouls(currentSouls);
  if (refs.totalWorth) refs.totalWorth.textContent = formatSouls(totalWorth);
  if (refs.netValue) refs.netValue.textContent = formatSouls(realizedNet);

  refs.currentSouls?.classList.toggle('is-negative', currentSouls < 0);
  refs.currentSouls?.classList.toggle('is-positive', currentSouls >= 0);
  refs.totalWorth?.classList.toggle('is-negative', totalWorth < 0);
  refs.totalWorth?.classList.toggle('is-positive', totalWorth >= 0);
  refs.netValue?.classList.toggle('is-positive', realizedNet >= 0);
  refs.netValue?.classList.toggle('is-negative', realizedNet < 0);
}

function setFeedback(message, tone = '') {
  if (!refs.feedback) return;
  refs.feedback.textContent = message;
  refs.feedback.dataset.tone = tone;
}

function formatSouls(value) {
  const amount = Math.round(Number(value) || 0);
  return `${amount.toLocaleString('fr-FR')} souls`;
}
