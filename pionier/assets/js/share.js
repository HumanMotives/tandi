async function shareText({ title, text, url }) {
  const shareData = { title, text, url };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return true;
    }
  } catch (e) {}

  try {
    await navigator.clipboard.writeText(url);
    alert("Link gekopieerd.");
    return true;
  } catch (e) {
    prompt("Kopieer deze link:", url);
    return false;
  }
}
