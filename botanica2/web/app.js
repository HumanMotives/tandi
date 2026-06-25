// ============================================================
//  BOTANICA v9
//  Clean modular rebuild
// ============================================================

// CORE
const CORE={bpm:120, get stepMs(){return 60000/(this.bpm*4);}, running:false, timer:null};

// TOPOLOGY (blossom only)
const TOPOLOGY={
  index:2,
  labels:['÷4','÷2','×1','×2','×4'],
  factors:[0.25,0.5,1,2,4],
  subMs(){return CORE.stepMs/this.factors[this.index];}
};

// SEASON / SCALE
const SCALES=[[0,2,4,7,9],[0,2,4,6,7,9,11],[0,2,3,5,7,9,10],[0,2,4,6,8,10]];
const S_ROOTS=[60,67,57,62];
const S_LABELS=['SP','SU','FA','WI'];
const S_NAMES=['Pentatonic Maj','Lydian','Dorian','Whole Tone'];
const NNAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const SEASON={
  index:0, transpose:0, octaveRange:2,
  root(){return S_ROOTS[this.index]+this.transpose;},
  scale(){return SCALES[this.index];},
  randomNote(){
    const sc=this.scale(),r=this.root();
    return Math.max(0,Math.min(127,r+Math.floor(Math.random()*this.octaveRange)*12+sc[Math.floor(Math.random()*sc.length)]));
  },
  clampToRange(midi){
    const sc=this.scale(),r=this.root();
    const sem=((midi-r)%12+12)%12;
    let best=sc[0],bd=99;
    for(const d of sc){const dist=Math.abs(d-sem);if(dist<bd){bd=dist;best=d;}}
    const oct=Math.max(0,Math.min(this.octaveRange-1,Math.floor((midi-r)/12)));
    return Math.max(0,Math.min(127,r+oct*12+best));
  },
  quantize(midi){
    const sc=this.scale(),r=this.root();
    const oct=Math.floor((midi-r)/12);
    const sem=((midi-r)%12+12)%12;
    let best=sc[0],bd=99;
    for(const d of sc){const dist=Math.abs(d-sem);if(dist<bd){bd=dist;best=d;}}
    return Math.max(0,Math.min(127,r+oct*12+best));
  },
  scaleStepUp(midi){
    const sc=this.scale(),r=this.root();
    const sem=((midi-r)%12+12)%12;
    let idx=0;
    for(let i=0;i<sc.length;i++) if(sc[i]<=sem) idx=i;
    const nIdx=(idx+1)%sc.length;
    return Math.max(0,Math.min(127,midi-sc[idx]+sc[nIdx]+(sc[nIdx]<sc[idx]?12:0)));
  }
};

// DENSITY (prune mask)
const DENSITY={raw:1.0, get value(){return Math.pow(this.raw,0.4);}};

// PRUNE mask
const PRUNE={
  value:1.0,
  rnd:0,
  mask:new Array(16).fill(true),
  generate(len){
    this.mask=new Array(16).fill(true);
    if(this.value>=0.99) return;
    const keep=Math.max(1,Math.round(len*this.value));
    const mute=len-keep;
    const pos=[...Array(len).keys()].sort((a,b)=>(b/len+Math.random()*0.3)-(a/len+Math.random()*0.3));
    for(let i=0;i<mute;i++) this.mask[pos[i]]=false;
  },
  tick(len){
    if(this.rnd<0.05) return;
    if(Math.random()>this.rnd) return;
    const shift=Math.random()<0.5?1:-1;
    if(shift>0) this.mask.push(this.mask.shift());
    else this.mask.unshift(this.mask.pop());
  },
  allows(step){return this.mask[step%16];}
};

// EVOLVE (tones only)
const EVOLVE={
  chance:0, depth:2, stepCount:0,
  tick(){
    if(this.chance<0.01) return;
    if(SEQ.toneLocked) return;
    this.stepCount++;
    const period=Math.max(1,Math.round(1/this.chance));
    if(this.stepCount>=period){
      this.stepCount=0;
      const t=Math.floor(Math.random()*SEQ.len);
      SEQ.pitchMemory[t]=SEASON.randomNote();
      updatePD();
      lg('↻ tone evolve');
    }
  }
};

// SLOPPY — timing offset
const SLOPPY={value:0};

// BLOSSOM
const BLOSSOM={
  amount:0, rampMode:'down', pitchMode:'none',
  attack:0, reps:3, refractRnd:0,

  fire(rootPitch, rootVel){
    if(this.amount<0.02) return;
    if(Math.random()>this.amount) return;

    const baseMs=TOPOLOGY.subMs();
    const attackMs=this.attack*baseMs;
    const minMidi=SEASON.root();
    const maxMidi=minMidi+SEASON.octaveRange*12-1;

    for(let i=0;i<this.reps;i++){
      // Capture all values for this echo
      const gen=i;
      const rampMode=this.rampMode;
      const pitchMode=this.pitchMode;
      const reps=this.reps;

      // Per-echo subdivision (refract random)
      let eIdx=TOPOLOGY.index;
      if(this.refractRnd>0.05){
        const maxShift=Math.ceil(this.refractRnd*4);
        eIdx=Math.max(0,Math.min(4,eIdx+Math.floor(Math.random()*(maxShift+1))*(Math.random()<0.5?1:-1)));
      }
      const eMs=CORE.stepMs/TOPOLOGY.factors[eIdx];
      const t=attackMs+eMs*(gen+1);

      // Velocity
      let vel;
      if(rampMode==='up') vel=Math.max(4,Math.floor(rootVel*Math.pow(0.55,reps-gen)));
      else vel=Math.max(4,Math.floor(rootVel*Math.pow(0.55,gen+1)));

      // Pitch
      let p=rootPitch;
      if(pitchMode==='arp'){for(let s=0;s<gen+1;s++) p=SEASON.scaleStepUp(p);}
      else if(pitchMode==='octdown') p=rootPitch-12*(gen+1);
      else if(pitchMode==='octup')   p=rootPitch+12*(gen+1);
      while(p>maxMidi) p-=12;
      while(p<minMidi) p+=12;
      p=Math.max(0,Math.min(127,p));

      // Schedule with captured values
      const schedPitch=p, schedVel=vel, schedDur=eMs*0.45;
      setTimeout(()=>{
        if(!CORE.running||SEQ.mute) return;
        MIDI.noteOn(schedPitch,schedVel,1);
        setTimeout(()=>MIDI.noteOff(schedPitch,1),schedDur);
      },t);
    }
  }
};

// SEQUENCER
const SEQ={
  len:8, hits:4, step:0,
  patternLocked:false, toneLocked:false, mute:false, euclid:false,
  gateMemory:new Array(16).fill(false),
  pitchMemory:new Array(16).fill(60),
  activeNotes:{},

  get gates(){return this.gateMemory.slice(0,this.len);},
  get pitches(){return this.pitchMemory.slice(0,this.len).map(p=>SEASON.clampToRange(p));},

  genGates(){
    if(this.patternLocked) return;
    if(this.euclid){
      for(let i=0;i<16;i++) this.gateMemory[i]=((i*this.hits/this.len)|0)!==(((i+1)*this.hits/this.len)|0);
    } else {
      this.gateMemory=new Array(16).fill(false);
      const pos=[...Array(this.len).keys()];
      for(let i=pos.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pos[i],pos[j]]=[pos[j],pos[i]];}
      for(let i=0;i<Math.min(this.hits,this.len);i++) this.gateMemory[pos[i]]=true;
    }
  },
  genPitches(){
    if(this.toneLocked) return;
    const sc=SEASON.scale(),r=SEASON.root(),range=SEASON.octaveRange;
    const pos=[...Array(16).keys()];
    for(let i=pos.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pos[i],pos[j]]=[pos[j],pos[i]];}
    for(let o=0;o<range&&o<16;o++){
      const d=Math.floor(Math.random()*sc.length);
      this.pitchMemory[pos[o]]=Math.max(0,Math.min(127,r+o*12+sc[d]));
    }
    for(let i=range;i<16;i++) this.pitchMemory[pos[i]]=SEASON.randomNote();
  },

  snapToOne(){
    if(this.patternLocked){lg('PATTERN LOCKED');return;}
    const first=this.gateMemory.slice(0,this.len).findIndex(g=>g);
    if(first<=0) return;
    for(let r=0;r<first;r++){this.gateMemory.push(this.gateMemory.shift());this.pitchMemory.push(this.pitchMemory.shift());}
    updatePD(); lg('SNAP→1');
  },

  play(note,vel,dur,ch){
    if(this.activeNotes[note]) clearTimeout(this.activeNotes[note]);
    else MIDI.noteOn(note,vel,ch);
    this.activeNotes[note]=setTimeout(()=>{MIDI.noteOff(note,ch);delete this.activeNotes[note];},dur);
  },
  allOff(){for(const n in this.activeNotes){MIDI.noteOff(parseInt(n),1);}this.activeNotes={};}
};

// MIDI
const MIDI={
  out:null,
  noteOn(n,v,ch){if(!this.out||SEQ.mute||n<0||n>127)return;this.out.send([0x8F+ch,n,Math.max(1,Math.min(127,v))]);},
  noteOff(n,ch){if(!this.out||n<0||n>127)return;this.out.send([0x7F+ch,n,0]);}
};

async function initMIDI(){
  if(!navigator.requestMIDIAccess){document.getElementById('warn').style.display='block';dot('midi','err');return;}
  try{
    const ma=await navigator.requestMIDIAccess();
    dot('midi','on');document.getElementById('t-midi').textContent='MIDI OK';
    function pick(){const o=[...ma.outputs.values()];if(o.length){MIDI.out=o[0];document.getElementById('t-out').textContent='→ '+MIDI.out.name.substring(0,16);dot('out','on');lg('MIDI: '+MIDI.out.name);}}
    pick();ma.onstatechange=pick;
  }catch(e){document.getElementById('warn').style.display='block';dot('midi','err');}
}

// TICK
function startSeq(){
  if(CORE.running) return;
  CORE.running=true; SEQ.step=0; EVOLVE.stepCount=0;
  dot('clk','on'); document.getElementById('t-clk').textContent='RUNNING';
  tick();
}
function stopSeq(){
  CORE.running=false;
  if(CORE.timer) clearTimeout(CORE.timer);
  SEQ.allOff();
  dot('clk',''); document.getElementById('t-clk').textContent='STOPPED';
  document.getElementById('dv-step').textContent='— / —';
}

function tick(){
  if(!CORE.running) return;
  const stepMs=CORE.stepMs;
  const step=SEQ.step%SEQ.len;
  document.getElementById('dv-step').textContent=(step+1)+'/'+SEQ.len;

  const gates=SEQ.gates, pitches=SEQ.pitches;
  const doPlay=gates[step]&&(Math.random()<DENSITY.value)&&PRUNE.allows(step);

  if(doPlay){
    const pitch=pitches[step];
    const vel=Math.floor(68+Math.random()*20);

    // SLOPPY: timing offset
    const sloppyMs=SLOPPY.value*stepMs*0.4*(Math.random()*2-1);
    const noteDur=stepMs*0.35;

    setTimeout(()=>{
      if(!CORE.running||SEQ.mute) return;
      SEQ.play(pitch,vel,noteDur,1);
      const nn=NNAMES[((pitch%12)+12)%12]+Math.floor(pitch/12-1);
      lg('♩ '+nn+' vel:'+vel);
      showDisp(nn);
      BLOSSOM.fire(pitch,vel);
    }, Math.max(0,sloppyMs));
  }

  SEQ.step=(SEQ.step+1)%SEQ.len;
  if(SEQ.step===0){ EVOLVE.tick(); PRUNE.tick(SEQ.len); }
  CORE.timer=setTimeout(tick,Math.max(10,stepMs));
}

// UI
let dispTimer=null;
function showDisp(label){
  document.getElementById('dv').textContent=label;
  document.getElementById('dl').textContent='';
  if(dispTimer) clearTimeout(dispTimer);
  dispTimer=setTimeout(()=>{document.getElementById('dv').textContent=S_LABELS[SEASON.index];document.getElementById('dl').textContent='SEASON';},2000);
}
function updatePD(){
  document.getElementById('dv-pat').textContent=
    SEQ.gates.map((g,i)=>g?NNAMES[((SEQ.pitches[i]||60)%12+12)%12].padEnd(2):'··').join(' ');
}
function dot(id,st){const d=document.getElementById('d-'+id);if(d)d.className='dot'+(st==='on'?' on':st==='err'?' err':'');}
function lg(msg){const l=document.getElementById('log');const d=document.createElement('div');d.className='ll';d.textContent=msg;l.appendChild(d);while(l.children.length>4)l.removeChild(l.firstChild);}

function setSeason(i){
  SEASON.index=i;
  document.querySelectorAll('.sbtn').forEach((b,j)=>b.classList.toggle('active',j===i));
  if(!SEQ.toneLocked) SEQ.pitchMemory=SEQ.pitchMemory.map(p=>SEASON.quantize(p));
  updatePD(); showDisp(S_LABELS[i]); lg('Season: '+S_NAMES[i]);
}

function seedPattern(){
  if(SEQ.patternLocked){lg('PATTERN LOCKED');return;}
  SEQ.genGates();
  PRUNE.generate(SEQ.len);
  updatePD(); showDisp('PAT'); lg('⟳ pattern seed');
}
function seedTones(){
  if(SEQ.toneLocked){lg('TONES LOCKED');return;}
  SEQ.genPitches();
  updatePD(); showDisp('TON'); lg('⟳ tones seed');
}

function toggleLock(t){
  if(t==='pattern'){
    SEQ.patternLocked=!SEQ.patternLocked;
    document.getElementById('btn-plock').classList.toggle('locked',SEQ.patternLocked);
    document.getElementById('led-plock').classList.toggle('on',SEQ.patternLocked);
    lg(SEQ.patternLocked?'PATTERN LOCKED':'PATTERN FREE');
  } else {
    SEQ.toneLocked=!SEQ.toneLocked;
    document.getElementById('btn-tlock').classList.toggle('locked',SEQ.toneLocked);
    document.getElementById('led-tlock').classList.toggle('on',SEQ.toneLocked);
    lg(SEQ.toneLocked?'TONES LOCKED':'TONES FREE');
  }
}

function toggleEuclid(){
  SEQ.euclid=!SEQ.euclid;
  document.getElementById('btn-euclid').classList.toggle('active',SEQ.euclid);
  document.getElementById('led-euc').classList.toggle('on',SEQ.euclid);
  if(!SEQ.patternLocked) SEQ.genGates();
  updatePD(); lg(SEQ.euclid?'EUCLID':'ORGANIC');
}
function toggleMute(){
  SEQ.mute=!SEQ.mute;
  document.getElementById('btn-mute').classList.toggle('muted',SEQ.mute);
  document.getElementById('led-mute').classList.toggle('mon',SEQ.mute);
  if(SEQ.mute) SEQ.allOff();
}
function setRamp(m){
  BLOSSOM.rampMode=m;
  ['down','up'].forEach(x=>document.getElementById('mb-'+x).classList.toggle('active',x===m));
}
function setPitch(m){
  if(BLOSSOM.pitchMode===m){ BLOSSOM.pitchMode='none'; ['arp','octdown','octup'].forEach(x=>document.getElementById('mb-'+x).classList.remove('active')); }
  else { BLOSSOM.pitchMode=m; ['arp','octdown','octup'].forEach(x=>document.getElementById('mb-'+x).classList.toggle('active',x===m)); }
}

// KNOB FACTORY
function makeKnob(cfg){
  const sz=cfg.size||46, r=sz/2-4, cx=sz/2, cy=sz/2;
  let val=cfg.val;
  const wrap=document.createElement('div');
  wrap.className='kw';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width',sz);svg.setAttribute('height',sz);svg.setAttribute('viewBox',`0 0 ${sz} ${sz}`);
  const bg=document.createElementNS('http://www.w3.org/2000/svg','circle');
  bg.setAttribute('cx',cx);bg.setAttribute('cy',cy);bg.setAttribute('r',r);
  bg.setAttribute('fill','#2A2A26');bg.setAttribute('stroke','#4A4A42');bg.setAttribute('stroke-width','2');
  const mk=document.createElementNS('http://www.w3.org/2000/svg','line');
  mk.setAttribute('x1',cx);mk.setAttribute('y1',cy);mk.setAttribute('stroke','#B8A96A');mk.setAttribute('stroke-width','2.5');mk.setAttribute('stroke-linecap','round');
  svg.appendChild(bg);svg.appendChild(mk);
  const lbl=document.createElement('div');lbl.className='klabel';lbl.textContent=cfg.label;
  const val_el=document.createElement('div');val_el.className='kval';val_el.id='kv-'+cfg.id;
  wrap.appendChild(svg);wrap.appendChild(lbl);wrap.appendChild(val_el);

  function setMarker(v){
    const pct=(v-cfg.min)/(cfg.max-cfg.min);
    const angle=(-135+pct*270)*Math.PI/180;
    mk.setAttribute('x2',cx+Math.sin(angle)*r);
    mk.setAttribute('y2',cy-Math.cos(angle)*r);
  }

  let dragging=false,sy=0,sv=0;
  wrap.addEventListener('mousedown',e=>{
    dragging=true;sy=e.clientY;sv=val;e.preventDefault();
    const onMove=ev=>{if(!dragging)return;val=Math.max(cfg.min,Math.min(cfg.max,sv+(sy-ev.clientY)*(cfg.max-cfg.min)/120));setMarker(val);cfg.onchange(val);};
    const onUp=()=>{dragging=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  });

  setMarker(val);
  return {el:wrap, init(){cfg.onchange(val);}};
}

function addKnobs(containerId, defs){
  const row=document.getElementById(containerId);
  if(!row) return;
  defs.forEach(cfg=>{
    const {el,init}=makeKnob(cfg);
    row.appendChild(el);
    init();
  });
}

// BUILD ALL KNOBS
function buildAll(){
  addKnobs('pat-pots',[
    {id:'steps',  label:'LENGTH', min:1,  max:16,  val:8,  size:42,
      onchange(v){SEQ.len=Math.round(v);SEQ.hits=Math.min(SEQ.hits,SEQ.len);document.getElementById('kv-steps').textContent=Math.round(v);if(!SEQ.patternLocked)SEQ.genGates();PRUNE.generate(SEQ.len);updatePD();}},
    {id:'hits',   label:'HITS',   min:1,  max:16,  val:4,  size:42,
      onchange(v){SEQ.hits=Math.min(Math.round(v),SEQ.len);document.getElementById('kv-hits').textContent=Math.round(v);if(!SEQ.patternLocked)SEQ.genGates();updatePD();}},
    {id:'prune',  label:'PRUNE',  min:0,  max:100, val:100,size:52,
      onchange(v){PRUNE.value=v/100;PRUNE.generate(SEQ.len);document.getElementById('kv-prune').textContent=Math.round(v)+'%';}},
    {id:'prune-rnd',label:'RND',  min:0,  max:100, val:0,  size:34,
      onchange(v){PRUNE.rnd=v/100;document.getElementById('kv-prune-rnd').textContent=Math.round(v)+'%';}},
    {id:'sloppy', label:'SLOPPY', min:0,  max:100, val:0,  size:52,
      onchange(v){SLOPPY.value=v/100;document.getElementById('kv-sloppy').textContent=Math.round(v)+'%';}},
  ]);

  addKnobs('tone-pots',[
    {id:'root',   label:'ROOT',   min:-36,max:24,  val:0,  size:52,
      onchange(v){SEASON.transpose=Math.round(v);const m=SEASON.root();document.getElementById('kv-root').textContent=NNAMES[((m%12)+12)%12]+Math.floor(m/12-1);if(!SEQ.toneLocked)SEQ.pitchMemory=SEQ.pitchMemory.map(p=>SEASON.quantize(p));updatePD();}},
    {id:'range',  label:'RANGE',  min:1,  max:4,   val:2,  size:52,
      onchange(v){SEASON.octaveRange=Math.round(v);document.getElementById('kv-range').textContent=Math.round(v)+' oct';updatePD();}},
    {id:'evolve', label:'EVOLVE', min:0,  max:100, val:0,  size:52,
      onchange(v){EVOLVE.chance=v/100;document.getElementById('kv-evolve').textContent=Math.round(v)+'%';}},
  ]);

  addKnobs('blos-pots',[
    {id:'blossom',label:'AMOUNT', min:0,  max:100, val:0,  size:52,
      onchange(v){BLOSSOM.amount=v/100;document.getElementById('kv-blossom').textContent=Math.round(v)+'%';}},
    {id:'refract',label:'REFRACT',min:0,  max:4,   val:2,  size:52,
      onchange(v){TOPOLOGY.index=Math.round(v);document.getElementById('kv-refract').textContent=TOPOLOGY.labels[Math.round(v)];}},
    {id:'ref-rnd',label:'RND',    min:0,  max:100, val:0,  size:34,
      onchange(v){BLOSSOM.refractRnd=v/100;document.getElementById('kv-ref-rnd').textContent=Math.round(v)+'%';}},
    {id:'offset', label:'OFFSET', min:0,  max:8,   val:0,  size:34,
      onchange(v){BLOSSOM.attack=Math.round(v);document.getElementById('kv-offset').textContent=Math.round(v)+' div';}},
    {id:'decay',  label:'DECAY',  min:1,  max:16,  val:3,  size:34,
      onchange(v){BLOSSOM.reps=Math.round(v);document.getElementById('kv-decay').textContent=Math.round(v)+'×';}},
  ]);
}

// INIT
buildAll();
SEQ.genGates();
SEQ.genPitches();
PRUNE.generate(SEQ.len);
setSeason(0);
initMIDI();
lg('BOTANICA v9 ready');
lg('▶ PLAY · SEED PATTERN · SEED TONES');
