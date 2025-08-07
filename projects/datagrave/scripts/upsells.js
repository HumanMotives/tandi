// Handle premium selection & epitaph enablement
let selectedPremium = null;

document.addEventListener('DOMContentLoaded', () => {
  const upsellSection = document.getElementById('upsellSection');
  const epitaphInput = document.getElementById('epitaph');

  document.querySelectorAll('.premium-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPremium = btn.dataset.premium;
      document.querySelectorAll('.upsell-tile').forEach(tile => {
        tile.classList.toggle('active', tile.dataset.premium === selectedPremium);
      });

      // VIP grants epitaph, others disable & clear
      if (selectedPremium === 'vip') {
        epitaphInput.disabled = false;
      } else {
        epitaphInput.disabled = true;
        epitaphInput.value = '';
      }

      // keep section visible
      upsellSection.classList.remove('hidden');
    });
  });
});
