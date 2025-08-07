// File upload, progress simulation, and final “ceremony”
document.addEventListener('DOMContentLoaded', () => {
  const fileInput       = document.getElementById('fileInput');
  const uploadBox       = document.getElementById('uploadBox');
  const progressDiv     = document.getElementById('progressContainer');
  const analyzeFill     = document.getElementById('analyzeFill');
  const readyDiv        = document.getElementById('readyToBury');
  const sarcasticRemark = document.getElementById('sarcasticRemark');
  const fileNameSpan    = document.getElementById('fileName');
  const fileDateSpan    = document.getElementById('fileDate');
  const fileSizeTd      = document.getElementById('fileSize');
  const fileVibeTd      = document.getElementById('fileVibe');
  const eulogies        = [ /* ...existing eulogies array...*/ ];
  const vibes           = [ /* ...existing vibes array...*/ ];
  let selectedFile = null;

  fileInput.addEventListener('change', e => {
    selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // type check
    const allowed = ['audio/wav','audio/mpeg','audio/ogg'];
    if (!allowed.includes(selectedFile.type)) {
      alert('Invalid file type.');
      fileInput.value = '';
      return;
    }

    // start flow
    uploadBox.classList.add('hidden');
    document.getElementById('methodSelector').style.display = 'none';
    progressDiv.classList.remove('hidden');
    analyzeFill.style.width = '0';

    setTimeout(() => analyzeFill.style.width = '100%', 50);
    setTimeout(() => {
      progressDiv.classList.add('hidden');
      readyDiv.classList.remove('hidden');

      sarcasticRemark.textContent = `"${eulogies[Math.floor(Math.random()*eulogies.length)]}"`;
      fileNameSpan.textContent    = selectedFile.name;
      fileDateSpan.textContent    = new Date(selectedFile.lastModified).toLocaleDateString();
      fileSizeTd.textContent      = (selectedFile.size/1024/1024).toFixed(2) + ' MB';
      fileVibeTd.textContent      = vibes[Math.floor(Math.random()*vibes.length)];
      document.getElementById('epitaph').value = '';
    }, 5000);
  });
});
