'use strict';

/**
 * ============================================================
 * ПРАКТИКА 15: ПОИСК, ФИЛЬТРАЦИЯ КАТАЛОГА И ЕДИНОЕ МОДАЛЬНОЕ ОКНО
 * Проект: Киберспортивный турнир DotaArena 2026
 * ============================================================
 */

// База данных карточек каталога (команды и мерч турнира)
const catalogItems = [
  {
    id: 'team-gazbloki',
    category: 'teams',
    title: 'gazbloki31.ru',
    subtitle: 'Восточная Европа (СНГ) · 11 850 MMR',
    tag: 'GZ31',
    description: 'Официальный титульный ростер генерального спонсора турнира. Победители открытых квалификаций.',
    details: {
      captain: 'Kirill "gazobeton" V.',
      roster: '5 игроков основного состава + запас',
      achievements: '1-е место на Belgorod Open Cyber Cup 2026',
      hero: 'Storm Spirit, Invoker, Hoodwink'
    }
  },
  {
    id: 'team-spirit',
    category: 'teams',
    title: 'Team Spirit',
    subtitle: 'Восточная Европа (СНГ) · 12 600 MMR',
    tag: 'TS',
    description: 'Легендарный состав, двукратные триумфаторы The International. Главный фаворит турнирной сетки.',
    details: {
      captain: 'Yaroslav "Miposhka" N.',
      roster: 'Yatoro, Larl, Collapse, Mira, Miposhka',
      achievements: 'The International 10 & 12 Champions',
      hero: 'Magnus, Morphling, Faceless Void'
    }
  },
  {
    id: 'team-gladiators',
    category: 'teams',
    title: 'Gaimin Gladiators',
    subtitle: 'Западная Европа · 12 400 MMR',
    tag: 'GG',
    description: 'Европейский гранд, славящийся сверхагрессивным стилем и быстрым сносом башен.',
    details: {
      captain: 'Melchior "Seleri" H.',
      roster: 'dyrachyo, Quinn, Ace, tOfu, Seleri',
      achievements: 'Riyadh Masters Champions, Major Winners',
      hero: 'Pangolier, Chen, Alchemist'
    }
  },
  {
    id: 'team-liquid',
    category: 'teams',
    title: 'Team Liquid',
    subtitle: 'Западная Европа · 12 550 MMR',
    tag: 'TL',
    description: 'Действующие чемпионы мира, непревзойденные мастера макро-игры и глубоких драфтов.',
    details: {
      captain: 'Aydin "iNSaNiA" S.',
      roster: 'miCKe, Nisha, 33, Boxi, iNSaNiA',
      achievements: 'The International 2024 Champions',
      hero: 'Visage, Shadow Fiend, Rubick'
    }
  },
  {
    id: 'merch-origin',
    category: 'merch',
    title: 'Футболка "Origin" gazbloki31.ru',
    subtitle: 'Официальный мерч · 1 337 RUB',
    tag: 'MERCH',
    description: 'Белая оверсайз футболка премиум-хлопка плотностью 240 г/м² с минималистичным турнирным логотипом.',
    details: {
      material: '100% чесаный премиум-хлопок',
      print: 'Стойкая DTF-печать повышенной четкости',
      sizes: 'S, M, L, XL, XXL (Unisex Oversize)',
      price: '1 337 рублей'
    }
  },
  {
    id: 'merch-cross',
    category: 'merch',
    title: 'Футболка "Крестовый поход"',
    subtitle: 'Официальный мерч · 1 337 RUB',
    tag: 'MERCH',
    description: 'Белая футболка с детализированным артом тёмной дуэли и рунической гравировкой Aegis of Champions.',
    details: {
      material: '100% чесаный хлопок 240 г/м²',
      print: 'Шелкография с эффектом металлика',
      sizes: 'S, M, L, XL, XXL',
      price: '1 337 рублей'
    }
  },
  {
    id: 'merch-choose',
    category: 'merch',
    title: 'Футболка "Выбирай: я или gazbloki31.ru"',
    subtitle: 'Официальный мерч · 1 337 RUB',
    tag: 'MERCH',
    description: 'Фирменная мем-коллекция состава gazbloki31.ru. Белый оверсайз крой с принтом на спине.',
    details: {
      material: '100% чесаный хлопок повышенной плотности',
      print: 'Премиальный полноцветный DTF принт',
      sizes: 'S, M, L, XL, XXL',
      price: '1 337 рублей'
    }
  },
  {
    id: 'hero-storm',
    category: 'heroes',
    title: 'Storm Spirit (Райдзин)',
    subtitle: 'Герой турнира · Интеллект / Мобильность',
    tag: 'HERO',
    description: 'Один из трех ключевых маскотов турнира DotaArena 2026. Неуловимый дух шторма с бесконечным Ball Lightning.',
    details: {
      primaryAttr: 'Интеллект / Универсальный потенциал',
      role: 'Carry / Midlane / Initiator / Escape',
      winrate: '54.2% в матчах квалификаций',
      complexity: 'Высокая (3/3 звезды)'
    }
  },
  {
    id: 'hero-hoodwink',
    category: 'heroes',
    title: 'Hoodwink (Проказница)',
    subtitle: 'Герой турнира · Ловкость / Снайпер',
    tag: 'HERO',
    description: 'Лесная снайперша с дальнобойным Sharpshooter и коварным Acorn Shot. Любимый выбор саппортов.',
    details: {
      primaryAttr: 'Ловкость',
      role: 'Support / Nuker / Disabler / Escape',
      winrate: '52.8% на турнире',
      complexity: 'Средняя (2/3 звезды)'
    }
  },
  {
    id: 'hero-sf',
    category: 'heroes',
    title: 'Shadow Fiend (Невермор)',
    subtitle: 'Герой турнира · Ловкость / Нюкер',
    tag: 'HERO',
    description: 'Повелитель душ и классический мидер, собирающий Necromastery и разрывающий в Requiem of Souls.',
    details: {
      primaryAttr: 'Ловкость',
      role: 'Carry / Nuker',
      winrate: '51.5% в плей-офф',
      complexity: 'Средняя (2/3 звезды)'
    }
  }
];

// Хранилище последнего сфокусированного элемента перед открытием модального окна
let lastFocusedElement = null;

// ------------------------------------------------------------
// ЭТАП 2, 3, 4, 5: ПОИСК, НОРМАЛИЗАЦИЯ И ОБЪЕДИНЕНИЕ УСЛОВИЙ
// ------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('catalog-search-input');
  const categorySelect = document.getElementById('catalog-category-select');
  const searchCountEl = document.getElementById('search-count');
  const resetBtn = document.getElementById('btn-search-reset');
  const emptyStateEl = document.getElementById('search-empty');
  const gridContainer = document.getElementById('catalog-grid');

  /**
   * Предикат фильтрации элементов каталога (Этап 4 методички)
   * Карточка отображается ТОЛЬКО если удовлетворяет поиску И категории одновременно
   * @param {Object} item Элемент каталога
   * @param {string} normQuery Нормализованный поисковый запрос (trim + toLowerCase)
   * @param {string} selectedCat Выбранная категория
   * @returns {boolean}
   */
  function matchesFilter(item, normQuery, selectedCat) {
    // 1. Проверка категории
    const catMatch = (selectedCat === 'all' || item.category === selectedCat);
    if (!catMatch) return false;

    // 2. Проверка поискового запроса
    if (!normQuery) return true;

    // Нормализация текстов карточки
    const normTitle = item.title.trim().toLowerCase();
    const normSub = item.subtitle.trim().toLowerCase();
    const normDesc = item.description.trim().toLowerCase();
    const normTag = item.tag.trim().toLowerCase();

    return (
      normTitle.includes(normQuery) ||
      normSub.includes(normQuery) ||
      normDesc.includes(normQuery) ||
      normTag.includes(normQuery)
    );
  }

  /**
   * Главная функция применения фильтра и обновления UI (Этап 5)
   */
  function applyFilters() {
    // Этап 3: Нормализация запроса
    const rawQuery = searchInput ? searchInput.value : '';
    const normQuery = rawQuery.trim().toLowerCase();
    const selectedCat = categorySelect ? categorySelect.value : 'all';

    const cards = gridContainer ? gridContainer.querySelectorAll('.catalog-card') : [];
    let visibleCount = 0;

    cards.forEach(card => {
      const itemId = card.dataset.id;
      const item = catalogItems.find(it => it.id === itemId);

      if (item && matchesFilter(item, normQuery, selectedCat)) {
        card.removeAttribute('hidden');
        card.classList.remove('catalog-card--hidden');
        visibleCount++;
      } else {
        card.setAttribute('hidden', '');
        card.classList.add('catalog-card--hidden');
      }
    });

    // Обновление счётчика найденных записей
    if (searchCountEl) {
      searchCountEl.textContent = String(visibleCount);
    }

    // Показ отдельного сообщения при нулевом результате
    if (emptyStateEl) {
      emptyStateEl.hidden = (visibleCount > 0);
    }
  }

  // Слушатели событий ввода и выбора
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', applyFilters);
  }

  // Кнопка сброса всех параметров поиска
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categorySelect) categorySelect.value = 'all';
      applyFilters();
      if (searchInput) searchInput.focus();
    });
  }

  // Инициализация модального окна и карточек
  initSingleModalDialog();
  applyFilters();
  initTestCasePresets();
});

// ------------------------------------------------------------
// ЭТАП 6 И 7: ЕДИНОЕ МОДАЛЬНОЕ ОКНО (<dialog>) И УПРАВЛЕНИЕ ФОКУСОМ
// ------------------------------------------------------------

function initSingleModalDialog() {
  const modal = document.getElementById('catalog-modal');
  const closeBtn = document.getElementById('btn-modal-close');
  const modalTitle = document.getElementById('modal-title');
  const modalSub = document.getElementById('modal-subtitle');
  const modalBadge = document.getElementById('modal-badge');
  const modalDesc = document.getElementById('modal-desc');
  const modalDetailsList = document.getElementById('modal-details-list');
  const gridContainer = document.getElementById('catalog-grid');

  if (!modal) return;

  /**
   * Открытие модального окна для конкретного объекта каталога
   * @param {Object} item Данные выбранного элемента
   * @param {HTMLElement} triggerElement Элемент, по которому кликнули
   */
  function openModal(item, triggerElement) {
    lastFocusedElement = triggerElement;

    if (modalTitle) modalTitle.textContent = item.title;
    if (modalSub) modalSub.textContent = item.subtitle;
    if (modalBadge) modalBadge.textContent = item.tag;
    if (modalDesc) modalDesc.textContent = item.description;

    if (modalDetailsList) {
      modalDetailsList.innerHTML = Object.entries(item.details).map(([key, val]) => `
        <div class="modal-detail-row">
          <dt>${escapeHtml(key)}:</dt>
          <dd><strong>${escapeHtml(String(val))}</strong></dd>
        </div>
      `).join('');
    }

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }

    // Фокус на кнопку закрытия
    if (closeBtn) closeBtn.focus();
  }

  /**
   * Закрытие модального окна с возвратом фокуса на источник
   */
  function closeModal() {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }

    // Этап 7: Возврат фокуса на элемент-источник
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  // Клик по карточке каталога (делегирование через общий контейнер)
  if (gridContainer) {
    gridContainer.addEventListener('click', (event) => {
      const card = event.target.closest('.catalog-card');
      if (!card) return;

      const itemId = card.dataset.id;
      const item = catalogItems.find(it => it.id === itemId);
      if (item) {
        openModal(item, card);
      }
    });

    // Доступность с клавиатуры (Enter или Пробел на карточке)
    gridContainer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const card = event.target.closest('.catalog-card');
        if (card) {
          event.preventDefault();
          card.click();
        }
      }
    });
  }

  // Закрытие кнопкой
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Закрытие по клавише Escape
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  });

  // Закрытие по клику на подложку (backdrop)
  modal.addEventListener('click', (event) => {
    const rect = modal.getBoundingClientRect();
    const isInDialog = (
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeModal();
    }
  });
}

/**
 * Быстрое тестирование 6 тест-кейсов по кнопкам
 */
function initTestCasePresets() {
  const testButtons = document.querySelectorAll('[data-run-test]');
  const searchInput = document.getElementById('catalog-search-input');
  const categorySelect = document.getElementById('catalog-category-select');

  testButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const testId = btn.dataset.runTest;

      switch (testId) {
        case 'full-word': // 1. Поиск полного слова
          searchInput.value = 'Spirit';
          categorySelect.value = 'all';
          break;
        case 'partial-word': // 2. Поиск части слова
          searchInput.value = 'gaz';
          categorySelect.value = 'all';
          break;
        case 'case-insensitive': // 3. Разный регистр
          searchInput.value = 'GLADIATORS';
          categorySelect.value = 'all';
          break;
        case 'empty-query': // 4. Пустой запрос
          searchInput.value = '';
          categorySelect.value = 'all';
          break;
        case 'incompatible-filter': // 5. Несовместимые фильтры (нулевой результат)
          searchInput.value = 'Liquid';
          categorySelect.value = 'merch'; // Team Liquid в категории мерча отсутствует!
          break;
        case 'modal-dialog': // 6. Открытие первого элемента в модалке
          searchInput.value = '';
          categorySelect.value = 'all';
          const firstCard = document.querySelector('.catalog-card');
          if (firstCard) firstCard.click();
          return;
      }

      // Триггерим поиск
      searchInput.dispatchEvent(new Event('input'));
    });
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
