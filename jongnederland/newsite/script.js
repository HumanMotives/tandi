const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#site-nav');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const heroWord = document.querySelector('#hero-word');
const heroWords = ['spelen', 'vies worden', 'lachen', 'ontdekken', 'maken', 'vrienden'];
let heroWordIndex = 0;

if (heroWord) {
  window.setInterval(() => {
    heroWord.classList.add('is-changing');
    window.setTimeout(() => {
      heroWordIndex = (heroWordIndex + 1) % heroWords.length;
      heroWord.textContent = heroWords[heroWordIndex];
      heroWord.classList.remove('is-changing');
    }, 220);
  }, 1800);
}

const revealItems = document.querySelectorAll('[data-reveal]');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

revealItems.forEach((item) => revealObserver.observe(item));
