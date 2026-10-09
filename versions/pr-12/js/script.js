'use strict';

/**
 * ============================================================
 * ПРАКТИКА 12: ДИНАМИЧЕСКИЙ РЕНДЕРИНГ ДАННЫХ И РЕАКЦИИ ПОЛЬЗОВАТЕЛЯ
 * Проект: Киберспортивный турнир DotaArena 2026
 * ============================================================
 */

// ------------------------------------------------------------
// ЭТАП 2: ОПИСАНИЕ ОБЪЕКТА ПРОЕКТА И МАССИВА КАРТОЧЕК
// ------------------------------------------------------------

/**
 * Мета-объект турнирного проекта
 */
const project = {
  name: 'DotaArena 2026 Championship',
  date: '2026-11-01',
  location: 'VK Play Arena, Москва',
  game: 'Dota 2',
  prizePool: 600000,
  currency: 'RUB',
  format: 'Double Elimination (8 команд)',
  organizer: 'gazbloki31.ru'
};

/**
 * Массив команд турнира (каждый объект имеет строго одинаковый набор ключей)
 */
const teamsData = [
  {
    id: 'team-gazbloki',
    name: 'gazbloki31.ru',
    tag: 'GZ31',
    region: 'Восточная Европа',
    mmr: 11850,
    captain: 'Kirill "gazobeton" V.',
    rosterCount: 5,
    tier: 'PRO',
    foundedYear: 2024,
    status: 'Фаворит квалификаций'
  },
  {
    id: 'team-spirit',
    name: 'Team Spirit',
    tag: 'TS',
    region: 'Восточная Европа',
    mmr: 12600,
    captain: 'Yaroslav "Miposhka" N.',
    rosterCount: 5,
    tier: 'PRO',
    foundedYear: 2015,
    status: 'Двукратные чемпионы мира'
  },
  {
    id: 'team-gladiators',
    name: 'Gaimin Gladiators',
    tag: 'GG',
    region: 'Западная Европа',
    mmr: 12400,
    captain: 'Melchior "Seleri" H.',
    rosterCount: 5,
    tier: 'PRO',
    foundedYear: 2022,
    status: 'Чемпионы Riyadh Masters'
  },
  {
    id: 'team-liquid',
    name: 'Team Liquid',
    tag: 'TL',
    region: 'Западная Европа',
    mmr: 12550,
    captain: 'Aydin "iNSaNiA" S.',
    rosterCount: 5,
    tier: 'PRO',
    foundedYear: 2000,
    status: 'Действующие чемпионы The International'
  },
  {
    id: 'team-betboom',
    name: 'BetBoom Team',
    tag: 'BB',
    region: 'Восточная Европа',
    mmr: 12300,
    captain: 'Vitalie "Save-" M.',
    rosterCount: 5,
    tier: 'PRO',
    foundedYear: 2022,
    status: 'Гранд-финалисты мейджоров'
  },
  {
    id: 'team-parivision',
    name: 'PARIVISION',
    tag: 'PV',
    region: 'Восточная Европа',
    mmr: 11950,
    captain: 'Andrey "Dukalis" K.',
    rosterCount: 5,
    tier: 'PRO',
    foundedYear: 2024,
    status: 'Победители онлайн-кубков'
  },
  {
    id: 'team-tundra',
    name: 'Tundra Esports',
    tag: 'TUNDRA',
    region: 'Западная Европа',
    mmr: 12200,
    captain: 'Martin "Saksa" S.',
    rosterCount: 5,
    tier: 'PRO',
    foundedYear: 2019,
    status: 'Чемпионы The International 2022'
  },
  {
    id: 'team-falcons',
    name: 'Team Falcons',
    tag: 'FLCN',
    region: 'Ближний Восток',
    mmr: 12700,
    captain: 'Wu "Sneyking" J.',
    rosterCount: 5,
    tier: 'PRO',
    foundedYear: 2023,
    status: 'Доминирующий ростер сезона'
  }
];

// Хранилище текущего отображаемого списка (для фильтрации)
let displayedTeams = [...teamsData];
let selectedTeamIds = new Set();
let isCompactMode = false;

// ------------------------------------------------------------
// ЭТАП 6: ЧИСТЫЕ ФУНКЦИИ ПРЕОБРАЗОВАНИЯ ДАННЫХ
// ------------------------------------------------------------

/**
 * Чистая функция форматирования денежной суммы
 * @param {number} amount Число рублей
 * @returns {string} Отформатированная строка
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '0 RUB';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Чистая функция форматирования показателя MMR
 * @param {number} mmr Значение рейтинга
 * @returns {string} Строка рейтинга с разделителем тысяч
 */
function formatMMR(mmr) {
  if (typeof mmr !== 'number' || !Number.isFinite(mmr)) return '0 MMR';
  return mmr.toLocaleString('ru-RU') + ' MMR';
}

/**
 * Чистая функция форматирования даты турнира
 * @param {string} isoDate Дата в формате YYYY-MM-DD
 * @returns {string} Локализованная строка даты
 */
function formatDate(isoDate) {
  if (typeof isoDate !== 'string' || !isoDate) return 'Дата не указана';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

/**
 * Чистая функция экранирования HTML-спецсимволов
 * @param {string} str Входная строка
 * @returns {string} Безопасная строка
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Тестирование чистых функций в консоли согласно Методичке (Этап 6)
console.log('--- Проверка чистых функций (Этап 6) ---');
console.log('Тест 1 (formatCurrency):', formatCurrency(600000), '| Ожидалось: "600 000 руб."');
console.log('Тест 2 (formatCurrency):', formatCurrency(1337), '| Ожидалось: "1 337 руб."');
console.log('Тест 3 (formatMMR):', formatMMR(11850), '| Ожидалось: "11 850 MMR"');
console.log('Тест 4 (formatMMR):', formatMMR(12700), '| Ожидалось: "12 700 MMR"');
console.log('Тест 5 (formatDate):', formatDate('2026-11-01'), '| Ожидалось: "1 ноября 2026 г."');

// ------------------------------------------------------------
// ЭТАП 4: ФУНКЦИЯ ГЕНЕРАЦИИ РАЗМЕТКИ ОДНОЙ КАРТОЧКИ
// ------------------------------------------------------------

/**
 * Создаёт HTML-разметку одной карточки команды через Template Literal
 * @param {Object} team Объект команды из массива
 * @returns {string} Строка HTML
 */
function createTeamCard(team) {
  const isSelected = selectedTeamIds.has(team.id);
  const selectedClass = isSelected ? 'team-card--selected' : '';
  const selectedBadge = isSelected ? '<span class="team-card__badge-selected">Выбрано</span>' : '';

  return `
    <article class="team-card ${selectedClass}" data-team-id="${escapeHtml(team.id)}" tabindex="0" role="button" aria-pressed="${isSelected}">
      <header class="team-card__header">
        <div class="team-card__tag-wrap">
          <span class="team-card__tag">[${escapeHtml(team.tag)}]</span>
          <span class="team-card__tier team-card__tier--${escapeHtml(team.tier.toLowerCase())}">${escapeHtml(team.tier)}</span>
        </div>
        ${selectedBadge}
      </header>

      <div class="team-card__body">
        <h3 class="team-card__name">${escapeHtml(team.name)}</h3>
        <p class="team-card__status">${escapeHtml(team.status)}</p>

        <dl class="team-card__stats">
          <div class="team-card__stat-item">
            <dt>Средний MMR:</dt>
            <dd><strong>${formatMMR(team.mmr)}</strong></dd>
          </div>
          <div class="team-card__stat-item">
            <dt>Регион:</dt>
            <dd>${escapeHtml(team.region)}</dd>
          </div>
          <div class="team-card__stat-item">
            <dt>Капитан:</dt>
            <dd>${escapeHtml(team.captain)}</dd>
          </div>
          <div class="team-card__stat-item">
            <dt>Состав:</dt>
            <dd>${escapeHtml(String(team.rosterCount))} игроков</dd>
          </div>
          <div class="team-card__stat-item">
            <dt>Год основания:</dt>
            <dd>${escapeHtml(String(team.foundedYear))}</dd>
          </div>
        </dl>
      </div>

      <footer class="team-card__footer">
        <span class="team-card__action-hint">Нажмите, чтобы ${isSelected ? 'снять выбор' : 'выбрать команду'}</span>
      </footer>
    </article>
  `;
}

// ------------------------------------------------------------
// ЭТАП 5 И 8: ОТРИСОВКА МАССИВА И УСТОЙЧИВОСТЬ К ОТСУТСТВИЮ КОНТЕЙНЕРА
// ------------------------------------------------------------

/**
 * Безопасная отрисовка списка команд в контейнер
 * @param {Array} list Массив объектов команд
 */
function renderTeams(list) {
  const container = document.getElementById('teams-container');
  const countEl = document.getElementById('teams-count');
  const emptyStateEl = document.getElementById('teams-empty');

  // Этап 8: Устойчивость кода (если элемент не найден, функция мирно завершается)
  if (!container) {
    console.warn('Контейнер #teams-container не найден в DOM.');
    return;
  }

  // Обновление счётчика записей
  if (countEl) {
    countEl.textContent = String(list.length);
  }

  // Обработка пустого состояния
  if (list.length === 0) {
    container.innerHTML = '';
    if (emptyStateEl) emptyStateEl.hidden = false;
    return;
  }

  if (emptyStateEl) emptyStateEl.hidden = true;

  // Отрисовка через map и join
  container.innerHTML = list.map(createTeamCard).join('');
}

/**
 * Отрисовка шапки проекта из объекта project
 */
function renderProjectInfo() {
  const titleEl = document.getElementById('project-title');
  const metaDateEl = document.getElementById('project-date');
  const metaLocEl = document.getElementById('project-location');
  const metaPrizeEl = document.getElementById('project-prize');
  const metaOrgEl = document.getElementById('project-org');

  if (titleEl) titleEl.textContent = project.name;
  if (metaDateEl) metaDateEl.textContent = formatDate(project.date);
  if (metaLocEl) metaLocEl.textContent = project.location;
  if (metaPrizeEl) metaPrizeEl.textContent = formatCurrency(project.prizePool);
  if (metaOrgEl) metaOrgEl.textContent = project.organizer;
}

// ------------------------------------------------------------
// ЭТАП 7: РЕАКЦИИ ПОЛЬЗОВАТЕЛЯ (ДВЕ РЕАКЦИИ ЧЕРЕЗ addEventListener)
// ------------------------------------------------------------

/**
 * Инициализация обработчиков событий
 */
function initUserInteractions() {
  const container = document.getElementById('teams-container');
  const filterBtns = document.querySelectorAll('[data-filter]');
  const btnToggleView = document.getElementById('btn-toggle-view');
  const btnClearSelection = document.getElementById('btn-clear-selection');
  const selectedCountEl = document.getElementById('selected-count');

  /**
   * Обновление панели выбранных команд
   */
  function updateSelectionSummary() {
    if (selectedCountEl) {
      selectedCountEl.textContent = String(selectedTeamIds.size);
    }
  }

  // РЕАКЦИЯ 1: Выделение карточки по клику (делегирование через addEventListener)
  if (container) {
    container.addEventListener('click', (event) => {
      const card = event.target.closest('.team-card');
      if (!card) return;

      const teamId = card.dataset.teamId;
      if (!teamId) return;

      if (selectedTeamIds.has(teamId)) {
        selectedTeamIds.delete(teamId);
      } else {
        selectedTeamIds.add(teamId);
      }

      // Перерисовываем с сохранением выбора
      renderTeams(displayedTeams);
      updateSelectionSummary();
    });

    // Доступность с клавиатуры (Enter или Пробел на карточке)
    container.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const card = event.target.closest('.team-card');
        if (card) {
          event.preventDefault();
          card.click();
        }
      }
    });
  }

  // РЕАКЦИЯ 2: Переключение режима фильтрации списка команд
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');

      const filterType = btn.dataset.filter;

      switch (filterType) {
        case 'cis':
          displayedTeams = teamsData.filter(t => t.region === 'Восточная Европа');
          break;
        case 'eu':
          displayedTeams = teamsData.filter(t => t.region === 'Западная Европа' || t.region === 'Ближний Восток');
          break;
        case 'high-mmr':
          displayedTeams = teamsData.filter(t => t.mmr >= 12400);
          break;
        case 'all':
        default:
          displayedTeams = [...teamsData];
          break;
      }

      renderTeams(displayedTeams);
    });
  });

  // РЕАКЦИЯ 2Б: Переключение вида отображения (Сетка / Компактный список)
  if (btnToggleView && container) {
    btnToggleView.addEventListener('click', () => {
      isCompactMode = !isCompactMode;
      container.classList.toggle('teams-cards-grid--compact', isCompactMode);
      btnToggleView.classList.toggle('view-btn--compact', isCompactMode);
      btnToggleView.textContent = isCompactMode ? 'Режим: Компактный список' : 'Режим: Полная сетка';
    });
  }

  // Кнопка сброса выбора
  if (btnClearSelection) {
    btnClearSelection.addEventListener('click', () => {
      selectedTeamIds.clear();
      renderTeams(displayedTeams);
      updateSelectionSummary();
    });
  }
}

// ------------------------------------------------------------
// ТОЧКА ВХОДА (ВЫПОЛНЯЕТСЯ ПРИ ДЕФЕР-ЗАГРУЗКЕ DOM)
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderProjectInfo();
  renderTeams(displayedTeams);
  initUserInteractions();
});
