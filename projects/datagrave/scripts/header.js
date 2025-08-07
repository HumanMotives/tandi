// Load header partial into every page
document.addEventListener('DOMContentLoaded', () => {
  fetch('partials/header.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('common-header').innerHTML = html;
    })
    .catch(console.error);
});
