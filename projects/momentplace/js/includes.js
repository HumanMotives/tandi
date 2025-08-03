document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-include]').forEach(el => {
    fetch(el.getAttribute('data-include'))
      .then(res => res.text())
      .then(html => { el.innerHTML = html });
  });
});
