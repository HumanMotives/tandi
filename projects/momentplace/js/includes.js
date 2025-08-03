// js/includes.js
document.addEventListener('DOMContentLoaded', () => {
  const includes = Array.from(document.querySelectorAll('[data-include]'));
  const promises = includes.map(el =>
    fetch(el.getAttribute('data-include'))
      .then(res => res.text())
      .then(html => { el.innerHTML = html; })
  );
  // Once *all* partials are in, fire a flag event
  Promise.all(promises).then(() => {
    document.dispatchEvent(new Event('includesLoaded'));
  });
});
