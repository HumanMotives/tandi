export function createAudio(ui){
  let enabled = true;
  let ctx = null;

  function ensure(){
    if (!enabled) return null;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(()=>{});
    }
    return ctx;
  }

  function tone(freq = 220, dur = 0.08, type = 'sine', gain = 0.03){
    const c = ensure();
    if (!c) return;

    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;

    o.connect(g);
    g.connect(c.destination);

    o.start();
    o.stop(c.currentTime + dur);
  }

  function noiseBurst(dur = 0.12, gain = 0.02){
    const c = ensure();
    if (!c) return;

    const bufferSize = c.sampleRate * dur;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.65;

    const src = c.createBufferSource();
    src.buffer = buffer;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(c.destination);
    src.start();
  }

  function setEnabled(v){
    enabled = !!v;
  }

  function playClick(){
    tone(520, 0.03, 'triangle', 0.02);
  }

  function playBoot(){
    tone(220, 0.08, 'sine', 0.02);
    setTimeout(()=>tone(330, 0.08, 'sine', 0.02), 90);
    setTimeout(()=>tone(440, 0.10, 'sine', 0.02), 190);
  }

  function playDoor(closed){
    if (closed) {
      tone(160, 0.09, 'square', 0.02);
      setTimeout(()=>tone(140, 0.08, 'square', 0.02), 90);
    } else {
      tone(220, 0.06, 'square', 0.02);
      setTimeout(()=>tone(260, 0.06, 'square', 0.02), 70);
    }
  }

  function playScanOn(){
    tone(760, 0.03, 'sine', 0.015);
  }

  function playCamOpen(){
    noiseBurst(0.10, 0.02);
    tone(420, 0.04, 'triangle', 0.015);
  }

  function playSting(kind){
    if (kind === 'scrape') {
      noiseBurst(0.16, 0.02);
      tone(110, 0.12, 'sawtooth', 0.01);
    } else {
      tone(300, 0.07, 'triangle', 0.01);
    }
  }

  function playJumpscare(){
    noiseBurst(0.35, 0.05);
    tone(55, 0.55, 'sawtooth', 0.02);
    setTimeout(()=>tone(90, 0.35, 'square', 0.02), 60);
  }

  function playWin(){
    tone(330, 0.12, 'sine', 0.02);
    setTimeout(()=>tone(440, 0.12, 'sine', 0.02), 140);
    setTimeout(()=>tone(550, 0.16, 'sine', 0.02), 280);
  }

  return {
    setEnabled,
    playClick,
    playBoot,
    playDoor,
    playScanOn,
    playCamOpen,
    playSting,
    playJumpscare,
    playWin,
  };
}
