// ============================================================
//  DotaArena 2026 — script.js
//  Включает:
//   1)  Подсветку активной ссылки в nav при прокрутке
//   2)  Плавную прокрутку к разделам
//   3)  Логику вкладок (Зарегистрированные / На рассмотрении)
//   4)  Валидацию телефона и email
//   5)  Отправку формы + имитацию оплаты + автопереход pending → registered
//   6)  Счётчик символов для textarea
//   7)  Счётчик дедлайна регистрации (до 1 ноября 2026)
//   8)  Счётчик 72 часа до старта (создаётся при 16 командах)
//   9)  Прогресс-бар «X из 64 мест занято»
//  10)  Переключатель тёмной/светлой темы
//  11)  Модальное окно деталей команды
//  12)  Фильтры по региону, дивизиону, MMR, поиск
//  13)  Автозаполнение турнирной сетки при 16 командах
//  14)  Steam OpenID (демо-мок)
//  15)  Mock-API live-матчей + ссылка на Twitch
//  16)  Mock-RSS новостей (обновлено под патч 7.41f)
//  17)  Автопереход «зависших» pending при загрузке
//  18)  Модальное окно «Оплата» с имитацией процесса оплаты
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  //  КОНСТАНТЫ
  // ============================================================
  const PENDING_DELAY_MS   = 60 * 1000;                       // 1 минута до автоподтверждения
  const STORAGE_KEY        = 'dotaarena2026_teams';           // ключ localStorage для команд
  const THEME_KEY          = 'dotaarena2026_theme';           // ключ localStorage для темы
  const STEAM_KEY          = 'dotaarena2026_steam';           // ключ localStorage для Steam
  const PHONE_HINT_DEFAULT = 'Любой формат: 89001234567, +79001234567, 8(900)123-45-67';
  const MAX_TEAMS          = 8;                               // максимум команд в финальной сетке (8 команд)
  const BRACKET_MIN        = 8;                               // минимум для старта сетки (8 команд)
  const DEADLINE_DATE      = new Date('2026-11-01T23:59:59'); // дедлайн регистрации
  const TOURNAMENT_START   = new Date('2026-11-14T10:00:00'); // старт турнира

  // ============================================================
  //  УТИЛИТЫ
  // ============================================================
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /** Троттлинг через requestAnimationFrame */
  function rafThrottle(fn) {
    let q = false;
    return (...a) => {
      if (q) return;
      q = true;
      requestAnimationFrame(() => { q = false; fn(...a); });
    };
  }

  /** Хранилище команд (pending / registered) */
  const store = {
    read() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY))
          || { pending: [], registered: [] };
      } catch { return { pending: [], registered: [] }; }
    },
    write(d) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
    }
  };

  /** Нормализация российского номера */
  function normalizePhone(raw) {
    if (!raw) return null;
    const d = raw.replace(/\D/g, '');
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
      return `+7 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7,9)}-${d.slice(9,11)}`;
    }
    return null;
  }

  /** Регулярка для разрешённых email-доменов */
  const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@(mail\.ru|gmail\.com|yandex\.ru|ya\.ru|bk\.ru|list\.ru|inbox\.ru|internet\.ru|rambler\.ru|icloud\.com)$/i;

  /** Форматирование денег */
  function formatMoney(n) {
    return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  }

  // ============================================================
  //  1. ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (тёмная / светлая)
  // ============================================================
  const html      = document.documentElement;
  const themeBtn     = $('#theme-toggle');
  const themeSvgMoon = $('#theme-svg-moon');
  const themeSvgSun  = $('#theme-svg-sun');

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    if (themeSvgMoon && themeSvgSun) {
      if (theme === 'light') {
        themeSvgMoon.style.display = 'none';
        themeSvgSun.style.display  = 'block';
      } else {
        themeSvgMoon.style.display = 'block';
        themeSvgSun.style.display  = 'none';
      }
    }
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }

  // Инициализация темы: localStorage > системная настройка > тёмная
  const savedTheme = (() => {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  })();
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(savedTheme || (prefersLight ? 'light' : 'dark'));

  themeBtn?.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
  });

  // ============================================================
  //  2. ПОДСВЕТКА АКТИВНОЙ ССЫЛКИ В NAV (rAF-троттлинг)
  // ============================================================
  const sections = $$('main section[id], footer[id]');
  const navLinks = $$('nav a[href^="#"]');

  const highlightNav = rafThrottle(() => {
    let cur = '';
    for (const sec of sections) {
      const r = sec.getBoundingClientRect();
      if (r.top <= 140 && r.bottom >= 140) cur = sec.id;
    }
    if (!cur && window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
      cur = 'contacts';
    }

    for (const a of navLinks) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
    }
  });

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  // ============================================================
  //  2.1 ВЫДВИЖНОЕ БОКОВОЕ МЕНЮ НАВИГАЦИИ (OFFCANVAS DRAWER)
  // ============================================================
  const navDrawer = document.getElementById('nav-drawer');
  const navDrawerToggleBtn = document.getElementById('nav-drawer-toggle');
  const navDrawerCloseBtn = document.getElementById('nav-drawer-close');
  const navDrawerBackdrop = document.getElementById('nav-drawer-backdrop');

  function setNavDrawerState(isOpen) {
    if (!navDrawer) return;
    if (isOpen) {
      navDrawer.classList.add('nav-drawer--open', 'active');
      navDrawer.setAttribute('aria-hidden', 'false');
      if (navDrawerToggleBtn) {
        navDrawerToggleBtn.classList.add('active');
        navDrawerToggleBtn.setAttribute('aria-expanded', 'true');
      }
      if (navDrawerBackdrop) {
        navDrawerBackdrop.classList.add('active');
        navDrawerBackdrop.setAttribute('aria-hidden', 'false');
      }
    } else {
      navDrawer.classList.remove('nav-drawer--open', 'active');
      navDrawer.setAttribute('aria-hidden', 'true');
      if (navDrawerToggleBtn) {
        navDrawerToggleBtn.classList.remove('active');
        navDrawerToggleBtn.setAttribute('aria-expanded', 'false');
      }
      if (navDrawerBackdrop) {
        navDrawerBackdrop.classList.remove('active');
        navDrawerBackdrop.setAttribute('aria-hidden', 'true');
      }
    }
  }

  function toggleNavDrawer() {
    if (!navDrawer) return;
    const isOpen = navDrawer.classList.contains('nav-drawer--open');
    setNavDrawerState(!isOpen);
  }

  if (navDrawerToggleBtn) {
    navDrawerToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNavDrawer();
    });
  }

  if (navDrawerCloseBtn) {
    navDrawerCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setNavDrawerState(false);
    });
  }

  if (navDrawerBackdrop) {
    navDrawerBackdrop.addEventListener('click', () => {
      setNavDrawerState(false);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navDrawer && navDrawer.classList.contains('nav-drawer--open')) {
      setNavDrawerState(false);
    }
  });

  // ============================================================
  //  3. ПЛАВНАЯ ПРОКРУТКА + АВТОМАТИЧЕСКОЕ ЗАКРЫТИЕ БОКОВОГО МЕНЮ
  // ============================================================
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const t = document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    setNavDrawerState(false); // Закрываем боковое меню при клике на любую ссылку
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ============================================================
  //  4. ЛОГИКА ВКЛАДОК (Зарегистрированные / На рассмотрении)
  // ============================================================
  const tabBtns      = $$('.tab-btn');
  const tabContents  = $$('.tab-content');

  function activateTab(btn) {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const content = document.getElementById(btn.dataset.target);
    if (content) content.classList.add('active');
  }

  tabBtns.forEach(b => b.addEventListener('click', () => activateTab(b)));

  function switchToPending() {
    const b = $('.tab-btn[data-target="tab-pending"]');
    if (b) activateTab(b);
  }

  function switchToRegistered() {
    const b = $('.tab-btn[data-target="tab-registered"]');
    if (b) activateTab(b);
  }

  // ============================================================
  //  5. СЧЁТЧИК ДЕДЛАЙНА РЕГИСТРАЦИИ
  // ============================================================
  const ddDays  = $('#dd-days');
  const ddHours = $('#dd-hours');
  const ddMins  = $('#dd-mins');
  const ddSecs  = $('#dd-secs');

  const pad = n => String(Math.max(0, n)).padStart(2, '0');

  function updateDeadline() {
    const diff = DEADLINE_DATE - new Date();
    if (diff <= 0) {
      if (ddDays)  ddDays.textContent  = '00';
      if (ddHours) ddHours.textContent = '00';
      if (ddMins)  ddMins.textContent  = '00';
      if (ddSecs)  ddSecs.textContent  = '00';
      return;
    }
    const s = Math.floor(diff / 1000);
    if (ddDays)  ddDays.textContent  = pad(Math.floor(s / 86400));
    if (ddHours) ddHours.textContent = pad(Math.floor((s % 86400) / 3600));
    if (ddMins)  ddMins.textContent  = pad(Math.floor((s % 3600) / 60));
    if (ddSecs)  ddSecs.textContent  = pad(s % 60);
  }
  updateDeadline();
  setInterval(updateDeadline, 1000);

  // ============================================================
  //  6. СЧЁТЧИК 72 ЧАСА ДО СТАРТА (при 16 командах)
  // ============================================================
  let launchCounterEl = null;

  function createLaunchCounter() {
    if (launchCounterEl) return;
    const wrap = document.createElement('div');
    wrap.className = 'deadline-counter deadline-counter--launch';
    wrap.id = 'launch-counter';
    wrap.setAttribute('role', 'timer');
    wrap.setAttribute('aria-live', 'polite');
    wrap.innerHTML = `
      <span class="deadline-counter__label">🚀 Старт турнира через</span>
      <div class="deadline-counter__time">
        <span class="deadline-counter__unit"><b id="lt-days">00</b><i>дней</i></span>
        <span class="deadline-counter__sep">:</span>
        <span class="deadline-counter__unit"><b id="lt-hours">00</b><i>часов</i></span>
        <span class="deadline-counter__sep">:</span>
        <span class="deadline-counter__unit"><b id="lt-mins">00</b><i>минут</i></span>
        <span class="deadline-counter__sep">:</span>
        <span class="deadline-counter__unit"><b id="lt-secs">00</b><i>секунд</i></span>
      </div>`;
    $('#deadline-counter')?.after(wrap);
    launchCounterEl = wrap;
    updateLaunchCounter();
  }

  function updateLaunchCounter() {
    if (!launchCounterEl) return;
    const state = store.read();
    const total = state.registered.length + state.pending.length;
    if (total < BRACKET_MIN) return;
    const diff = TOURNAMENT_START - new Date();
    if (diff <= 0) {
      ['lt-days','lt-hours','lt-mins','lt-secs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }
    const s = Math.floor(diff / 1000);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = pad(v); };
    set('lt-days',  Math.floor(s / 86400));
    set('lt-hours', Math.floor((s % 86400) / 3600));
    set('lt-mins',  Math.floor((s % 3600) / 60));
    set('lt-secs',  s % 60);
  }
  setInterval(updateLaunchCounter, 1000);

  // ============================================================
  //  7. РЕНДЕР СПИСКОВ КОМАНД + ПРОГРЕСС + АВТОСЕТКА
  // ============================================================
  const registeredList  = $('#registered-list');
  const registeredEmpty = $('#registered-empty');
  const pendingList     = $('#pending-list');
  const pendingEmpty    = $('#pending-empty');
  const progressText    = $('#progress-text');
  const progressPct     = $('#progress-percent');
  const progressBar     = $('#progress-bar');
  const bracketCount    = $('#bracket-count');

  // Текущие фильтры
  const filters = { search: '', region: '', division: '', mmr: 0 };

  /** Проверка, проходит ли команда через фильтры */
  function teamMatchesFilters(t) {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${t.name} ${t.captain || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.region   && t.region   !== filters.region)   return false;
    if (filters.division && t.division !== filters.division) return false;
    if (filters.mmr      && (t.mmr || 0) < filters.mmr)      return false;
    return true;
  }

  /** Создание <li> для списка команд */
  function makeTeamLi(team) {
    const li = document.createElement('li');
    li.dataset.teamId = team.id;

    const nameNode = document.createElement('span');
    nameNode.textContent = team.name;
    li.appendChild(nameNode);

    const meta = document.createElement('span');
    meta.className = 'team-meta';
    if (team.region)   meta.insertAdjacentHTML('beforeend', `<span>${team.region}</span>`);
    if (team.division) meta.insertAdjacentHTML('beforeend', `<span>Div ${team.division}</span>`);
    if (team.mmr)      meta.insertAdjacentHTML('beforeend', `<span>${team.mmr} MMR</span>`);
    if (team.payment)  meta.insertAdjacentHTML('beforeend', `<span>${formatMoney(team.payment)}</span>`);
    li.appendChild(meta);

    // Клик — открытие модалки
    li.addEventListener('click', () => openModal(team));
    return li;
  }

  /** Основной рендер: списки + прогресс + сетка + launch-counter */
  function renderTeams() {
    const state = store.read();

    // Pending
    if (pendingList) {
      pendingList.innerHTML = '';
      state.pending
        .filter(teamMatchesFilters)
        .forEach(t => pendingList.appendChild(makeTeamLi(t)));
    }
    if (pendingEmpty) pendingEmpty.hidden = state.pending.length > 0;

    // Registered
    if (registeredList) {
      registeredList.innerHTML = '';
      state.registered
        .filter(teamMatchesFilters)
        .forEach(t => registeredList.appendChild(makeTeamLi(t)));
    }
    if (registeredEmpty) registeredEmpty.hidden = state.registered.length > 0;

    // Прогресс-бар
    const total = state.registered.length + state.pending.length;
    const pct = Math.min(100, Math.round((total / MAX_TEAMS) * 100));
    if (progressText) progressText.textContent = `${total} из ${MAX_TEAMS} мест занято`;
    if (progressPct)  progressPct.textContent  = `${pct}%`;
    if (progressBar)  progressBar.style.width  = `${pct}%`;

    // Статус сетки
    if (bracketCount) bracketCount.textContent = total;

    // Автозаполнение сетки при ≥ 8 команд
    if (state.registered.length >= BRACKET_MIN) {
      fillBracket(state.registered.slice(0, MAX_TEAMS));
      createLaunchCounter();
      updateLaunchCounter();
    }
  }

  // ============================================================
  //  8. АВТОЗАПОЛНЕНИЕ ТУРНИРНОЙ СЕТКИ
  // ============================================================
  // Порядок слотов — 16 команд распределяются по верхней и нижней сетке
  const SLOT_ORDER = [
    'U1-1a','U1-2b','U1-3a','U1-4b',
    'U1-1b','U1-2a','U1-3b','U1-4a',
    'L1-1a','L1-2b','L1-3a','L1-4b',
    'L1-1b','L1-2a','L1-3b','L1-4a'
  ];

  /** Заполняет слоты сетки названиями команд */
  function fillBracket(teams) {
    SLOT_ORDER.forEach((slot, i) => {
      const el = document.querySelector(`[data-slot="${slot}"]`);
      if (!el) return;
      if (teams[i]) {
        el.textContent = teams[i].name;
        el.classList.add('filled');
        el.title = [
          teams[i].name,
          teams[i].region ? '· ' + teams[i].region : '',
          teams[i].mmr    ? '· ' + teams[i].mmr + ' MMR' : ''
        ].filter(Boolean).join(' ');
      } else {
        el.textContent = 'TBD';
        el.classList.remove('filled');
      }
    });
  }

  // Первый рендер при загрузке
  renderTeams();

  // ============================================================
  //  9. ФИЛЬТРЫ ПО КОМАНДАМ
  // ============================================================
  $('#filter-search')?.addEventListener('input', e => {
    filters.search = e.target.value.trim();
    renderTeams();
  });
  $('#filter-region')?.addEventListener('change', e => {
    filters.region = e.target.value;
    renderTeams();
  });
  $('#filter-division')?.addEventListener('change', e => {
    filters.division = e.target.value;
    renderTeams();
  });
  $('#filter-mmr')?.addEventListener('change', e => {
    filters.mmr = parseInt(e.target.value, 10) || 0;
    renderTeams();
  });

  // ============================================================
  //  10. МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ КОМАНДЫ
  // ============================================================
  const modalBackdrop = $('#modal-backdrop');
  const modalClose    = $('#modal-close');

  function openModal(team) {
    if (!modalBackdrop) return;
    $('#modal-title').textContent        = team.name || '—';
    $('#modal-subtitle').textContent     = [team.region, team.division ? `Дивизион ${team.division}` : ''].filter(Boolean).join(' · ') || '—';
    $('#modal-captain').textContent      = team.captain || '—';
    $('#modal-mmr').textContent          = team.mmr ? `${team.mmr}` : '—';
    $('#modal-payment').textContent      = team.payment ? formatMoney(team.payment) : '—';
    $('#modal-achievements').textContent = team.achievements || '—';

    const membersUl = $('#modal-members');
    membersUl.innerHTML = '';
    const list = Array.isArray(team.members) && team.members.length
      ? team.members
      : ['Состав не указан'];
    list.forEach(m => {
      const li = document.createElement('li');
      li.textContent = m;
      membersUl.appendChild(li);
    });

    modalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    document.body.style.overflow = '';
  }

  modalClose?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modalBackdrop.hidden) closeModal();
  });

  // ============================================================
  //  10.5. ИНТЕРАКТИВНОЕ ДОСЬЕ ГЕРОЕВ (МОДАЛЬНОЕ ОКНО)
  //  Слева: полноростовая версия/анимация (GIF / рендер).
  //  Справа: характеристики, лор и интересные факты.
  // ============================================================
  const heroData = {
    storm_spirit: {
      name: 'Storm Spirit',
      subtitle: 'Райдзин Громовержец · Дух бури и молний',
      render: 'images/storm_spirit_render.png',
      badges: ['Mid Lane', 'Initiator', 'Escape', 'Сложность ★★★★☆'],
      stats: [
        { label: 'Win Rate', val: '52.1%' },
        { label: 'Основной атрибут', val: 'Интеллект' },
        { label: 'Скорость', val: '330' },
        { label: 'Ball Lightning', val: 'Без лимита' }
      ],
      desc: 'Стремительный маг-интеллектуал, способный перемещаться по всей карте в форме шара электрической энергии. Райдзин объединяет в себе духа стихии и весёлого мудреца, обрушивая на соперников молниеносные штормы и вихри перегрузки.',
      facts: [
        'Райдзин Громовержец был призван эксцентричным магом Тандеркагом, пытавшимся остановить засуху. В результате магического ритуала дух стихии и смертный чародей навсегда слились воедино.',
        'Единственный персонаж в Dota 2, чья ультимативная способность Ball Lightning не имеет кулдауна и позволяет переместиться на любую дистанцию, пока хватает запаса маны.',
        'Во время полёта в шаровой молнии Шторм полностью неуязвим ко всем видам урона и контроля, а также рассеивает большинство негативных эффектов.',
        'Его коронная фраза «Looking for me?» стала культовой на про-сцене The International после легендарных моментов от SumaiL.'
      ]
    },
    hoodwink: {
      name: 'Hoodwink',
      subtitle: 'Проныра из чащи · Официальный талисман DotaArena 2026',
      render: 'images/hoodwink_dance.gif',
      badges: ['Талисман турнира', 'Support', 'Nuker', 'Сложность ★★★☆☆'],
      stats: [
        { label: 'Win Rate', val: '50.4%' },
        { label: 'Дальность выстрела', val: '3000' },
        { label: 'Атрибут', val: 'Ловкость' },
        { label: 'Статус', val: 'Талисман 2026' }
      ],
      desc: 'Юркая белка-охотница из дремучего леса Томинкрафт, ставшая главным символом и маскотом DotaArena 2026. Вооружена мощным арбалетом, стреляющим зарядами Sharpshooter, и мастерски расставляет капканы среди деревьев.',
      facts: [
        'Официальный талисман турнира: именно её зажигательный танец украшает фон всего сайта DotaArena 2026.',
        'Способность Sharpshooter заряжается до 5 секунд и при максимальной концентрации накладывает эффект истощения (Break), отключающий пассивные умения врагов даже сквозь невидимость.',
        'Худвинк обожает дразнить лесных разбойников и снайперов: её реплики высмеивают неуклюжих стрелков, заявляя, что настоящий охотник стреляет только на бегу.',
        'В текущем соревновательном сезоне признана самым гибким роумером, способным перевернуть раннюю стадию игры одним удачным рикошетом Acorn Shot.'
      ]
    },
    shadow_fiend: {
      name: 'Shadow Fiend',
      subtitle: 'Nevermore Повелитель Душ · Arcana 2026',
      render: 'images/shadow_fiend_render.png',
      badges: ['Arcana 2026', 'Mid Lane', 'Hard Carry', 'Сложность ★★★★★'],
      stats: [
        { label: 'Win Rate', val: '55.8%' },
        { label: 'Макс. душ', val: '36' },
        { label: 'Requiem урон', val: '3200+' },
        { label: 'Сложность', val: 'Максимальная' }
      ],
      desc: 'Невермор — собиратель душ из Потустороннего мира и главный визуальный символ турнира. Каждая поглощённая душа увеличивает физический урон героя, а точнейшие койлы Shadowraze стирают противников на средней дистанции.',
      facts: [
        'Дуэли 1 на 1 на Shadow Fiend на миде — исторически главный тест индивидуального мастерства и микроконтроля в киберспортивной Dota.',
        'Никто не знает, как выглядит истинное тело Невермора: по лору он соткан из теней и душ поэтов, королей и чудовищ, поглощённых за тысячелетия.',
        'Новая турнирная аркана 2026 года меняет не только облик, но и звук выпускания душ, добавляя рубиновые всполохи при касте Requiem of Souls.',
        'Максимальный урон от ультимейта наносится, если скастовать Requiem of Souls в упор или из инвиза прямо внутри модельки противника.'
      ]
    },
    invoker: {
      name: 'Invoker',
      subtitle: 'Карл Магистр Десяти Заклинаний',
      render: 'images/invoker_render.png',
      badges: ['Mid Lane Solo', 'Nuker', 'Disabler', 'Сложность ★★★★★'],
      stats: [
        { label: 'Win Rate', val: '54.2%' },
        { label: 'Сфер стихий', val: '3 (Quas, Wex, Exort)' },
        { label: 'Заклинаний', val: '10 чар' },
        { label: 'Позиция', val: 'Мид' }
      ],
      desc: 'Древнейший чародей вселенной Dota, обладающий феноменальной памятью. В то время как другие великие маги с трудом заучивают три заклинания, Инвокер комбинирует сферы Quas, Wex и Exort для сотворения десяти разрушительных заклятий.',
      facts: [
        'Имя Карл (Carl) изначально было пасхалкой китайских локализаторов оригинальной DotA, которую разработчики Valve сделали официальным каноном.',
        'Инвокер живёт уже многие эпохи благодаря собственному заклинанию долголетия Sempiternal Cantrap, пережив десятки цивилизаций.',
        'Комбинация Tornado + EMP + Chaos Meteor + Deafening Blast способна в одиночку уничтожить всю вражескую команду в узких проходах у Рошана.',
        'Перед произнесением каждого заклятия Инвокер произносит формулу на забытом древнем языке Высшей магии.'
      ]
    },
    pudge: {
      name: 'Pudge',
      subtitle: 'Мясник с Полей Вечной Резни',
      render: 'images/pudge_render.png',
      badges: ['Культовый герой', 'Support', 'Roamer', 'Сложность ★★★☆☆'],
      stats: [
        { label: 'Win Rate', val: '48.7%' },
        { label: 'Pick Rate', val: '#1 за всю историю' },
        { label: 'Дальность Hook', val: '1300' },
        { label: 'Flesh Heap', val: 'Бесконечно' }
      ],
      desc: 'Самый узнаваемый персонаж в истории киберспорта. Падж бродит по полям сражений, орудуя ржавым крюком Meat Hook и мясницким тесаком. Одно точное попадание крюком сквозь туман войны способно переломить исход даже проигранного матча.',
      facts: [
        'Падж — самый популярный герой в истории Dota 2: количество сыгранных за него матчей превышает один миллиард.',
        'Легендарный баг «Fountain Hook» от Na`Vi на The International 2013 вошёл в учебники киберспорта как самый сенсационный тактический маневр.',
        'Пассивная способность Flesh Heap даёт прибавку к силе за каждого погибшего рядом врага, позволяя герою накапливать гигантский запас здоровья к поздней игре.',
        'Его крюк летит со скоростью 1600 единиц и притягивает цель вне зависимости от того, находится ли она за препятствиями или на хайграунде.'
      ]
    },
    antimage: {
      name: 'Anti-Mage',
      subtitle: 'Магина Истребитель Колдунов',
      render: 'images/antimage_render.png',
      badges: ['Hard Carry', 'Escape', 'Фарм-машина', 'Сложность ★★★☆☆'],
      stats: [
        { label: 'Win Rate', val: '51.3%' },
        { label: 'Кулдаун Blink', val: '6 сек' },
        { label: 'Сопротивление', val: '55% магии' },
        { label: 'Тайминг Battle Fury', val: '12-14 мин' }
      ],
      desc: 'Монах из разрушенного монастыря Турстаркай, поклявшийся уничтожить всех колдунов. Способность Blink обеспечивает высочайшую скорость фарма на карте, а Mana Break и ультимейт Mana Void превращают ману вражеских магов в их смертный приговор.',
      facts: [
        'По оригинальному лору Антимаг и повелитель демонов Terrorblade были братьями, чьи пути разошлись после падения их ордена.',
        'Благодаря способности Counterspell Антимаг может не только отражать вражеские направленные заклинания, но и возвращать их обратно в кастующего.',
        'Ультимейт Mana Void наносит взрывной урон по области, сила которого зависит от количества сожжённой маны у главной цели.',
        'Культовая фраза «Magic is an abomination to the gods» олицетворяет его фанатичную преданность обету истребления магии.'
      ]
    },
    juggernaut: {
      name: 'Juggernaut',
      subtitle: 'Юрнеро Последний воин Острова Масок',
      render: 'images/juggernaut_render.png',
      badges: ['Hard Carry', 'Pusher', 'Инициатор', 'Сложность ★★☆☆☆'],
      stats: [
        { label: 'Win Rate', val: '51.9%' },
        { label: 'Базовый интервал', val: '1.4 сек' },
        { label: 'Blade Fury', val: 'Иммунитет' },
        { label: 'Healing Ward', val: '5% HP/сек' }
      ],
      desc: 'Последний хранитель боевых традиций погибшего Острова Масок. Мастер меча, чьё искусство владения клинком не знает равных. Умение Blade Fury защищает от заклинаний, а яростный ультимейт Omnislash разрезает ряды врагов молниеносными выпадами.',
      facts: [
        'Ни один живой смертный в мире Dota никогда не видел истинного лица Юрнеро — по священному кодексу его народа снятие маски карается изгнанием.',
        'Юрнеро был изгнан со своего родного острова за дерзость перед коррумпированным правителем, и именно изгнание спасло ему жизнь, когда остров поглотило море.',
        'Тотем Healing Ward восстанавливает процент от максимального здоровья всей команды, что делает команду с Джаггернаутом неуязвимой при осаде баз.',
        'Во время Omnislash Юрнеро абсолютно неуязвим и может совершать дополнительные автоатаки в зависимости от скорости атаки героя.'
      ]
    },
    lina: {
      name: 'Lina',
      subtitle: 'Истребительница Огненных Недр',
      render: 'images/lina_render.png',
      badges: ['Mid Lane', 'Fast Nuker', 'Carry', 'Сложность ★★★☆☆'],
      stats: [
        { label: 'Win Rate', val: '49.9%' },
        { label: 'Бонус Fiery Soul', val: '+300 скор. атаки' },
        { label: 'Laguna Blade', val: 'Чистый урон' },
        { label: 'Дальность', val: '670' }
      ],
      desc: 'Повелительница бушующего пламени, способная мгновенно испепелять врагов взрывными заклинаниями. Пассивное умение Fiery Soul дарует колоссальный прирост к скорости атаки и передвижения за каждое применённое заклинание.',
      facts: [
        'Лина и ледяная чародейка Crystal Maiden (Рилай) — родные сёстры, чьё бурное детское соперничество чуть не сожгло и не заморозило полмира.',
        'Родители были вынуждены отправить Лину на юг в знойную пустыню Мизрула, где она быстро возглавила местных чародеев огня.',
        'С Aghanim Scepter её ультимейт Laguna Blade начинает наносить чистый урон, пробивающий магический иммунитет вражеских героев.',
        'Концепция и характер героини напрямую вдохновлены культовой волшебницей Линой Инверс из классического фэнтези-аниме Slayers.'
      ]
    }
  };

  // ============================================================
  //  11. МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ГЕРОЕВ (делегируется к единой системе ростера)
  // ============================================================
  function openHeroModal(heroKey) {
    if (typeof openHeroDossier === 'function') {
      openHeroDossier(heroKey);
    }
  }

  function closeHeroModal() {
    if (typeof closeHeroDossier === 'function') {
      closeHeroDossier();
    }
  }


  // ============================================================
  //  11. ТЕЛЕФОН: гибкая валидация и нормализация
  // ============================================================
  const phoneInput = $('#captain-phone');
  const phoneHint  = $('#phone-hint');

  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      const norm = normalizePhone(this.value);
      if (norm) {
        this.setCustomValidity('');
        this.classList.remove('error');
        if (phoneHint) {
          phoneHint.style.color = '#4ade80';
          phoneHint.textContent = '✓ Номер распознан: ' + norm;
        }
      } else if (phoneHint) {
        phoneHint.style.color = '';
        phoneHint.textContent = PHONE_HINT_DEFAULT;
      }
    });

    phoneInput.addEventListener('blur', function () {
      this.classList.toggle('error', this.value.trim() !== '' && !normalizePhone(this.value));
    });
  }

  // ============================================================
  //  12. STEAM OPENID (демо-мок)
  // ============================================================
  const steamLoginBtn = $('#steam-login-btn');
  const steamStatus   = $('#steam-status');
  const steamNick     = $('#steam-nickname');

  steamLoginBtn?.addEventListener('click', e => {
    e.preventDefault();
    const nick = prompt('Введите ваш Steam-ник для верификации:',
                       'Player_' + Math.floor(Math.random() * 9000 + 1000));
    if (!nick) return;
    try { localStorage.setItem(STEAM_KEY, nick); } catch {}
    if (steamNick) steamNick.textContent = nick;
    if (steamStatus) steamStatus.hidden = false;
    steamLoginBtn.textContent = '✓ Steam подтверждён';
    steamLoginBtn.style.background = 'linear-gradient(135deg, #22c55e, #15803d)';
  });

  // Восстановление Steam-сессии при загрузке
  try {
    const savedNick = localStorage.getItem(STEAM_KEY);
    if (savedNick) {
      if (steamNick) steamNick.textContent = savedNick;
      if (steamStatus) steamStatus.hidden = false;
      if (steamLoginBtn) {
        steamLoginBtn.textContent = '✓ Steam подтверждён';
        steamLoginBtn.style.background = 'linear-gradient(135deg, #22c55e, #15803d)';
      }
    }
  } catch {}

  // ============================================================
  //  13. МОДАЛЬНОЕ ОКНО «ОПЛАТА» — имитация процесса оплаты
  // ============================================================
  const paymentModal       = $('#payment-modal');
  const paymentModalClose  = $('#payment-modal-close');
  const pmTeam             = $('#pm-team');
  const pmPlan             = $('#pm-plan');
  const pmAmount           = $('#pm-amount');
  const pmBar              = $('#pm-bar');
  const pmStatus           = $('#pm-status');
  const pmSuccess          = $('#pm-success');

  const PAYMENT_STEPS = [
    { pct: 15,  text: 'Соединение с платёжным шлюзом…' },
    { pct: 35,  text: 'Проверка данных команды…' },
    { pct: 55,  text: 'Обработка транзакции…' },
    { pct: 78,  text: 'Подтверждение банка…' },
    { pct: 95,  text: 'Финализация платежа…' },
    { pct: 100, text: 'Платёж подтверждён ✓' }
  ];

  function openPaymentModal(teamData, callback) {
    if (!paymentModal) return;

    // Заполняем данные
    if (pmTeam)   pmTeam.textContent   = teamData.name;
    if (pmPlan)   pmPlan.textContent   = teamData.planLabel;
    if (pmAmount) pmAmount.textContent = formatMoney(teamData.amount);

    // Сбрасываем прогресс
    if (pmBar)     pmBar.style.width = '0%';
    if (pmStatus)  pmStatus.textContent = PAYMENT_STEPS[0].text;
    if (pmSuccess) pmSuccess.hidden = true;

    // Показываем модалку
    paymentModal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Запускаем анимацию прохождения шагов
    let stepIndex = 0;
    const runStep = () => {
      if (stepIndex >= PAYMENT_STEPS.length) {
        // Успех
        if (pmSuccess) pmSuccess.hidden = false;
        if (pmStatus)  pmStatus.textContent = 'Готово';
        setTimeout(() => {
          closePaymentModal();
          callback && callback();
        }, 1400);
        return;
      }

      const step = PAYMENT_STEPS[stepIndex];
      if (pmBar)    pmBar.style.width = step.pct + '%';
      if (pmStatus) pmStatus.textContent = step.text;

      stepIndex++;
      setTimeout(runStep, 550 + Math.random() * 350);
    };

    setTimeout(runStep, 300);
  }

  function closePaymentModal() {
    if (!paymentModal) return;
    paymentModal.hidden = true;
    document.body.style.overflow = '';
  }

  paymentModalClose?.addEventListener('click', closePaymentModal);
  paymentModal?.addEventListener('click', e => {
    if (e.target === paymentModal) closePaymentModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !paymentModal.hidden) closePaymentModal();
  });

  // ============================================================
  //  14. ОТПРАВКА ФОРМЫ + имитация оплаты + автопереход pending → registered
  // ============================================================
  const form       = $('form');
  const emailInput = $('#captain-email');

  /** Генератор уникального id команды */
  function makeId() {
    return 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      // HTML5-валидация
      if (!form.checkValidity()) { form.reportValidity(); return; }

      // Телефон
      if (phoneInput) {
        const norm = normalizePhone(phoneInput.value);
        if (!norm) {
          phoneInput.classList.add('error');
          phoneInput.focus();
          alert('Пожалуйста, введите корректный российский номер телефона (11 цифр).');
          return;
        }
        phoneInput.value = norm;
      }

      // Email
      if (emailInput) {
        emailInput.classList.remove('error');
        if (!EMAIL_RE.test(emailInput.value.trim())) {
          emailInput.classList.add('error');
          emailInput.focus();
          alert('ОШИБКА: Пожалуйста, введите корректный email.\nРазрешены домены: mail.ru, gmail.com, yandex.ru, ya.ru, rambler.ru, icloud.com и др.');
          return;
        }
      }

      // Собираем данные команды из формы
      const teamName = $('#team-name')?.value.trim() || 'Новая команда';
      const captain  = $('#captain-name')?.value.trim() || '';
      const region   = $('#team-region')?.value || '';
      const division = $('#discipline')?.value || '';
      const mmr      = parseInt($('#captain-mmr')?.value, 10) || 0;
      const membersRaw = $('#team-members')?.value.trim() || '';
      const members  = membersRaw.split('\n').map(s => s.trim()).filter(Boolean);
      const achievements = $('#team-achievements')?.value.trim() || '';

      // Платёжный план
      const planInput = form.querySelector('input[name="payment_plan"]:checked');
      const planValue = planInput ? parseInt(planInput.value, 10) : 1000;
      const planLabel = planInput ? planInput.dataset.label : 'Стандартный';

      // Собираем объект команды
      const team = {
        id: makeId(),
        name: teamName,
        captain, region, division, mmr,
        members, achievements,
        payment: planValue,
        paymentLabel: planLabel,
        ts: Date.now()
      };

      // Блокируем кнопку
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '💳 Обработка оплаты…';
      }

      // Открываем модалку оплаты → после завершения:
      openPaymentModal(
        { name: teamName, amount: planValue, planLabel },
        () => {
          // 1) Добавляем в pending
          const state = store.read();
          state.pending.push(team);
          store.write(state);
          renderTeams();
          switchToPending();

          // 2) Через 1 минуту переносим в registered
          setTimeout(() => {
            const s = store.read();
            const idx = s.pending.findIndex(t => t.id === team.id);
            if (idx !== -1) {
              const [moved] = s.pending.splice(idx, 1);
              s.registered.push(moved);
              store.write(s);
              renderTeams();

              // Если открыта вкладка pending — переключаемся на registered
              const pendingBtn = $('.tab-btn[data-target="tab-pending"]');
              if (pendingBtn?.classList.contains('active')) switchToRegistered();

              // Если достигли 16 команд — создаём launch-counter
              if (s.registered.length >= BRACKET_MIN) {
                createLaunchCounter();
                updateLaunchCounter();
              }
            }
          }, PENDING_DELAY_MS);

          // 3) Меняем кнопку отправки
          if (btn) {
            btn.textContent = '✓ Оплачено и отправлено';
            btn.style.background = '#15803d';
          }

          // 4) Перезагружаем форму через 3 секунды
          setTimeout(() => {
            form.reset();
            if (btn) {
              btn.textContent = '💳 Оплатить и зарегистрироваться';
              btn.disabled = false;
              btn.style.background = '';
            }
          }, 3000);
        }
      );
    });

    // Сброс формы
    form.addEventListener('reset', () => {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.textContent = '💳 Оплатить и зарегистрироваться';
        btn.disabled = false;
        btn.style.background = '';
      }
      emailInput?.classList.remove('error');
      if (phoneInput) {
        phoneInput.classList.remove('error');
        if (phoneHint) {
          phoneHint.style.color = '';
          phoneHint.textContent = PHONE_HINT_DEFAULT;
        }
      }
      const counter = $('#about-team-counter');
      if (counter) counter.textContent = '0 / 500';
    });
  }

  // ============================================================
  //  15. СЧЁТЧИК СИМВОЛОВ TEXTAREA (about-team)
  // ============================================================
  const textarea = $('#about-team');
  if (textarea) {
    let counter = $('#about-team-counter');
    if (!counter) {
      counter = document.createElement('small');
      counter.id = 'about-team-counter';
      counter.style.cssText = 'display:block;margin-top:.25rem;color:var(--text-muted);';
      counter.textContent = '0 / 500';
      textarea.insertAdjacentElement('afterend', counter);
    }
    textarea.addEventListener('input', () => {
      counter.textContent = textarea.value.length + ' / 500';
    });
  }

  // ============================================================
  //  16. MOCK LIVE-МАТЧИ (секция #live)
  // ============================================================
  const liveGrid    = $('#live-grid');
  const liveUpdated = $('#live-updated');

  const MOCK_LIVE = [
    { teamA: 'RedDragons',  teamB: 'GhostRecon',   scoreA: 1, scoreB: 0, status: 'live',
      map: 'Dota 2 · Карта 2', tournament: 'Верхняя сетка · R1',
      stream: 'https://www.twitch.tv/dotaarena2026' },
    { teamA: 'StormForce',  teamB: 'TitanX',       scoreA: 0, scoreB: 1, status: 'live',
      map: 'Dota 2 · Карта 1', tournament: 'Верхняя сетка · R1',
      stream: 'https://www.twitch.tv/dotaarena2026' },
    { teamA: 'DarkMatter',  teamB: 'PixelKillers', scoreA: 2, scoreB: 1, status: 'finished',
      map: 'Dota 2 · BO3', tournament: 'Верхняя сетка · R1',
      stream: 'https://www.twitch.tv/dotaarena2026' },
    { teamA: 'SilverBullet', teamB: 'IronWall',    scoreA: 0, scoreB: 0, status: 'upcoming',
      map: 'Dota 2 · BO3', tournament: 'Верхняя сетка · R1',
      stream: 'https://www.twitch.tv/dotaarena2026' }
  ];

  const STATUS_LABEL = { live: '● LIVE', finished: 'Завершён', upcoming: 'Скоро' };

  function renderLive() {
    if (!liveGrid) return;
    liveGrid.innerHTML = '';
    MOCK_LIVE.forEach(m => {
      const card = document.createElement('article');
      card.className = 'live-match' + (m.status === 'live' ? ' live-match--live' : '');
      card.innerHTML = `
        <div class="live-match__status">${STATUS_LABEL[m.status] || m.status}</div>
        <div class="live-match__teams">
          <div class="live-match__team"><b>${m.scoreA}</b><span>${m.teamA}</span></div>
          <span class="live-match__vs">VS</span>
          <div class="live-match__team"><span>${m.teamB}</span><b>${m.scoreB}</b></div>
        </div>
        <div class="live-match__meta">
          <span>${m.map} · ${m.tournament}</span>
          <a href="${m.stream}" target="_blank" rel="noopener">Twitch →</a>
        </div>`;
      liveGrid.appendChild(card);
    });
    if (liveUpdated) {
      liveUpdated.textContent = `Обновлено: ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
  renderLive();

  // Мок-обновление счёта каждые 30 секунд
  setInterval(() => {
    MOCK_LIVE.forEach(m => {
      if (m.status === 'live' && Math.random() > .6) {
        if (Math.random() > .5) m.scoreA += 1; else m.scoreB += 1;
      }
    });
    renderLive();
  }, 30_000);

  // ============================================================
  //  17. MOCK RSS-НОВОСТИ (секция #news)
  //  Обновлено под патч 7.41f (актуально на 04.10.2026)
  // ============================================================
  const newsFeed = $('#news-feed');

  const MOCK_NEWS = [
    {
      date: '2026-10-04',
      title: 'Патч 7.41f — финальный баланс перед DotaArena 2026',
      text: 'Valve выпустили хотфикс 7.41f. Storm Spirit получил +2 к базовому интеллекту, Hoodwink — небольшой нерф дальности Sharpshooter. Shadow Fiend остался без изменений и по-прежнему в топе меты.'
    },
    {
      date: '2026-09-16',
      title: 'Патч 7.41: что изменилось для мета-героев турнира',
      text: 'Обновление затронуло предметы: Arcane Boots подорожали, добавлен новый артефакт «Змеиный вздох» (Serpent\'s Breath) — кошмар для дальнобойных героев. Spirit Breaker с новой арканой стал жёстче в инициации.'
    },
    {
      date: '2026-08-20',
      title: 'Регистрация на DotaArena 2026 продлена до 1 ноября',
      text: 'Мы продлили приём заявок, чтобы больше команд успели подготовиться на патче 7.41. Призовой фонд собран — 600 000 ₽. Дедлайн регистрации — 1 ноября 2026.'
    },
    {
      date: '2026-03-25',
      title: 'Вышел патч 7.41 — новая эра Dota 2',
      text: 'Valve добавили предметы Voodoo Mask, Spirit Vessel, Adept Array и Serpent\'s Breath. Также обновлён Ability Draft с уникальными способностями. Мета начала меняться уже в первые дни.'
    }
  ];

  function renderNews() {
    if (!newsFeed) return;
    newsFeed.innerHTML = '';
    MOCK_NEWS.forEach(n => {
      const art = document.createElement('article');
      art.className = 'news-item';
      const d = new Date(n.date);
      art.innerHTML = `
        <time datetime="${n.date}">${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
        <h4>${n.title}</h4>
        <p>${n.text}</p>`;
      newsFeed.appendChild(art);
    });
  }
  renderNews();

  // ============================================================
  //  18. АВТОПЕРЕХОД «ЗАВИСШИХ» PENDING ПРИ ЗАГРУЗКЕ
  // ============================================================
  (function resolveStalePending() {
    const state = store.read();
    if (!state.pending.length) return;
    const now = Date.now();
    let changed = false;
    state.pending = state.pending.filter(t => {
      if (now - t.ts >= PENDING_DELAY_MS) {
        state.registered.push(t);
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) {
      store.write(state);
      renderTeams();
      if (state.registered.length >= BRACKET_MIN) {
        createLaunchCounter();
        updateLaunchCounter();
      }
    }
  })();

  // ============================================================
  //  19. ИНТЕРАКТИВНЫЙ ЭКРАН ВСЕХ 127 ГЕРОЕВ DOTA 2 + МОДАЛЬНОЕ ДОСЬЕ
  // ============================================================
  const gridStr = $('#grid-str');
  const gridAgi = $('#grid-agi');
  const gridInt = $('#grid-int');
  const gridAll = $('#grid-all');
  const heroSearchInput = $('#all-heroes-search');
  const heroModalBackdrop = $('#hero-modal-backdrop');
  const heroModalClose = $('#hero-modal-close');
  const heroModalRender = $('#hero-modal-render');
  const heroModalVideo = $('#hero-modal-video');
  const heroModalTitle = $('#hero-modal-title');
  const heroModalSubtitle = $('#hero-modal-subtitle');
  const heroModalBadges = $('#hero-modal-badges');
  const heroModalStats = $('#hero-modal-stats');
  const heroModalDesc = $('#hero-modal-desc');
  const heroModalFacts = $('#hero-modal-facts');
  const heroModalModeSwitcher = $('#hero-modal-mode-switcher');

  const HERO_GIFS = {
    hoodwink: 'images/hoodwink_dance.gif',
    shadow_fiend: 'images/gifs/shadow_fiend.gif',
    pudge: 'images/gifs/pudge.gif',
    invoker: 'images/gifs/invoker.gif',
    storm_spirit: 'images/gifs/storm_spirit.gif',
    antimage: 'images/gifs/antimage.gif',
    juggernaut: 'images/gifs/juggernaut.gif',
    lina: 'images/gifs/lina.gif',
    axe: 'images/gifs/axe.gif',
    witch_doctor: 'images/gifs/witch_doctor.gif',
    rubick: 'images/gifs/rubick.gif',
    phantom_assassin: 'images/gifs/phantom_assassin.gif',
    marci: 'images/gifs/marci.gif',
    earthshaker: 'images/gifs/earthshaker.gif',
    tinker: 'images/gifs/tinker.gif',
    sniper: 'images/gifs/sniper.gif',
    morphling: 'images/gifs/morphling.gif',
    slark: 'images/gifs/slark.gif',
    crystal_maiden: 'images/gifs/crystal_maiden.gif',
    skeleton_king: 'images/gifs/skeleton_king.gif',
    techies: 'images/gifs/techies.gif',
    zuus: 'images/gifs/zuus.gif',
    riki: 'images/gifs/riki.gif',
    void_spirit: 'images/gifs/void_spirit.gif',
    primal_beast: 'images/gifs/primal_beast.gif',
    monkey_king: 'images/gifs/monkey_king.gif',
    terrorblade: 'images/gifs/terrorblade.gif',
    muerta: 'images/gifs/muerta.gif',
    tusk: 'images/gifs/tusk.gif',
    bristleback: 'images/gifs/bristleback.gif',
    ogre_magi: 'images/gifs/ogre_magi.gif',
    enigma: 'images/gifs/enigma.gif',
    tidehunter: 'images/gifs/tidehunter.gif',
    drow_ranger: 'images/gifs/drow_ranger.gif',
    windrunner: 'images/gifs/windrunner.gif',
    ursa: 'images/gifs/ursa.gif',
    lion: 'images/gifs/lion.gif',
    faceless_void: 'images/gifs/faceless_void.gif'
  };

  const heroesData = window.DOTA_HEROES_DATA || [];
  const heroDossiers = window.HERO_DOSSIERS || {};

  const BUILTIN_DOSSIERS = {
    hoodwink: {
      title: "Hoodwink",
      subtitle: "Ловкость · Ключевой маскот турнира",
      badgeAttr: "Ловкость",
      attrColor: "#22c55e",
      render: "images/hoodwink_dance.gif",
      isGif: true,
      stats: {
        "Роль": "Nuker · Escape · Support",
        "Тип атаки": "Дальний бой",
        "Сложность": "Средняя",
        "Ключевой скилл": "Sharpshooter"
      },
      desc: "Хитрая проказница из Томого взрывает поле боя меткими выстрелами из арбалета, прячется в кронах деревьев и ловит зазевавшихся противников в смертоносные сети.",
      facts: [
        "Официальный маскот и символ турнира DotaArena 2026.",
        "Её легендарный победный танец стал главным визуальным лейтмотивом портала.",
        "Способность Bushwhack связывает врагов с деревьями, гарантируя победу в тимфайте."
      ]
    },
    storm_spirit: {
      title: "Storm Spirit",
      subtitle: "Интеллект · Carry, Escape, Nuker, Initiator",
      badgeAttr: "Интеллект",
      attrColor: "#3b82f6",
      render: "images/storm_spirit_render.png",
      isGif: false,
      stats: {
        "Роль": "Магический Carry",
        "Тип атаки": "Дальний бой",
        "Сложность": "Высокая",
        "Ключевой скилл": "Ball Lightning"
      },
      desc: "Буйный и жизнерадостный Райдзин воплощает необузданную стихию ветра и электричества. Врывается в сражения в виде шаровой молнии, не оставляя противникам шанса на спасение.",
      facts: [
        "Обладает бесконечной мобильностью благодаря ультимейту Ball Lightning при наличии маны.",
        "Лицо главного промо-баннера и гранд-финала DotaArena 2026.",
        "Один из сложнейших героев для освоения в соревновательной Dota 2."
      ]
    },
    shadow_fiend: {
      title: "Shadow Fiend",
      subtitle: "Ловкость · Carry, Nuker",
      badgeAttr: "Ловкость",
      attrColor: "#22c55e",
      render: "images/shadow_fiend_render.png",
      isGif: false,
      stats: {
        "Роль": "Соло-мидер / Carry",
        "Тип атаки": "Дальний бой",
        "Сложность": "Высокая",
        "Ключевой скилл": "Shadowraze / Requiem"
      },
      desc: "Невермор пожирает души павших врагов, усиливая свою сокрушительную мощь с каждым убийством. Тройной койл Shadowraze и ультимейт Requiem of Souls обращают поле брани в пепел.",
      facts: [
        "Классический герой для дуэлей 1v1 на центральной линии.",
        "С Aghanim's Scepter души возвращаются назад, исцеляя Shadow Fiend.",
        "Культовый персонаж для хайлайтов и турнирных хай-скилл моментов."
      ]
    },
    pudge: {
      title: "Pudge",
      subtitle: "Универсальный · Disabler, Initiator, Durable",
      badgeAttr: "Универсальные",
      attrColor: "#a855f7",
      render: "images/pudge_render.png",
      isGif: false,
      stats: {
        "Роль": "Инициатор · Ганкер",
        "Тип атаки": "Ближний бой",
        "Сложность": "Средняя",
        "Ключевой скилл": "Meat Hook"
      },
      desc: "Мясник бродит по полям вечной резни в поисках свежего мяса. Его длинный окровавленный крюк Meat Hook выдёргивает даже самых осторожных противников прямо из гущи сражения.",
      facts: [
        "Самый популярный герой в истории Dota 2 по количеству сыгранных матчей.",
        "В недавних обновлениях стал Универсальным героем, получая колоссальный урон от всех статов.",
        "Пассивная способность Flesh Heap даёт бесконечно накапливаемую силу за убийства."
      ]
    },
    antimage: {
      title: "Anti-Mage",
      subtitle: "Ловкость · Carry, Escape, Nuker",
      badgeAttr: "Ловкость",
      attrColor: "#22c55e",
      render: "images/antimage_render.png",
      isGif: false,
      stats: {
        "Роль": "Hard Carry",
        "Тип атаки": "Ближний бой",
        "Сложность": "Средняя",
        "Ключевой скилл": "Mana Void / Blink"
      },
      desc: "Мэгина поклялся искоренить любую магию на земле. Выжигает ману нечестивых колдунов и взрывает их накопленную скверну ультимейтом Mana Void.",
      facts: [
        "Один из быстрейших фармеров на карте благодаря кулдауну Blink в несколько секунд.",
        "Спелл Counterspell отражает направленные вражеские заклинания обратно в магов.",
        "Главный кошмар для Инвокера, Шторма и Лешрака в поздней игре."
      ]
    },
    invoker: {
      title: "Invoker",
      subtitle: "Интеллект · Carry, Nuker, Disabler, Escape",
      badgeAttr: "Интеллект",
      attrColor: "#3b82f6",
      render: "images/invoker_render.png",
      isGif: false,
      stats: {
        "Роль": "Универсальный маг / Мидер",
        "Тип атаки": "Дальний бой",
        "Сложность": "Очень высокая",
        "Ключевой скилл": "10 заклинаний"
      },
      desc: "Карл — древнейший архимаг, знающий тайные слова творения. Комбинируя сферы Quas, Wex и Exort, он призывает в бой 10 разнообразных смертоносных чар.",
      facts: [
        "Единственный герой Dota 2 с арсеналом из 10 активных заклинаний одновременно.",
        "Sun Strike бьёт чистым уроном в любую точку карты сквозь туман войны.",
        "Высший пилотаж микроконтроля и гордость любого мидера турнира."
      ]
    },
    juggernaut: {
      title: "Juggernaut",
      subtitle: "Ловкость · Carry, Pusher, Escape",
      badgeAttr: "Ловкость",
      attrColor: "#22c55e",
      render: "images/juggernaut_render.png",
      isGif: false,
      stats: {
        "Роль": "Классический Carry",
        "Тип атаки": "Ближний бой",
        "Сложность": "Низкая",
        "Ключевой скилл": "Omnislash / Blade Fury"
      },
      desc: "Юрнеро — последний мастер меча с погибшего Острова Масок. Неуязвим к магии во время вихря Blade Fury и разрубает врагов на части смертоносным танцем Omnislash.",
      facts: [
        "Никогда не снимает свою священную ритуальную маску.",
        "Лечебный тотем Healing Ward восстанавливает процентное здоровье всей команде.",
        "Любимый герой миллионов новичков и легендарных киберспортсменов."
      ]
    },
    lina: {
      title: "Lina",
      subtitle: "Интеллект · Carry, Nuker, Support",
      badgeAttr: "Интеллект",
      attrColor: "#3b82f6",
      render: "images/lina_render.png",
      isGif: false,
      stats: {
        "Роль": "Магический / Физический Carry",
        "Тип атаки": "Дальний бой",
        "Сложность": "Низкая",
        "Ключевой скилл": "Laguna Blade"
      },
      desc: "Пылающая колдунья повелевает огнём и чистой молнией. Чем больше заклинаний она применяет, тем быстрее бьёт её пассивная способность Fiery Soul, превращая её в пулемёт разрушения.",
      facts: [
        "Старшая сестра ледяной волшебницы Crystal Maiden, с которой они вечно соперничают.",
        "Laguna Blade с Аганимом наносит чистый урон сквозь невосприимчивость к магии.",
        "В последние сезоны стала грозным физическим керри на первой позиции."
      ]
    }
  };

  const ATTR_NAMES = {
    str: 'Сила',
    agi: 'Ловкость',
    int: 'Интеллект',
    all: 'Универсальный'
  };

  const ATTR_COLORS = {
    str: '#ef4444',
    agi: '#22c55e',
    int: '#3b82f6',
    all: '#a855f7'
  };

  const RU_ALIASES = {
    antimage: 'антимаг антмейдж магина am',
    axe: 'акс топор',
    bane: 'бейн бейнхаллоу',
    bloodseeker: 'бладсикер сикер бс',
    crystal_maiden: 'кристал мейден цмка цм рилай',
    drow_ranger: 'дровка дроу рейнджер тракса',
    earthshaker: 'шейкер эртшейкер ес фисура',
    juggernaut: 'джаггернаут джаггер юрнеро',
    mirana: 'мирана потма стрела',
    morphling: 'морфлинг морф перекачка',
    nevermore: 'сф невермор шадоу финд shadow fiend sf койлы',
    phantom_lancer: 'фантом лансер пл лансер иллюзии',
    puck: 'пак сфера',
    pudge: 'пудж падж мясник хук крюк dendi',
    shadow_shaman: 'шаман раста змеи хекс',
    slardar: 'слардар селёдка стан баш',
    tidehunter: 'тайдхантер тайд арбуз равага',
    witch_doctor: 'витч доктор вд маледикт каска',
    lich: 'лич чайник ульт',
    riki: 'рики рикимару крыса тучка инвиз',
    enigma: 'энигма блэкхол',
    tinker: 'тинкер ботинок ракеты лазер',
    sniper: 'снайпер снайп дед карлик шрапнель',
    necrolyte: 'некрофос некр дедушка коса',
    warlock: 'варлок големы бонды',
    beastmaster: 'бистмастер бист кабан птица',
    queenofpain: 'квопа квин оф пейн qop крик блинк',
    venomancer: 'веномансер веник змейка яд',
    faceless_void: 'войд купол войдик хроносфера',
    skeleton_king: 'вк врейт кинг леорик wraith king криты',
    death_prophet: 'кробелус дп банша духи',
    phantom_assassin: 'мортра фантомка па pa криты дагер',
    pugna: 'пугна вард сосун',
    templar_assassin: 'темплярка ланая та ta щиты мелды',
    viper: 'вайпер яд лужа',
    luna: 'луна селемене ульт бимы',
    dragon_knight: 'дк драгон найт дэвион форма дракона',
    dazzle: 'даззл крест греб могила',
    clockwerk: 'клокверк клок хукшот коги ракетка',
    leshrac: 'лешрак козёл леший молнии дискотека',
    furion: 'фурион фура природа nature спруты пеньки',
    life_stealer: 'гуля найкс гуль lifestealer рейдж',
    dark_seer: 'дарк сир дс стяжка стенка щит ускорение',
    clinkz: 'клинкз боник скелет стрелы инвиз',
    omniknight: 'омник паладин омникнайт репел ульт',
    enchantress: 'энча коза копья приручение',
    huskar: 'хускар стрелы берсерк прыжок',
    night_stalker: 'баланар нс ночь крылья сало',
    broodmother: 'бруда паучиха паук сетка паучата',
    bounty_hunter: 'бх баунти трек гондар треки инвиз',
    weaver: 'вивер жук жучки ульт перемотка',
    jakiro: 'джакиро твинхед дракон огонь лед макропира',
    batrider: 'бэт райдер мышь лассо смола огонь',
    chen: 'чен крипы зоопарк телепорт хилка',
    spectre: 'спектра меркуриал дагер ульт дизолейт',
    ancient_apparition: 'аппарат аа колд фит айс бласт',
    doom_bringer: 'дум люцифер ульт печать',
    ursa: 'урса медведь фури лапы ульт рошан',
    spirit_breaker: 'баратрум бара сб разгон баш 17%',
    gyrocopter: 'гирокоптер вертолёт гиро ракеты флак',
    alchemist: 'алхимик алхим раззл монетка банка ульт',
    invoker: 'инвокер вокер карл каэль санстрайк метеор',
    silencer: 'сало сайленсер нортром глобал интеллект',
    obsidian_destroyer: 'од астрал дестроер outworld ульт астрал',
    lycan: 'ликан волк волколак волки вой форма',
    brewmaster: 'панда брюмастер хмелевар пиво панды',
    shadow_demon: 'шд шадоу демон астрал яд соул катчер',
    lone_druid: 'силлабир друид мишка медвед кортик',
    chaos_knight: 'хаос цк конь болт иллюзии криты',
    meepo: 'мипо геомансер клоны пуф сетка лопата',
    treant: 'трент дерево руфтреллен корни хилка броня',
    ogre_magi: 'огр маг многократный каст мультикаст стан бладласт',
    undying: 'зомби андаинг томба дирж распад сила',
    rubick: 'рубик маг вор спеллов телекинез спелстил',
    disruptor: 'дизраптор тралл буря глимпс клетка статик',
    nyx_assassin: 'никс жук карапаси стан манаберн вендетта',
    naga_siren: 'нага сирена сон сетка иллюзии риптайд',
    keeper_of_the_light: 'котл старик свет гендальф задувка мана',
    visage: 'визаж горгульи птицы соул ассумпшен стоун форм',
    slark: 'сларк рыба ночной ловец паунс ульт темный пакт',
    medusa: 'медуза дуза щит камни змейка сплитшот',
    troll_warlord: 'тролль джахракал ульт топоры переключение',
    centaur: 'кентавр кент кентвар стан возвратка штамп',
    magnataur: 'магнус маг рп рог шоквейв скивер реверс',
    shredder: 'тимбер пила дереворуб риззрак хук чакрам',
    bristleback: 'бристлбек брист ёж спина сопли колючки',
    tusk: 'таск морж снежок юмир удар печать',
    skywrath_mage: 'скаймаг драгонус петух петушок сало мистик флаер',
    abaddon: 'абаддон время заимствования щит койл ульт',
    elder_titan: 'титан элдер титан раскол дух усыпление',
    legion_commander: 'легионка дуэль треска стрелы очищение',
    techies: 'минеры течис течисы бомбы суицид липучка',
    ember_spirit: 'эмбер спирит синь огонь ремнант кулаки щит',
    earth_spirit: 'земеля эрт спирит каолин камни толчок притяжение',
    underlord: 'андерлорд питлорд яма дождь портал аура',
    terrorblade: 'террорблейд тб иллюзии метаморфоза сандер',
    phoenix: 'феникс птица яйцо солнце луч птички',
    oracle: 'оракул нерис судьба очищение ульт ложная судьба',
    winter_wyvern: 'виверна аурора проклятие полет хилка сплинтер',
    arc_warden: 'арк варден зет спарк клон купол копия мидас',
    monkey_king: 'мк манки кинг обезьяна сунь укун палка дерево арена',
    dark_willow: 'миреска виллоу фея террор бедулам лабиринт тень',
    pangolier: 'пангольер панго броненосец шарик ролл сабля обезоруживание',
    grimstroke: 'гримстрок грим кисть чернила фантом связка',
    hoodwink: 'худвинк белка талисман белка шаромыга sharpshooter желудь капкан',
    void_spirit: 'войд спирит инай ремнант портал диссимилейт астрал',
    snapfire: 'бабка снепфайр мортимер печенье поцелуи дробовик',
    mars: 'марс арена копье бог войны щит отталкивание',
    dawnbreaker: 'валора валора молот даунбрейкер ульт прилет хилка',
    marci: 'марси аниме удары безмолвная бросок ярость',
    primal_beast: 'примал бист динозавр топот зверь разгон рок',
    muerta: 'муэрта пистолеты духи смерть рикошет ульт призрак',
    ringmaster: 'рингмастер цирк колесо фокусник хлыст',
    kez: 'кез птица катана сабля сокол самурай'
  };

  function initHeroPickGrid() {
    if (!gridStr && !gridAgi && !gridInt && !gridAll) return;

    const existingCards = $$('.dota-hero-pick');
    if (existingCards.length > 0) {
      const cStr = $('#count-str'); if (cStr && gridStr) cStr.textContent = gridStr.querySelectorAll('.dota-hero-pick').length;
      const cAgi = $('#count-agi'); if (cAgi && gridAgi) cAgi.textContent = gridAgi.querySelectorAll('.dota-hero-pick').length;
      const cInt = $('#count-int'); if (cInt && gridInt) cInt.textContent = gridInt.querySelectorAll('.dota-hero-pick').length;
      const cAll = $('#count-all'); if (cAll && gridAll) cAll.textContent = gridAll.querySelectorAll('.dota-hero-pick').length;

      existingCards.forEach(card => {
        const shortName = card.dataset.hero;
        const heroName = card.dataset.heroName || card.getAttribute('aria-label') || shortName;
        const attr = card.dataset.attr || 'all';

        const openHandler = () => {
          const heroObj = heroesData.find(h => h.name === `npc_dota_hero_${shortName}`) || {
            name: `npc_dota_hero_${shortName}`,
            localized_name: heroName,
            primary_attr: attr
          };
          openHeroDossier(shortName, heroObj, card);
        };

        card.addEventListener('click', openHandler);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openHandler();
          }
        });
      });
      return;
    }

    if (heroesData.length > 0) {
      heroesData.forEach(hero => {
        const shortName = hero.name.replace('npc_dota_hero_', '');
        const card = document.createElement('div');
        card.className = 'dota-hero-pick';
        card.dataset.hero = shortName;
        card.dataset.heroName = (hero.localized_name || shortName);
        card.dataset.attr = hero.primary_attr;
        
        const ruAlias = RU_ALIASES[shortName] || '';
        card.dataset.search = `${shortName} ${(hero.localized_name || '').toLowerCase()} ${ruAlias}`;

        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', hero.localized_name);

        card.innerHTML = `
          <img src="images/heroes/${shortName}.png"
               alt="${hero.localized_name}"
               loading="lazy"
               onerror="this.onerror=null;this.src='https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${shortName}.png';">
          <span class="dota-hero-pick__tooltip">${hero.localized_name}</span>
        `;

        const openHandler = () => openHeroDossier(shortName, hero, card);
        card.addEventListener('click', openHandler);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openHandler();
          }
        });

        if (hero.primary_attr === 'str' && gridStr) gridStr.appendChild(card);
        else if (hero.primary_attr === 'agi' && gridAgi) gridAgi.appendChild(card);
        else if (hero.primary_attr === 'int' && gridInt) gridInt.appendChild(card);
        else if (hero.primary_attr === 'all' && gridAll) gridAll.appendChild(card);
      });

      const cStr = $('#count-str'); if (cStr && gridStr) cStr.textContent = gridStr.children.length;
      const cAgi = $('#count-agi'); if (cAgi && gridAgi) cAgi.textContent = gridAgi.children.length;
      const cInt = $('#count-int'); if (cInt && gridInt) cInt.textContent = gridInt.children.length;
      const cAll = $('#count-all'); if (cAll && gridAll) cAll.textContent = gridAll.children.length;
    }
  }

  // Клик по карточкам ключевого трио турнира (в шапке и в секции)
  $$('.trio-hero-card, .hero-showcase .hero-card').forEach(trioCard => {
    trioCard.addEventListener('click', () => {
      const heroKey = trioCard.dataset.hero;
      const heroObj = heroesData.find(h => h.name === `npc_dota_hero_${heroKey}`) || null;
      openHeroDossier(heroKey, heroObj, trioCard);
    });
  });

  function openHeroDossier(shortName, heroObj, cardElement) {
    if (!heroModalBackdrop) return;

    if (!heroObj && heroesData.length > 0) {
      heroObj = heroesData.find(h => h.name === `npc_dota_hero_${shortName}`) || null;
    }

    const dossier = BUILTIN_DOSSIERS[shortName] || (heroDossiers && heroDossiers[shortName]) || null;
    const heroName = (dossier && dossier.title) || (heroObj && heroObj.localized_name) || (cardElement && cardElement.dataset.heroName) || shortName;
    const attrKey = (heroObj && heroObj.primary_attr) || (cardElement && cardElement.dataset.attr) || (dossier ? (dossier.badgeAttr === 'Сила' ? 'str' : dossier.badgeAttr === 'Ловкость' ? 'agi' : dossier.badgeAttr === 'Интеллект' ? 'int' : 'all') : 'all');
    const attrName = ATTR_NAMES[attrKey] || 'Атрибут';
    const attrColor = ATTR_COLORS[attrKey] || '#0ea5e9';

    // 1. Изображение слева — 100% ЛОКАЛЬНЫЙ РЕНДЕР / GIF НА ПК
    if (heroModalRender) {
      if (heroModalVideo) {
        heroModalVideo.hidden = true;
        heroModalVideo.pause();
        heroModalVideo.removeAttribute('src');
      }

      heroModalRender.hidden = false;

      // Каждый герой имеет локальную анимированную GIF (на диске images/gifs/ или dance для Hoodwink)
      const gifSrc = (shortName === 'hoodwink') ? 'images/hoodwink_dance.gif' : `images/gifs/${shortName}.gif`;
      const renderSrc = `images/renders/${shortName}.png`;

      heroModalRender.src = gifSrc;
      heroModalRender.alt = `${heroName} во весь рост`;
      heroModalRender.onerror = function() {
        this.onerror = null;
        this.src = renderSrc;
        this.onerror = function() {
          this.onerror = null;
          this.src = `images/heroes/${shortName}.png`;
        };
      };

      // Интерактивный переключатель режимов (GIF / ZXC / 3D Рендер)
      if (heroModalModeSwitcher) {
        heroModalModeSwitcher.innerHTML = '';

        if (shortName === 'shadow_fiend' || shortName === 'nevermore') {
          // Эксклюзивный культовый набор для Shadow Fiend: ZXC Requiem, ZXCURSED, 3D Рендер
          const sfModes = [
            { label: '⚡ ZXC Requiem', src: 'images/gifs/shadow_fiend.gif', active: true },
            { label: '💀 ZXCURSED', src: 'images/gifs/shadow_fiend_zxcursed.gif', active: false },
            { label: '🖼 3D Рендер', src: 'images/renders/shadow_fiend.png', active: false }
          ];

          sfModes.forEach(mode => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hero-modal__mode-btn' + (mode.active ? ' hero-modal__mode-btn--active' : '');
            btn.textContent = mode.label;
            btn.addEventListener('click', () => {
              heroModalRender.src = mode.src;
              heroModalModeSwitcher.querySelectorAll('.hero-modal__mode-btn').forEach(b => b.classList.remove('hero-modal__mode-btn--active'));
              btn.classList.add('hero-modal__mode-btn--active');
            });
            heroModalModeSwitcher.appendChild(btn);
          });
        } else {
          // Для каждого героя доступна GIF анимация (мемная / игровая / танец) и статичный 3D рендер
          const heroModes = [
            { label: shortName === 'hoodwink' ? '💃 Танец белки' : '⚡ GIF Анимация', src: gifSrc, active: true },
            { label: '🖼 3D Рендер', src: renderSrc, active: false }
          ];

          heroModes.forEach(mode => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hero-modal__mode-btn' + (mode.active ? ' hero-modal__mode-btn--active' : '');
            btn.textContent = mode.label;
            btn.addEventListener('click', () => {
              heroModalRender.src = mode.src;
              heroModalModeSwitcher.querySelectorAll('.hero-modal__mode-btn').forEach(b => b.classList.remove('hero-modal__mode-btn--active'));
              btn.classList.add('hero-modal__mode-btn--active');
            });
            heroModalModeSwitcher.appendChild(btn);
          });
        }
      }
    }

    // Динамическая подсветка ауры в стиле Liquid Glass под атрибут героя
    const heroModalVisual = $('.hero-modal__visual');
    if (heroModalVisual) {
      const aColor = attrColor.startsWith('#') ? attrColor : '#0ea5e9';
      heroModalVisual.style.background = `radial-gradient(circle at center, ${aColor}38 0%, ${aColor}14 50%, rgba(4, 9, 20, .94) 85%)`;
    }

    // 2. Бейджи
    if (heroModalBadges) {
      const roles = (heroObj && heroObj.roles) || (dossier && dossier.badges) || ['Боец турнира'];
      const attack = (heroObj && heroObj.attack_type === 'Melee') ? 'Ближний бой' : 'Дальний бой';
      heroModalBadges.innerHTML = `
        <span class="hero-modal__badge" style="background:${attrColor}25; color:${attrColor}; border-color:${attrColor}77;">${attrName}</span>
        <span class="hero-modal__badge">${attack}</span>
        ${roles.slice(0, 3).map(r => `<span class="hero-modal__badge">${r}</span>`).join('')}
      `;
    }

    // 3. Заголовок и подзаголовок
    if (heroModalTitle) heroModalTitle.textContent = heroName;
    if (heroModalSubtitle) {
      const rolesList = (heroObj && heroObj.roles && heroObj.roles.join(', ')) || (dossier && dossier.subtitle) || 'Участник турнира';
      heroModalSubtitle.textContent = `${attrName} · ${rolesList}`;
    }

    // 4. Характеристики
    if (heroModalStats) {
      if (dossier && dossier.stats) {
        heroModalStats.innerHTML = Object.entries(dossier.stats).map(([k, v]) => `
          <div class="hero-modal__stat-item">
            <span class="hero-modal__stat-label">${k}</span>
            <span class="hero-modal__stat-val">${v}</span>
          </div>
        `).join('');
      } else {
        const attack = (heroObj && heroObj.attack_type === 'Melee') ? 'Ближний бой' : 'Дальний бой';
        const rolesStr = (heroObj && heroObj.roles && heroObj.roles.slice(0, 2).join(' / ')) || 'Боец турнира';
        heroModalStats.innerHTML = `
          <div class="hero-modal__stat-item">
            <span class="hero-modal__stat-label">Основной атрибут</span>
            <span class="hero-modal__stat-val" style="color:${attrColor}">${attrName}</span>
          </div>
          <div class="hero-modal__stat-item">
            <span class="hero-modal__stat-label">Тип атаки</span>
            <span class="hero-modal__stat-val">${attack}</span>
          </div>
          <div class="hero-modal__stat-item">
            <span class="hero-modal__stat-label">Главная роль</span>
            <span class="hero-modal__stat-val">${rolesStr}</span>
          </div>
          <div class="hero-modal__stat-item">
            <span class="hero-modal__stat-label">Статус турнира</span>
            <span class="hero-modal__stat-val" style="color:#22c55e">Допущен к драфту</span>
          </div>
        `;
      }
    }

    // 5. Описание
    if (heroModalDesc) {
      if (dossier && dossier.desc) {
        heroModalDesc.textContent = dossier.desc;
      } else {
        const attack = (heroObj && heroObj.attack_type === 'Melee') ? 'ближнего боя' : 'дальнего боя';
        const roles = (heroObj && heroObj.roles && heroObj.roles.join(', ')) || 'универсального назначения';
        heroModalDesc.textContent = `${heroName} — легендарный представитель категории «${attrName}». Специализируется на стиле боя ${attack} и выполняет ключевые тактические задачи: ${roles}. Доступен для драфта на турнире DotaArena 2026.`;
      }
    }

    // 6. Факты
    if (heroModalFacts) {
      heroModalFacts.innerHTML = '';
      const factsList = (dossier && dossier.facts) || [
        `Один из признанных героев патча 7.41f с высоким винрейтом на соревновательной сцене.`,
        `Входит в официальный пул персонажей любительского кубка DotaArena 2026.`,
        `Прекрасно сочетается в командных связках с ключевыми героями турнира — Storm Spirit и Hoodwink.`
      ];
      factsList.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        heroModalFacts.appendChild(li);
      });
    }

    heroModalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeHeroDossier() {
    if (!heroModalBackdrop) return;
    heroModalBackdrop.hidden = true;
    document.body.style.overflow = '';
    if (heroModalVideo) {
      heroModalVideo.pause();
      heroModalVideo.hidden = true;
      heroModalVideo.removeAttribute('src');
    }
  }

  if (heroModalClose) {
    heroModalClose.addEventListener('click', closeHeroDossier);
  }

  if (heroModalBackdrop) {
    heroModalBackdrop.addEventListener('click', (e) => {
      if (e.target === heroModalBackdrop) closeHeroDossier();
    });
  }

  // Полноэкранный режим сетки ростера героев
  const fsBtn = $('#all-heroes-fs-toggle');
  const heroesSection = $('#heroes');

  if (fsBtn && heroesSection) {
    fsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isFs = heroesSection.classList.toggle('roster-fullscreen-mode');
      if (isFs) {
        document.body.style.overflow = 'hidden';
        fsBtn.innerHTML = '<span class="fs-btn-icon">✕</span> <span class="fs-btn-text">Свернуть (ESC)</span>';
        fsBtn.classList.add('active');
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch(err) {}
      } else {
        document.body.style.overflow = '';
        fsBtn.innerHTML = '<span class="fs-btn-icon">⛶</span> <span class="fs-btn-text">Открыть во весь экран ↗</span>';
        fsBtn.classList.remove('active');
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch(err) {}
      }
    });
  }

  const fsCornerClose = $('#roster-fs-close-corner');
  if (fsCornerClose && heroesSection && fsBtn) {
    fsCornerClose.addEventListener('click', (e) => {
      e.preventDefault();
      heroesSection.classList.remove('roster-fullscreen-mode');
      document.body.style.overflow = '';
      fsBtn.innerHTML = '<span class="fs-btn-icon">⛶</span> <span class="fs-btn-text">Открыть во весь экран ↗</span>';
      fsBtn.classList.remove('active');
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch(err) {}
    });
  }


  // Закрытие по Escape (модалка или полноэкранный режим)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (heroModalBackdrop && !heroModalBackdrop.hidden) {
        closeHeroDossier();
      } else if (heroesSection && heroesSection.classList.contains('roster-fullscreen-mode')) {
        heroesSection.classList.remove('roster-fullscreen-mode');
        document.body.style.overflow = '';
        if (fsBtn) {
          fsBtn.innerHTML = '<span class="fs-btn-icon">⛶</span> <span class="fs-btn-text">Открыть во весь экран ↗</span>';
          fsBtn.classList.remove('active');
        }
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch(err) {}
      }
    }
  });

  // Синхронизация при выходе из нативного полноэкранного режима браузера
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && heroesSection && heroesSection.classList.contains('roster-fullscreen-mode')) {
      heroesSection.classList.remove('roster-fullscreen-mode');
      document.body.style.overflow = '';
      if (fsBtn) {
        fsBtn.innerHTML = '<span class="fs-btn-icon">⛶</span> <span class="fs-btn-text">Открыть во весь экран ↗</span>';
        fsBtn.classList.remove('active');
      }
    }
  });

  // Поиск по героям в реальном времени (русский и английский)
  const searchClearBtn = $('#search-clear-btn');

  if (heroSearchInput) {
    heroSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (searchClearBtn) searchClearBtn.hidden = !q;

      $$('.dota-hero-pick').forEach(card => {
        const searchStr = card.dataset.search || card.dataset.heroName || '';
        if (!q || searchStr.includes(q)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  }

  if (searchClearBtn && heroSearchInput) {
    searchClearBtn.addEventListener('click', () => {
      heroSearchInput.value = '';
      searchClearBtn.hidden = true;
      $$('.dota-hero-pick').forEach(card => card.classList.remove('hidden'));
      heroSearchInput.focus();
    });
  }

  // Фильтр по плашкам категорий атрибутов со счётчиками
  const dotaPickScreen = $('#dota-pick-screen');
  const filterPills = $$('.all-heroes-pill, .roster-attr-card, .heroes-pill');
  const dotaColumns = $$('.dota-column');

  filterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const filterAttr = pill.dataset.filter;
      const wasActive = pill.classList.contains('active');

      filterPills.forEach(p => p.classList.remove('active'));

      if (wasActive && filterAttr !== 'all-attr') {
        // Повторный клик — возврат к "Все герои"
        const allBtn = document.querySelector('[data-filter="all-attr"]');
        if (allBtn) allBtn.classList.add('active');
        dotaColumns.forEach(col => col.style.display = '');
        if (dotaPickScreen) {
          dotaPickScreen.classList.remove('single-column-active');
          dotaPickScreen.style.gridTemplateColumns = '';
        }
      } else if (filterAttr === 'all-attr') {
        pill.classList.add('active');
        dotaColumns.forEach(col => col.style.display = '');
        if (dotaPickScreen) {
          dotaPickScreen.classList.remove('single-column-active');
          dotaPickScreen.style.gridTemplateColumns = '';
        }
      } else {
        pill.classList.add('active');
        dotaColumns.forEach(col => {
          const colAttr = col.dataset.attr;
          col.style.display = (colAttr === filterAttr) ? 'flex' : 'none';
        });
        if (dotaPickScreen) {
          dotaPickScreen.classList.add('single-column-active');
          dotaPickScreen.style.gridTemplateColumns = '1fr';
        }
      }
    });
  });

  // Проверка статуса авторизации из localStorage (страница входа login.html)
  try {
    const savedUser = localStorage.getItem('dotaarena_user');
    const navLoginBtn = $('#nav-login-btn');
    if (savedUser && navLoginBtn) {
      const userData = JSON.parse(savedUser);
      if (userData && userData.name) {
        navLoginBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>${userData.name}</span>
        `;
        navLoginBtn.title = `Вы вошли как ${userData.name}. Нажмите для выхода`;
        navLoginBtn.addEventListener('click', (e) => {
          if (confirm(`Вы вошли как ${userData.name}. Хотите выйти из профиля?`)) {
            e.preventDefault();
            localStorage.removeItem('dotaarena_user');
            window.location.reload();
          }
        });
      }
    }
  } catch(e) {}

  initHeroPickGrid();

});