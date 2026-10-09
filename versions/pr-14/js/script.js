'use strict';

/**
 * ============================================================
 * ПРАКТИКА 14: ПОИСК, ФИЛЬТРАЦИЯ КАТАЛОГА И ЕДИНОЕ МОДАЛЬНОЕ ОКНО
 * Студенты: Барышев Даниил, Мисриханов Тимур, Черникова Ксения
 * Группа:   37-ВЕБ
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  //  ЭТАПЫ 1–5: ПОИСК И ФИЛЬТРАЦИЯ КАТАЛОГА
  // ============================================================
  const searchInput    = document.getElementById('catalog-search');
  const categorySelect = document.getElementById('category-select');
  const pillButtons    = Array.from(document.querySelectorAll('.pill-btn'));
  const resultsCount   = document.getElementById('results-count');
  const emptyResults   = document.getElementById('empty-results');
  const btnReset       = document.getElementById('btn-reset');
  const btnEmptyReset  = document.getElementById('btn-empty-reset');
  const cards          = Array.from(document.querySelectorAll('.product-card'));

  let currentCategory = 'all';

  /**
   * Этап 3: Нормализация строковых данных (trim + toLowerCase)
   * @param {string} str Исходная строка
   * @returns {string} Очищенная нормализованная строка
   */
  function normalizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().toLowerCase();
  }

  /**
   * Этап 4: Предикативная функция проверки соответствия карточки фильтрам
   * @param {HTMLElement} card Карточка товара
   * @param {string} query Нормализованный поисковый запрос
   * @param {string} category Выбранная категория
   * @returns {boolean} Соответствует ли карточка обоим условиям
   */
  function matchesFilter(card, query, category) {
    // 1. Проверка категории
    const cardCategory = card.dataset.category || '';
    const categoryMatches = (category === 'all') || (cardCategory === category);
    if (!categoryMatches) return false;

    // 2. Проверка поискового запроса (по названию, коду и описанию)
    if (!query) return true;

    const name = normalizeString(card.dataset.name || '');
    const code = normalizeString(card.dataset.code || '');
    const desc = normalizeString(card.dataset.desc || '');
    const text = normalizeString(card.textContent || '');

    return name.includes(query) || code.includes(query) || desc.includes(query) || text.includes(query);
  }

  /**
   * Этап 5: Обновление интерфейса (видимость карточек, счётчик и блок 0 результатов)
   */
  function applyFilters() {
    const rawQuery = searchInput ? searchInput.value : '';
    const query = normalizeString(rawQuery);

    let visibleCount = 0;

    cards.forEach(card => {
      const isVisible = matchesFilter(card, query, currentCategory);
      if (isVisible) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Обновляем счётчик
    if (resultsCount) {
      resultsCount.textContent = String(visibleCount);
    }

    // Состояние "Ничего не найдено"
    if (emptyResults) {
      emptyResults.hidden = visibleCount > 0;
    }
  }

  // Слушатель ввода в поле поиска (нормализация при каждом символе)
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // Слушатель выпадающего списка категорий
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      currentCategory = categorySelect.value;
      // Синхронизируем кнопки-плашки
      pillButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentCategory);
      });
      applyFilters();
    });
  }

  // Слушатели кнопок-плашек категорий
  pillButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      pillButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentCategory = btn.dataset.category || 'all';
      if (categorySelect) {
        categorySelect.value = currentCategory;
      }
      applyFilters();
    });
  });

  // Сброс фильтров
  function resetAllFilters() {
    if (searchInput) searchInput.value = '';
    currentCategory = 'all';
    if (categorySelect) categorySelect.value = 'all';

    pillButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === 'all');
    });

    applyFilters();
    if (searchInput) searchInput.focus();
  }

  if (btnReset) btnReset.addEventListener('click', resetAllFilters);
  if (btnEmptyReset) btnEmptyReset.addEventListener('click', resetAllFilters);

  // ============================================================
  //  ЭТАПЫ 6–7: ЕДИНОЕ ДОСТУПНОЕ МОДАЛЬНОЕ ОКНО
  // ============================================================
  const modalBackdrop = document.getElementById('product-modal-backdrop');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalImg      = document.getElementById('modal-img');
  const modalCategory = document.getElementById('modal-category');
  const modalTitle    = document.getElementById('modal-item-title');
  const modalDesc     = document.getElementById('modal-desc');
  const modalSpecCode = document.getElementById('modal-spec-code');
  const modalSpecMat  = document.getElementById('modal-spec-material');
  const modalSpecCol  = document.getElementById('modal-spec-color');
  const modalPrice    = document.getElementById('modal-price');
  const modalBuyBtn   = document.getElementById('modal-buy-btn');

  // Этап 7: Переменная для запоминания элемента-источника
  let lastFocusedTrigger = null;

  /**
   * Открывает единое модальное окно и динамически наполняет его данными карточки
   * @param {HTMLElement} card Карточка-источник
   * @param {HTMLElement} triggerElement Кнопка, вызвавшая открытие
   */
  function openProductModal(card, triggerElement) {
    if (!modalBackdrop || !card) return;

    lastFocusedTrigger = triggerElement || document.activeElement;

    // Считываем data-атрибуты
    const data = card.dataset;
    if (modalImg) {
      modalImg.src = data.img || '';
      modalImg.alt = data.name || 'Товар каталога';
    }
    if (modalCategory) modalCategory.textContent = card.querySelector('.product-card__category')?.textContent || data.category;
    if (modalTitle)    modalTitle.textContent    = data.name || 'Товар каталога';
    if (modalDesc)     modalDesc.textContent     = data.desc || 'Описание товара отсутствует.';
    if (modalSpecCode) modalSpecCode.textContent = data.code || 'GZ31-SPEC';
    if (modalSpecMat)  modalSpecMat.textContent  = data.material || 'Премиум-материалы';
    if (modalSpecCol)  modalSpecCol.textContent  = data.color || 'Стандарт';
    if (modalPrice)    modalPrice.textContent    = `${data.price || '0'} ₽`;

    // Показываем окно
    modalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    // Фокусируемся на кнопке закрытия для удобства клавиатурного пользователя
    setTimeout(() => {
      modalCloseBtn?.focus();
    }, 40);
  }

  /**
   * Закрывает модальное окно и возвращает фокус на элемент-источник
   */
  function closeProductModal() {
    if (!modalBackdrop || modalBackdrop.hidden) return;

    modalBackdrop.hidden = true;
    document.body.style.overflow = '';

    // Этап 7: Возврат фокуса на исходный элемент
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      lastFocusedTrigger.focus();
      lastFocusedTrigger = null;
    }
  }

  // Навешиваем слушатели на кнопки «Подробнее» карточек
  cards.forEach(card => {
    const detailBtn = card.querySelector('.btn-detail');
    if (detailBtn) {
      detailBtn.addEventListener('click', (e) => {
        openProductModal(card, detailBtn);
      });
    }

    // Также открываем по клику на изображение товара
    const thumbWrap = card.querySelector('.product-card__thumb-wrap');
    if (thumbWrap) {
      thumbWrap.style.cursor = 'pointer';
      thumbWrap.addEventListener('click', () => {
        openProductModal(card, detailBtn || thumbWrap);
      });
    }
  });

  // Закрытие по клику на кнопку-крестик
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeProductModal);
  }

  // Закрытие по клику на подложку (вне диалога)
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closeProductModal();
      }
    });
  }

  // Закрытие по клавише Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop && !modalBackdrop.hidden) {
      closeProductModal();
    }
  });

  // Кнопка «Оформить заказ» в модальном окне
  if (modalBuyBtn) {
    modalBuyBtn.addEventListener('click', () => {
      const currentName = modalTitle?.textContent || 'Товар';
      const currentPrice = modalPrice?.textContent || '';
      alert(`Заказ на «${currentName}» (${currentPrice}) успешно сформирован! Наш менеджер свяжется с вами.`);
      closeProductModal();
    });
  }

  // Первоначальный расчёт фильтров при загрузке
  applyFilters();

});
