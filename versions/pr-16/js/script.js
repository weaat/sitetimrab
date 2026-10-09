'use strict';

/**
 * ============================================================
 * ПРАКТИКА 16: ФИНАЛЬНАЯ ИНТЕГРАЦИЯ ВСЕХ КОМПОНЕНТОВ
 * Проект: Киберспортивный турнир DotaArena 2026
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initTabsComponent();
  initFaqComponent();
  initCatalogSearchComponent();
  initRegistrationCalculatorComponent();
  initAuditChecklistInteractive();
});

// ------------------------------------------------------------
// 1. КОМПОНЕНТ ВКЛАДОК (WAI-ARIA TABS)
// ------------------------------------------------------------
function initTabsComponent() {
  const tablist = document.querySelector('[role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

  function activateTab(selectedTab, setFocus = true) {
    tabs.forEach(tab => {
      const isSelected = (tab === selectedTab);
      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
      tab.classList.toggle('tab-btn--active', isSelected);

      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) {
        if (isSelected) {
          panel.removeAttribute('hidden');
          panel.classList.add('tab-panel--active');
        } else {
          panel.setAttribute('hidden', '');
          panel.classList.remove('tab-panel--active');
        }
      }
    });

    if (setFocus && selectedTab) selectedTab.focus();
  }

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) activateTab(tab, false);
  });

  tablist.addEventListener('keydown', (e) => {
    const currentTab = e.target.closest('[role="tab"]');
    if (!currentTab) return;
    const idx = tabs.indexOf(currentTab);
    let targetIdx = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIdx = (idx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIdx = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIdx = tabs.length - 1;
    }

    if (targetIdx !== null) activateTab(tabs[targetIdx], true);
  });
}

// ------------------------------------------------------------
// 2. КОМПОНЕНТ FAQ АККОРДЕОНА
// ------------------------------------------------------------
function initFaqComponent() {
  const triggers = document.querySelectorAll('.faq-trigger');
  triggers.forEach(tr => {
    tr.addEventListener('click', () => {
      const isExpanded = tr.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(tr.getAttribute('aria-controls'));
      tr.setAttribute('aria-expanded', !isExpanded ? 'true' : 'false');
      if (panel) {
        if (!isExpanded) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      }
    });
  });
}

// ------------------------------------------------------------
// 3. КОМПОНЕНТ ПОИСКА И МОДАЛЬНОГО ОКНА
// ------------------------------------------------------------
function initCatalogSearchComponent() {
  const searchInput = document.getElementById('search-input');
  const catSelect = document.getElementById('cat-select');
  const countEl = document.getElementById('catalog-count');
  const emptyEl = document.getElementById('catalog-empty');
  const cards = document.querySelectorAll('.cat-card');
  const modal = document.getElementById('final-dialog');
  const closeBtn = document.getElementById('btn-dialog-close');
  let lastFocus = null;

  function doFilter() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const cat = catSelect?.value || 'all';
    let visible = 0;

    cards.forEach(card => {
      const cardCat = card.dataset.category || '';
      const text = (card.textContent || '').toLowerCase();
      const matchCat = (cat === 'all' || cardCat === cat);
      const matchQ = (!q || text.includes(q));

      if (matchCat && matchQ) {
        card.removeAttribute('hidden');
        visible++;
      } else {
        card.setAttribute('hidden', '');
      }
    });

    if (countEl) countEl.textContent = String(visible);
    if (emptyEl) emptyEl.hidden = (visible > 0);
  }

  if (searchInput) searchInput.addEventListener('input', doFilter);
  if (catSelect) catSelect.addEventListener('change', doFilter);

  // Модальное окно
  cards.forEach(card => {
    card.addEventListener('click', () => {
      lastFocus = card;
      const title = card.querySelector('h3')?.textContent || '';
      const desc = card.querySelector('p')?.textContent || '';
      const dlgTitle = document.getElementById('dialog-title');
      const dlgDesc = document.getElementById('dialog-body');
      if (dlgTitle) dlgTitle.textContent = title;
      if (dlgDesc) dlgDesc.textContent = desc;

      if (modal) {
        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
        if (closeBtn) closeBtn.focus();
      }
    });
  });

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
      if (lastFocus) lastFocus.focus();
    });

    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const inBox = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!inBox) {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
        if (lastFocus) lastFocus.focus();
      }
    });
  }
}

// ------------------------------------------------------------
// 4. КОМПОНЕНТ ВАЛИДАЦИИ ФОРМЫ И КАЛЬКУЛЯТОРА
// ------------------------------------------------------------
function initRegistrationCalculatorComponent() {
  const form = document.getElementById('final-reg-form');
  const resultCard = document.getElementById('final-result-card');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = form.querySelector('[name="tName"]');
    const mmrInput = form.querySelector('[name="tMmr"]');
    const tierSelect = form.querySelector('[name="tTier"]');
    const errName = document.getElementById('err-name');
    const errMmr = document.getElementById('err-mmr');

    if (errName) errName.textContent = '';
    if (errMmr) errMmr.textContent = '';
    nameInput?.removeAttribute('aria-invalid');
    mmrInput?.removeAttribute('aria-invalid');

    const nameVal = (nameInput?.value || '').trim();
    const mmrVal = Number(mmrInput?.value);
    const tierVal = tierSelect?.value || 'amateur';

    let hasErr = false;
    if (!nameVal || nameVal.length < 3) {
      if (errName) errName.textContent = 'Укажите название команды (от 3 симв.)';
      nameInput?.setAttribute('aria-invalid', 'true');
      nameInput?.focus();
      hasErr = true;
    }

    if (!Number.isFinite(mmrVal) || mmrVal < 3000 || mmrVal > 15000) {
      if (errMmr) errMmr.textContent = 'MMR должен быть от 3 000 до 15 000';
      mmrInput?.setAttribute('aria-invalid', 'true');
      if (!hasErr) mmrInput?.focus();
      hasErr = true;
    } else if (tierVal === 'pro' && mmrVal < 10000) {
      if (errMmr) errMmr.textContent = 'Для PRO-дивизиона требуется MMR от 10 000';
      mmrInput?.setAttribute('aria-invalid', 'true');
      if (!hasErr) mmrInput?.focus();
      hasErr = true;
    }

    if (hasErr) {
      if (resultCard) resultCard.hidden = true;
      return;
    }

    // Расчёт
    let fee = 2500;
    if (tierVal === 'semipro') fee = 6000;
    if (tierVal === 'pro') fee = 12000;

    const seed = Math.round(mmrVal / 10 + 150);

    if (resultCard) {
      resultCard.innerHTML = `
        <div style="font-weight: 800; color: #38bdf8; margin-bottom: 0.5rem;">Заявка принята!</div>
        <h4 style="font-size: 1.3rem; margin-bottom: 0.5rem; color: #fff;">${escapeHtml(nameVal)}</h4>
        <p style="color: #94a3b8; font-size: 0.9rem;">Дивизион: <strong>${escapeHtml(tierVal.toUpperCase())}</strong> | MMR: <strong>${mmrVal}</strong></p>
        <p style="color: #94a3b8; font-size: 0.9rem;">Взнос: <strong style="color: #22c55e;">${fee.toLocaleString('ru-RU')} RUB</strong> | Seed Rating: <strong style="color: #f59e0b;">${seed} pts</strong></p>
      `;
      resultCard.hidden = false;
      resultCard.focus();
    }
  });
}

// ------------------------------------------------------------
// 5. ИНТЕРАКТИВНЫЙ ЧЕК-ЛИСТ ФИНАЛЬНОГО АУДИТА
// ------------------------------------------------------------
function initAuditChecklistInteractive() {
  const checkboxes = document.querySelectorAll('.audit-checkbox');
  const auditProgressEl = document.getElementById('audit-progress');

  function updateAudit() {
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    if (auditProgressEl) {
      auditProgressEl.textContent = `${checked} из ${total} проверок пройдено (${Math.round((checked / total) * 100)}%)`;
    }
  }

  checkboxes.forEach(cb => cb.addEventListener('change', updateAudit));
  updateAudit();
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
