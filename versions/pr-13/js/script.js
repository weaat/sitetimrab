'use strict';

/**
 * ============================================================
 * ПРАКТИКА 13: ВАЛИДАЦИЯ ФОРМ, КАЛЬКУЛЯТОР И ТЕСТИРОВАНИЕ
 * Проект: Регистрация команды на турнир DotaArena 2026
 * ============================================================
 */

// ------------------------------------------------------------
// ЭТАП 6: ФУНКЦИЯ РАСЧЁТА ПО ФОРМУЛЕ ВАРИАНТА
// ------------------------------------------------------------

/**
 * Выполняет расчёт регистрационного взноса и посевного рейтинга
 * @param {Object} normData Нормализованные данные формы
 * @returns {Object} Результаты расчёта и рекомендация
 */
function calculateTournamentEntry(normData) {
  // 1. Базовая стоимость дивизиона (switch)
  let baseFee = 0;
  let tierLabel = '';
  let seedMultiplier = 1.0;

  switch (normData.tier) {
    case 'pro':
      baseFee = 12000;
      tierLabel = 'PRO Дивизион (Высшая лига)';
      seedMultiplier = 1.35;
      break;
    case 'semipro':
      baseFee = 6000;
      tierLabel = 'Semi-PRO Дивизион (Претенденты)';
      seedMultiplier = 1.15;
      break;
    case 'amateur':
    default:
      baseFee = 2500;
      tierLabel = 'Open Amateur (Любительская лига)';
      seedMultiplier = 1.0;
      break;
  }

  // 2. Дополнительные опции
  const extraPlayersCount = Math.max(0, normData.playersCount - 5);
  const extraPlayersFee = extraPlayersCount * 500; // по 500 RUB за запасных

  // Фирменный мерч-пакет (футболка gazbloki31.ru по 1337 RUB)
  const merchFee = normData.wantsMerch ? (normData.playersCount * 1337) : 0;

  // Скидка ранней пташки (ранняя регистрация)
  const discountRate = normData.earlyBird ? 0.15 : 0.0;
  const subtotal = baseFee + extraPlayersFee;
  const discountAmount = Math.round(subtotal * discountRate);

  // Итоговая сумма к оплате
  const totalFee = subtotal - discountAmount + merchFee;

  // 3. Расчёт посевного рейтинга (Seed Rating)
  // База: MMR * множитель дивизиона + региональный коэффициент
  const regionBonus = (normData.region === 'cis') ? 150 : 100;
  const seedRating = Math.round((normData.avgMmr / 10) * seedMultiplier + regionBonus);

  // 4. Формирование аналитической рекомендации
  let recommendation = '';
  if (normData.avgMmr >= 12000) {
    recommendation = 'Ваш состав квалифицируется в Топ-1 посев турнира. Рекомендуем интенсивные скримы с фаворитами сетки.';
  } else if (normData.tier === 'pro' && normData.avgMmr < 11000) {
    recommendation = 'В PRO-дивизионе высокий уровень конкуренции. Рекомендуем укрепить драфты и подключить аналитика.';
  } else if (normData.playersCount === 5) {
    recommendation = 'У вас нет запасных игроков. Настоятельно рекомендуем заявить шестого игрока на случай технических замен.';
  } else {
    recommendation = 'Заявка сбалансирована. Состав допущен к открытой жеребьёвке группового этапа.';
  }

  return {
    baseFee,
    tierLabel,
    extraPlayersFee,
    discountAmount,
    merchFee,
    totalFee,
    seedRating,
    recommendation
  };
}

// ------------------------------------------------------------
// ЭТАП 3 И 4: НОРМАЛИЗАЦИЯ ДАННЫХ И ФУНКЦИЯ ВАЛИДАЦИИ
// ------------------------------------------------------------

/**
 * Нормализует сырые данные из формы
 * @param {FormData} formData Экземпляр FormData
 * @returns {Object} Нормализованный объект
 */
function normalizeFormData(formData) {
  const rawTeamName = formData.get('teamName') || '';
  const rawTag = formData.get('teamTag') || '';
  const rawCaptain = formData.get('captainName') || '';
  const rawEmail = formData.get('captainEmail') || '';
  const rawMmr = formData.get('avgMmr') || '';
  const rawPlayers = formData.get('playersCount') || '';
  const rawTier = formData.get('tier') || 'amateur';
  const rawRegion = formData.get('region') || 'cis';
  const rawEarlyBird = formData.get('earlyBird');
  const rawWantsMerch = formData.get('wantsMerch');

  return {
    teamName: String(rawTeamName).trim(),
    teamTag: String(rawTag).trim().toUpperCase(),
    captainName: String(rawCaptain).trim(),
    captainEmail: String(rawEmail).trim().toLowerCase(),
    avgMmr: Number(rawMmr),
    playersCount: Number(rawPlayers),
    tier: String(rawTier).trim(),
    region: String(rawRegion).trim(),
    earlyBird: Boolean(rawEarlyBird),
    wantsMerch: Boolean(rawWantsMerch)
  };
}

/**
 * Валидация нормализованных данных (Этап 4 методички)
 * Проверяет диапазон, связь двух полей и допустимость сочетаний
 * @param {Object} data Нормализованные данные
 * @returns {Object} Объект с ошибками { fieldName: 'Текст ошибки' }
 */
function validateRegistration(data) {
  const errors = {};

  // 1. Валидация названия команды
  if (!data.teamName) {
    errors.teamName = 'Укажите название команды.';
  } else if (data.teamName.length < 3 || data.teamName.length > 30) {
    errors.teamName = 'Длина названия команды должна быть от 3 до 30 символов.';
  }

  // 2. Валидация тега команды (2-5 символов латиницы/цифр)
  const tagRegex = /^[A-Z0-9]{2,5}$/;
  if (!data.teamTag) {
    errors.teamTag = 'Укажите тег команды.';
  } else if (!tagRegex.test(data.teamTag)) {
    errors.teamTag = 'Тег должен содержать от 2 до 5 латинских букв или цифр (например, GZ31, TS).';
  }

  // 3. Валидация капитана и email
  if (!data.captainName) {
    errors.captainName = 'Укажите никнейм капитана.';
  } else if (data.captainName.length < 2) {
    errors.captainName = 'Никнейм капитана слишком короткий (минимум 2 символа).';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.captainEmail) {
    errors.captainEmail = 'Укажите контактный email капитана.';
  } else if (!emailRegex.test(data.captainEmail)) {
    errors.captainEmail = 'Введите корректный email (например, captain@gazbloki31.ru).';
  }

  // 4. Смысловое условие 1: Диапазон чисел
  if (!Number.isFinite(data.avgMmr)) {
    errors.avgMmr = 'Введите корректное числовое значение MMR.';
  } else if (data.avgMmr < 3000 || data.avgMmr > 15000) {
    errors.avgMmr = 'Средний MMR команды должен быть в диапазоне от 3 000 до 15 000.';
  }

  if (!Number.isFinite(data.playersCount)) {
    errors.playersCount = 'Укажите количество игроков.';
  } else if (data.playersCount < 5 || data.playersCount > 7) {
    errors.playersCount = 'Количество игроков в заявке должно быть от 5 (основа) до 7 (с заменами).';
  }

  // 5. Смысловое условие 2: Связь двух полей (Дивизион и MMR)
  if (data.tier === 'pro' && Number.isFinite(data.avgMmr) && data.avgMmr < 10000) {
    errors.avgMmr = 'Для участия в PRO-дивизионе минимальный средний MMR команды составляет 10 000.';
  } else if (data.tier === 'semipro' && Number.isFinite(data.avgMmr) && data.avgMmr < 6000) {
    errors.avgMmr = 'Для участия в Semi-PRO средний MMR команды должен быть не ниже 6 000.';
  }

  // 6. Смысловое условие 3: Допустимость сочетания (Защита бренд-тега)
  if (data.teamTag === 'GZ31' && !data.teamName.toLowerCase().includes('gazbloki')) {
    errors.teamTag = 'Тег GZ31 зарезервирован исключительно за ростером gazbloki31.ru.';
  }

  return errors;
}

// ------------------------------------------------------------
// ЭТАП 5: ОТОБРАЖЕНИЕ ОШИБОК И ПЕРЕВОД ФОКУСА
// ------------------------------------------------------------

/**
 * Очищает все отображаемые ошибки формы
 * @param {HTMLFormElement} form Элемент формы
 */
function clearFormErrors(form) {
  const errorElements = form.querySelectorAll('.field-error');
  errorElements.forEach(el => {
    el.textContent = '';
  });

  const inputs = form.querySelectorAll('[aria-invalid="true"]');
  inputs.forEach(input => {
    input.removeAttribute('aria-invalid');
  });
}

/**
 * Отображает ошибки рядом с полями и переводит фокус к первому ошибочному полю
 * @param {HTMLFormElement} form Форма
 * @param {Object} errors Объект с ошибками
 */
function displayFormErrors(form, errors) {
  let firstErrorInput = null;

  for (const [fieldName, errorMessage] of Object.entries(errors)) {
    const errorEl = document.getElementById(`error-${fieldName}`);
    const inputEl = form.querySelector(`[name="${fieldName}"]`);

    if (errorEl) {
      errorEl.textContent = errorMessage;
    }

    if (inputEl) {
      inputEl.setAttribute('aria-invalid', 'true');
      if (!firstErrorInput) {
        firstErrorInput = inputEl;
      }
    }
  }

  // Перевод фокуса к первой ошибке (Этап 5 методички)
  if (firstErrorInput) {
    firstErrorInput.focus();
  }
}

// ------------------------------------------------------------
// ЭТАП 7: ВЫВОД ИТОГОВОЙ КАРТОЧКИ С ПЕРЕВОДОМ ФОКУСА
// ------------------------------------------------------------

/**
 * Отрисовывает результат в карточку с aria-live и переводит фокус
 * @param {Object} data Нормализованные данные
 * @param {Object} calc Результаты расчёта
 */
function displayResultCard(data, calc) {
  const resultContainer = document.getElementById('result-card');
  if (!resultContainer) return;

  const formatRub = (num) => num.toLocaleString('ru-RU') + ' RUB';

  resultContainer.innerHTML = `
    <div class="result-header">
      <div class="result-badge">Заявка успешно подтверждена</div>
      <h3 class="result-title">[${escapeHtml(data.teamTag)}] ${escapeHtml(data.teamName)}</h3>
      <p class="result-subtitle">Капитан: <strong>${escapeHtml(data.captainName)}</strong> (${escapeHtml(data.captainEmail)})</p>
    </div>

    <div class="result-grid">
      <div class="result-item">
        <span class="result-item__label">Выбранный дивизион:</span>
        <span class="result-item__val">${escapeHtml(calc.tierLabel)}</span>
      </div>
      <div class="result-item">
        <span class="result-item__label">Средний MMR состава:</span>
        <span class="result-item__val"><strong>${data.avgMmr.toLocaleString('ru-RU')} MMR</strong></span>
      </div>
      <div class="result-item">
        <span class="result-item__label">Заявлено игроков:</span>
        <span class="result-item__val">${data.playersCount} (5 основа${data.playersCount > 5 ? ` + ${data.playersCount - 5} замена` : ''})</span>
      </div>
      <div class="result-item">
        <span class="result-item__label">Посевной рейтинг (Seed):</span>
        <span class="result-item__val result-item__val--seed">${calc.seedRating} pts</span>
      </div>
    </div>

    <div class="result-calc-breakdown">
      <h4>Финансовый расчёт взноса:</h4>
      <ul>
        <li>Базовый слот дивизиона: <span>${formatRub(calc.baseFee)}</span></li>
        ${calc.extraPlayersFee > 0 ? `<li>Слоты запасных игроков: <span>+${formatRub(calc.extraPlayersFee)}</span></li>` : ''}
        ${calc.discountAmount > 0 ? `<li class="calc-discount">Скидка ранней регистрации (-15%): <span>-${formatRub(calc.discountAmount)}</span></li>` : ''}
        ${calc.merchFee > 0 ? `<li>Официальный мерч-пакет (${data.playersCount} футболок по 1 337 RUB): <span>+${formatRub(calc.merchFee)}</span></li>` : ''}
      </ul>
      <div class="result-total">
        <span>Итого к оплате:</span>
        <strong>${formatRub(calc.totalFee)}</strong>
      </div>
    </div>

    <div class="result-recommendation">
      <strong>Рекомендация оргкомитета:</strong>
      <p>${escapeHtml(calc.recommendation)}</p>
    </div>
  `;

  resultContainer.hidden = false;

  // Перевод фокуса на карточку результата (Этап 7 методички)
  resultContainer.focus();
}

/**
 * Экранирование HTML
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

// ------------------------------------------------------------
// ЭТАП 2: ПЕРЕХВАТ SUBMIT И ГЛАВНЫЙ КОНТРОЛЛЕР
// ------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#team-reg-form');
  const resultContainer = document.getElementById('result-card');

  if (!form) return;

  form.addEventListener('submit', (event) => {
    // Этап 2: preventDefault()
    event.preventDefault();

    // Очистка предыдущих ошибок
    clearFormErrors(form);

    // Этап 3: Сбор и нормализация данных через FormData
    const formData = new FormData(form);
    const normalizedData = normalizeFormData(formData);

    // Этап 4: Валидация
    const validationErrors = validateRegistration(normalizedData);
    const hasErrors = Object.keys(validationErrors).length > 0;

    if (hasErrors) {
      if (resultContainer) resultContainer.hidden = true;
      // Этап 5: Отображение ошибок и фокус на первом
      displayFormErrors(form, validationErrors);
      return;
    }

    // Этап 6: Расчёт
    const calculationResult = calculateTournamentEntry(normalizedData);

    // Этап 7: Вывод итога в карточку с aria-live и переводом фокуса
    displayResultCard(normalizedData, calculationResult);
  });

  // Кнопки быстрой подстановки тест-кейсов из таблицы
  const testCaseButtons = document.querySelectorAll('[data-load-test]');
  testCaseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const testId = btn.dataset.loadTest;
      loadTestCaseIntoForm(form, testId);
    });
  });
});

/**
 * Вспомогательная функция для быстрой проверки 5 тест-кейсов
 */
function loadTestCaseIntoForm(form, testId) {
  const testPresets = {
    standard: {
      teamName: 'Team Spirit Academy',
      teamTag: 'TSA',
      captainName: 'Denis "Larl" S.',
      captainEmail: 'larl@spirit.gg',
      avgMmr: '11500',
      playersCount: '5',
      tier: 'pro',
      region: 'cis',
      earlyBird: true,
      wantsMerch: false
    },
    minimum: {
      teamName: 'Novice Squad',
      teamTag: 'NSQ',
      captainName: 'Alex',
      captainEmail: 'alex@mail.ru',
      avgMmr: '3000',
      playersCount: '5',
      tier: 'amateur',
      region: 'cis',
      earlyBird: false,
      wantsMerch: false
    },
    maximum: {
      teamName: 'gazbloki31.ru Mega Stack',
      teamTag: 'GZ31',
      captainName: 'Kirill "gazobeton"',
      captainEmail: 'pro@gazbloki31.ru',
      avgMmr: '14800',
      playersCount: '7',
      tier: 'pro',
      region: 'cis',
      earlyBird: true,
      wantsMerch: true
    },
    invalid: {
      teamName: 'X',
      teamTag: 'TOOLONGTAG',
      captainName: '',
      captainEmail: 'not-an-email',
      avgMmr: '2500',
      playersCount: '4',
      tier: 'pro',
      region: 'cis',
      earlyBird: false,
      wantsMerch: false
    },
    boundary: {
      teamName: 'Borderline Pro',
      teamTag: 'BPRO',
      captainName: 'BorderMaster',
      captainEmail: 'border@esports.org',
      avgMmr: '9999', // Пограничный для PRO: требуется 10000, 9999 должно вызвать ошибку!
      playersCount: '5',
      tier: 'pro',
      region: 'eu',
      earlyBird: true,
      wantsMerch: false
    }
  };

  const preset = testPresets[testId];
  if (!preset) return;

  form.querySelector('[name="teamName"]').value = preset.teamName;
  form.querySelector('[name="teamTag"]').value = preset.teamTag;
  form.querySelector('[name="captainName"]').value = preset.captainName;
  form.querySelector('[name="captainEmail"]').value = preset.captainEmail;
  form.querySelector('[name="avgMmr"]').value = preset.avgMmr;
  form.querySelector('[name="playersCount"]').value = preset.playersCount;
  form.querySelector('[name="tier"]').value = preset.tier;
  form.querySelector('[name="region"]').value = preset.region;
  form.querySelector('[name="earlyBird"]').checked = preset.earlyBird;
  form.querySelector('[name="wantsMerch"]').checked = preset.wantsMerch;

  clearFormErrors(form);
  const resultCard = document.getElementById('result-card');
  if (resultCard) resultCard.hidden = true;

  // Подсветка поля
  form.querySelector('[name="teamName"]').focus();
}
