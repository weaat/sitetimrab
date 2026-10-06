// ============================================================
//  ДотаАрена 2026 — script.js (Практика 4)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Подсветка активной ссылки в nav при прокрутке ---
  const sections = document.querySelectorAll('[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  function highlightNav() {
    let currentId = '';
    sections.forEach(section => {
      const top = section.getBoundingClientRect().top;
      if (top <= 100) currentId = section.id;
    });
    navLinks.forEach(link => {
      const href = link.getAttribute('href').slice(1);
      link.classList.toggle('active', href === currentId);
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  // --- 2. Плавная прокрутка к разделам ---
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // CTA-кнопка в hero тоже плавно скроллит
  const heroCta = document.querySelector('.btn-cta');
  if (heroCta) {
    heroCta.addEventListener('click', e => {
      const targetId = heroCta.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // --- 3. Сообщение об успешной отправке формы ---
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.textContent = '✓ Заявка отправлена!';
      btn.disabled = true;
      btn.style.background = '#15803d';
    });
  }

  // --- 4. Счётчик символов для textarea ---
  const textarea = document.getElementById('about-team');
  if (textarea) {
    const counter = document.createElement('small');
    counter.style.cssText = 'display:block;margin-top:.25rem;color:var(--color-muted);';
    counter.textContent = '0 / 500';
    textarea.insertAdjacentElement('afterend', counter);
    textarea.addEventListener('input', () => {
      counter.textContent = textarea.value.length + ' / 500';
    });
  }

  // --- 5. Hover-подсветка героев в hero-art ---
  const heroIcons = document.querySelectorAll('.hero-icon');
  const descriptions = {
    storm: 'Storm Spirit — Шторм Духа, маг с Ball Lightning ⚡',
    hood:  'Hoodwink — Белка-разбойница, мастер ловушек 🐿️',
    sfa:   'Shadow Fiend — Arcana 2026 👹',
  };
  heroIcons.forEach(icon => {
    const key = Array.from(icon.classList).find(c => c !== 'hero-icon');
    icon.setAttribute('title', descriptions[key] || '');
  });

});
