'use strict';

/**
 * ============================================================
 * ПРАКТИКА 13: ДОСТУПНЫЕ ВКЛАДКИ (ARIA TABS) И FAQ АККОРДЕОН
 * Студенты: Барышев Даниил, Мисриханов Тимур, Марьин Вадим
 * Группа:   37-ВЕБ
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // Прогрессивное улучшение: активируем стили скрытия неактивных вкладок только при работающем JS
  document.body.classList.add('js-tabs-active');

  // ============================================================
  //  ЭТАПЫ 1–5: ДОСТУПНЫЙ КОМПОНЕНТ ВКЛАДОК (WAI-ARIA TABS)
  // ============================================================
  const tablist = document.querySelector('[role="tablist"]');
  if (tablist) {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const panels = tabs.map(tab => {
      const panelId = tab.getAttribute('aria-controls');
      return document.getElementById(panelId);
    });

    /**
     * Активирует вкладку по индексу, сбрасывая старое состояние
     * @param {number} newIndex Индекс новой активной вкладки
     * @param {boolean} setFocus Нужно ли перенести фокус ввода
     */
    function activateTab(newIndex, setFocus = true) {
      if (newIndex < 0 || newIndex >= tabs.length) return;

      tabs.forEach((tab, index) => {
        const panel = panels[index];
        const isTarget = index === newIndex;

        // Обновление состояния кнопки вкладки
        tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        tab.setAttribute('tabindex', isTarget ? '0' : '-1');

        // Обновление состояния связанной панели
        if (panel) {
          if (isTarget) {
            panel.removeAttribute('hidden');
          } else {
            panel.setAttribute('hidden', '');
          }
        }
      });

      if (setFocus) {
        tabs[newIndex].focus();
      }
    }

    // Этап 4: Единый делегированный обработчик клика на tablist
    tablist.addEventListener('click', (event) => {
      const clickedTab = event.target.closest('[role="tab"]');
      if (!clickedTab) return;

      const targetIndex = tabs.indexOf(clickedTab);
      if (targetIndex !== -1) {
        activateTab(targetIndex, false);
      }
    });

    // Этап 5: Полная поддержка клавиатурной навигации стрелками
    tablist.addEventListener('keydown', (event) => {
      const currentTab = event.target.closest('[role="tab"]');
      if (!currentTab) return;

      const currentIndex = tabs.indexOf(currentTab);
      let nextIndex = currentIndex;

      switch (event.key) {
        // Стрелка вправо: циклический переход вперед
        case 'ArrowRight':
          event.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          activateTab(nextIndex, true);
          break;

        // Стрелка влево: циклический переход назад
        case 'ArrowLeft':
          event.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          activateTab(nextIndex, true);
          break;

        // Клавиша Home: первая вкладка
        case 'Home':
          event.preventDefault();
          activateTab(0, true);
          break;

        // Клавиша End: последняя вкладка
        case 'End':
          event.preventDefault();
          activateTab(tabs.length - 1, true);
          break;

        // Enter и Space: активация выбранной вкладки
        case 'Enter':
        case ' ':
          event.preventDefault();
          activateTab(currentIndex, true);
          break;

        default:
          break;
      }
    });
  }

  // ============================================================
  //  ЭТАПЫ 6–7: FAQ АККОРДЕОН (7 ВОПРОСОВ С ARIA-EXPANDED)
  // ============================================================
  const faqAccordion = document.getElementById('faq-accordion');
  if (faqAccordion) {
    const faqButtons = Array.from(faqAccordion.querySelectorAll('.faq-question'));

    faqButtons.forEach(button => {
      button.addEventListener('click', () => {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        const item = button.closest('.faq-item');

        // Переключение состояния вопроса
        if (isExpanded) {
          button.setAttribute('aria-expanded', 'false');
          item?.classList.remove('is-open');
        } else {
          button.setAttribute('aria-expanded', 'true');
          item?.classList.add('is-open');
        }
      });
    });
  }

});
