import './style.css';

interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  discarded: boolean;
}

const filterInput = document.getElementById('filter-input') as HTMLInputElement;
const statsEl = document.getElementById('stats')!;
const tabListEl = document.getElementById('tab-list')!;
const emptyStateEl = document.getElementById('empty-state')!;
const btnClose = document.getElementById('btn-close') as HTMLButtonElement;
const btnDiscard = document.getElementById('btn-discard') as HTMLButtonElement;
const btnMove = document.getElementById('btn-move') as HTMLButtonElement;
const btnDedup = document.getElementById('btn-dedup') as HTMLButtonElement;
const btnSelectAll = document.getElementById('btn-select-all')!;
const btnDeselectAll = document.getElementById('btn-deselect-all')!;

let allTabs: TabInfo[] = [];
let selectedIds = new Set<number>();

async function loadTabs() {
  const tabs = await browser.tabs.query({});
  allTabs = tabs
    .filter((t) => t.id !== undefined && t.url)
    .map((t) => ({
      id: t.id!,
      title: t.title || t.url || '',
      url: t.url!,
      favIconUrl: t.favIconUrl || '',
      discarded: t.discarded ?? false,
    }));

  // Don't show the popup's own tab
  const popupTabId = (await browser.tabs.getCurrent())?.id;
  allTabs = allTabs.filter((t) => t.id !== popupTabId);

  selectedIds.clear();
  render();
}

function getFilteredTabs(): TabInfo[] {
  const query = filterInput.value.trim();
  if (!query) return allTabs;

  try {
    const re = new RegExp(query, 'i');
    filterInput.classList.remove('invalid');
    return allTabs.filter((t) => re.test(t.url) || re.test(t.title));
  } catch {
    filterInput.classList.add('invalid');
    return [];
  }
}

function render() {
  const filtered = getFilteredTabs();

  // Clean up selected IDs to only include visible tabs
  const visibleIds = new Set(filtered.map((t) => t.id));
  for (const id of selectedIds) {
    if (!visibleIds.has(id)) selectedIds.delete(id);
  }

  statsEl.textContent = `${filtered.length} of ${allTabs.length} tabs shown, ${selectedIds.size} selected`;

  emptyStateEl.hidden = filtered.length > 0;
  tabListEl.replaceChildren();

  for (const tab of filtered) {
    const li = document.createElement('li');
    li.className = 'tab-item' + (tab.discarded ? ' discarded' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedIds.has(tab.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedIds.add(tab.id);
      } else {
        selectedIds.delete(tab.id);
      }
      updateButtons();
      updateStats(filtered);
    });

    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src =
      tab.favIconUrl ||
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%23ddd" width="16" height="16" rx="2"/></svg>';
    favicon.alt = '';

    const info = document.createElement('div');
    info.className = 'tab-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'tab-title-row';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'tab-title';
    titleDiv.textContent = tab.title;

    titleRow.append(titleDiv);

    if (tab.discarded) {
      const badge = document.createElement('span');
      badge.className = 'tab-badge-discarded';
      badge.textContent = 'unloaded';
      titleRow.append(badge);
    }

    const urlDiv = document.createElement('div');
    urlDiv.className = 'tab-url';
    urlDiv.textContent = tab.url;

    info.append(titleRow, urlDiv);

    // Click row to toggle checkbox
    li.addEventListener('click', (e) => {
      if (e.target === checkbox) return;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });

    li.append(checkbox, favicon, info);
    tabListEl.appendChild(li);
  }

  updateButtons();
}

function updateStats(filtered: TabInfo[]) {
  statsEl.textContent = `${filtered.length} of ${allTabs.length} tabs shown, ${selectedIds.size} selected`;
}

function updateButtons() {
  const hasSelection = selectedIds.size > 0;
  btnClose.disabled = !hasSelection;
  btnDiscard.disabled = !hasSelection;
  btnMove.disabled = !hasSelection;
}

// Actions
btnClose.addEventListener('click', async () => {
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  await browser.tabs.remove(ids);
  await loadTabs();
});

btnDiscard.addEventListener('click', async () => {
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  // Can't discard active tab, so discard each individually and ignore errors
  for (const id of ids) {
    try {
      await browser.tabs.discard(id);
    } catch {
      // active tab or already discarded
    }
  }
  await loadTabs();
});

btnMove.addEventListener('click', async () => {
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  const newWindow = await browser.windows.create({ tabId: ids[0] });
  if (ids.length > 1 && newWindow.id !== undefined) {
    await browser.tabs.move(ids.slice(1), {
      windowId: newWindow.id,
      index: -1,
    });
  }
  await loadTabs();
});

btnDedup.addEventListener('click', async () => {
  const seen = new Set<string>();
  const toClose: number[] = [];
  for (const tab of allTabs) {
    if (seen.has(tab.url)) {
      toClose.push(tab.id);
    } else {
      seen.add(tab.url);
    }
  }
  if (toClose.length === 0) return;
  await browser.tabs.remove(toClose);
  await loadTabs();
});

// Select/deselect
btnSelectAll.addEventListener('click', () => {
  const filtered = getFilteredTabs();
  for (const t of filtered) selectedIds.add(t.id);
  render();
});

btnDeselectAll.addEventListener('click', () => {
  selectedIds.clear();
  render();
});

// Filter input
filterInput.addEventListener('input', () => render());

// Init
loadTabs();
