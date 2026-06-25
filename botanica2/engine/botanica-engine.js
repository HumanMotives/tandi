// BOTANICA ENGINE v0.3
(function(global){
  "use strict";
  const NNAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const SCALES=[[0,2,4,7,9],[0,2,4,6,7,9,11],[0,2,3,5,7,9,10],[0,2,4,6,8,10]];
  const S_ROOTS=[60,67,57,62];
  const S_LABELS=['SP','SU','FA','WI'];
  const S_NAMES=['Pentatonic Maj','Lydian','Dorian','Whole Tone'];

  class SeededRandom{
    constructor(seed=0xB07A){this.seed=seed>>>0;}
    next(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
    int(max){return Math.floor(this.next()*max);}
    chance(p){return this.next()<p;}
    shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=this.int(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
  }

  class BotanicaEngine{
    constructor(options={}){
      this.random=new SeededRandom(options.seed||0xB07A);
      this.bpm=options.bpm||120;
      this.topologyIndex=2;
      this.topologyLabels=['÷4','÷2','×1','×2','×4'];
      this.topologyFactors=[0.25,0.5,1,2,4];
      this.seasonIndex=0;this.transpose=0;this.octaveRange=2;
      this.densityRaw=1.0;
      this.pruneValue=1.0;this.pruneRnd=0;this.pruneMask=new Array(16).fill(true);
      this.evolveChance=0;this.evolveDepth=2;this.evolveStepCount=0;
      this.sloppy=0;
      this.blossomAmount=0;this.blossomRampMode='down';this.blossomPitchMode='none';this.blossomAttack=0;this.blossomReps=3;this.blossomRefractRnd=0;
      this.len=8;this.hits=4;this.step=0;this.patternLocked=false;this.toneLocked=false;this.mute=false;this.euclid=false;
      this.gateMemory=new Array(16).fill(false);this.pitchMemory=new Array(16).fill(60);
      this.genGates();this.genPitches();this.generatePrune();
    }
    get stepMs(){return 60000/(this.bpm*4);} subMs(index=this.topologyIndex){return this.stepMs/this.topologyFactors[index];}
    root(){return S_ROOTS[this.seasonIndex]+this.transpose;} scale(){return SCALES[this.seasonIndex];}
    density(){return Math.pow(this.densityRaw,0.4);} noteName(midi){return NNAMES[((midi%12)+12)%12]+Math.floor(midi/12-1);} shortNoteName(midi){return NNAMES[((midi%12)+12)%12];}
    randomNote(){const sc=this.scale(),r=this.root();return Math.max(0,Math.min(127,r+this.random.int(this.octaveRange)*12+sc[this.random.int(sc.length)]));}
    quantize(midi){const sc=this.scale(),r=this.root(),oct=Math.floor((midi-r)/12),sem=((midi-r)%12+12)%12;let best=sc[0],bd=99;for(const d of sc){const dist=Math.abs(d-sem);if(dist<bd){bd=dist;best=d;}}return Math.max(0,Math.min(127,r+oct*12+best));}
    clampToRange(midi){const sc=this.scale(),r=this.root(),sem=((midi-r)%12+12)%12;let best=sc[0],bd=99;for(const d of sc){const dist=Math.abs(d-sem);if(dist<bd){bd=dist;best=d;}}const oct=Math.max(0,Math.min(this.octaveRange-1,Math.floor((midi-r)/12)));return Math.max(0,Math.min(127,r+oct*12+best));}
    scaleStepUp(midi){const sc=this.scale(),sem=((midi-this.root())%12+12)%12;let idx=0;for(let i=0;i<sc.length;i++)if(sc[i]<=sem)idx=i;const nIdx=(idx+1)%sc.length;return Math.max(0,Math.min(127,midi-sc[idx]+sc[nIdx]+(sc[nIdx]<sc[idx]?12:0)));}
    get gates(){return this.gateMemory.slice(0,this.len);} get pitches(){return this.pitchMemory.slice(0,this.len).map(p=>this.clampToRange(p));}
    getPatternDisplay(){const gates=this.gates,pitches=this.pitches;return gates.map((g,i)=>g?this.shortNoteName(pitches[i]).padEnd(2):'··').join(' ');}
    setParam(name,value){switch(name){
      case 'bpm':this.bpm=Math.max(20,Math.min(300,Number(value)));break;
      case 'length':this.len=Math.max(1,Math.min(16,Math.round(value)));this.hits=Math.min(this.hits,this.len);if(!this.patternLocked)this.genGates();this.generatePrune();break;
      case 'hits':this.hits=Math.max(1,Math.min(16,Math.min(Math.round(value),this.len)));if(!this.patternLocked)this.genGates();break;
      case 'prune':this.pruneValue=Math.max(0,Math.min(1,value));this.generatePrune();break;
      case 'pruneRnd':this.pruneRnd=Math.max(0,Math.min(1,value));break;
      case 'sloppy':this.sloppy=Math.max(0,Math.min(1,value));break;
      case 'root':this.transpose=Math.round(value);if(!this.toneLocked)this.pitchMemory=this.pitchMemory.map(p=>this.quantize(p));break;
      case 'range':this.octaveRange=Math.max(1,Math.min(4,Math.round(value)));break;
      case 'evolve':this.evolveChance=Math.max(0,Math.min(1,value));break;
      case 'blossom':this.blossomAmount=Math.max(0,Math.min(1,value));break;
      case 'refract':this.topologyIndex=Math.max(0,Math.min(4,Math.round(value)));break;
      case 'refractRnd':this.blossomRefractRnd=Math.max(0,Math.min(1,value));break;
      case 'offset':this.blossomAttack=Math.max(0,Math.min(8,Math.round(value)));break;
      case 'decay':this.blossomReps=Math.max(1,Math.min(16,Math.round(value)));break;}}
    setSeason(index){this.seasonIndex=Math.max(0,Math.min(3,Math.round(index)));if(!this.toneLocked)this.pitchMemory=this.pitchMemory.map(p=>this.quantize(p));}
    setRamp(mode){this.blossomRampMode=mode==='up'?'up':'down';}
    setPitchMode(mode){if(['none','arp','octdown','octup'].includes(mode))this.blossomPitchMode=mode;}
    togglePatternLock(){this.patternLocked=!this.patternLocked;return this.patternLocked;} toggleToneLock(){this.toneLocked=!this.toneLocked;return this.toneLocked;} toggleEuclid(){this.euclid=!this.euclid;if(!this.patternLocked)this.genGates();return this.euclid;} toggleMute(){this.mute=!this.mute;return this.mute;}
    seedPattern(){if(this.patternLocked)return false;this.genGates();this.generatePrune();return true;} seedTones(){if(this.toneLocked)return false;this.genPitches();return true;}
    genGates(){if(this.patternLocked)return;if(this.euclid){for(let i=0;i<16;i++)this.gateMemory[i]=((i*this.hits/this.len)|0)!==(((i+1)*this.hits/this.len)|0);}else{this.gateMemory=new Array(16).fill(false);const pos=this.random.shuffle([...Array(this.len).keys()]);for(let i=0;i<Math.min(this.hits,this.len);i++)this.gateMemory[pos[i]]=true;}}
    genPitches(){if(this.toneLocked)return;const sc=this.scale(),r=this.root(),range=this.octaveRange,pos=this.random.shuffle([...Array(16).keys()]);for(let o=0;o<range&&o<16;o++){const d=this.random.int(sc.length);this.pitchMemory[pos[o]]=Math.max(0,Math.min(127,r+o*12+sc[d]));}for(let i=range;i<16;i++)this.pitchMemory[pos[i]]=this.randomNote();}
    generatePrune(){this.pruneMask=new Array(16).fill(true);if(this.pruneValue>=0.99)return;const keep=Math.max(1,Math.round(this.len*this.pruneValue)),mute=this.len-keep;const pos=[...Array(this.len).keys()].sort((a,b)=>(b/this.len+this.random.next()*0.3)-(a/this.len+this.random.next()*0.3));for(let i=0;i<mute;i++)this.pruneMask[pos[i]]=false;}
    pruneTick(){if(this.pruneRnd<0.05)return;if(!this.random.chance(this.pruneRnd))return;const shift=this.random.chance(0.5)?1:-1;if(shift>0)this.pruneMask.push(this.pruneMask.shift());else this.pruneMask.unshift(this.pruneMask.pop());}
    pruneAllows(step){return this.pruneMask[step%16];}
    evolveTick(){if(this.evolveChance<0.01||this.toneLocked)return false;this.evolveStepCount++;const period=Math.max(1,Math.round(1/this.evolveChance));if(this.evolveStepCount>=period){this.evolveStepCount=0;const t=this.random.int(this.len);this.pitchMemory[t]=this.randomNote();return true;}return false;}
    snapToOne(){if(this.patternLocked)return false;const first=this.gateMemory.slice(0,this.len).findIndex(g=>g);if(first<=0)return true;for(let r=0;r<first;r++){this.gateMemory.push(this.gateMemory.shift());this.pitchMemory.push(this.pitchMemory.shift());}return true;}
    blossomEvents(rootPitch,rootVel){const events=[];if(this.blossomAmount<0.02||!this.random.chance(this.blossomAmount))return events;const baseMs=this.subMs(),attackMs=this.blossomAttack*baseMs,minMidi=this.root(),maxMidi=minMidi+this.octaveRange*12-1;for(let i=0;i<this.blossomReps;i++){let eIdx=this.topologyIndex;if(this.blossomRefractRnd>0.05){const maxShift=Math.ceil(this.blossomRefractRnd*4),direction=this.random.chance(0.5)?1:-1;eIdx=Math.max(0,Math.min(4,eIdx+this.random.int(maxShift+1)*direction));}const eMs=this.subMs(eIdx),delayMs=attackMs+eMs*(i+1);let velocity=this.blossomRampMode==='up'?Math.max(4,Math.floor(rootVel*Math.pow(0.55,this.blossomReps-i))):Math.max(4,Math.floor(rootVel*Math.pow(0.55,i+1)));let pitch=rootPitch;if(this.blossomPitchMode==='arp'){for(let s=0;s<i+1;s++)pitch=this.scaleStepUp(pitch);}else if(this.blossomPitchMode==='octdown')pitch=rootPitch-12*(i+1);else if(this.blossomPitchMode==='octup')pitch=rootPitch+12*(i+1);while(pitch>maxMidi)pitch-=12;while(pitch<minMidi)pitch+=12;pitch=Math.max(0,Math.min(127,pitch));events.push({type:'note',source:'blossom',delayMs,note:pitch,velocity,durationMs:eMs*0.45,label:this.noteName(pitch)});}return events;}
    resetPlayback(){this.step=0;this.evolveStepCount=0;}
    tick(){const currentStep=this.step%this.len,events=[],gates=this.gates,pitches=this.pitches;const shouldPlay=!this.mute&&gates[currentStep]&&this.random.chance(this.density())&&this.pruneAllows(currentStep);if(shouldPlay){const pitch=pitches[currentStep],velocity=Math.floor(68+this.random.next()*20),sloppyMs=this.sloppy*this.stepMs*0.4*(this.random.next()*2-1),noteDur=this.stepMs*0.35,delayBase=Math.max(0,sloppyMs);events.push({type:'note',source:'root',delayMs:delayBase,note:pitch,velocity,durationMs:noteDur,label:this.noteName(pitch)});for(const e of this.blossomEvents(pitch,velocity)){e.delayMs+=delayBase;events.push(e);}}this.step=(this.step+1)%this.len;let evolved=false;if(this.step===0){evolved=this.evolveTick();this.pruneTick();}return{step:currentStep,length:this.len,stepMs:this.stepMs,events,evolved,pattern:this.getPatternDisplay()};}
    getState(){return{bpm:this.bpm,seasonIndex:this.seasonIndex,seasonLabel:S_LABELS[this.seasonIndex],seasonName:S_NAMES[this.seasonIndex],rootName:this.noteName(this.root()),topologyLabel:this.topologyLabels[this.topologyIndex],pattern:this.getPatternDisplay(),length:this.len,hits:this.hits,patternLocked:this.patternLocked,toneLocked:this.toneLocked,mute:this.mute,euclid:this.euclid,blossomPitchMode:this.blossomPitchMode,blossomRampMode:this.blossomRampMode};}
  }
  global.BOTANICA_CONSTANTS={NNAMES,SCALES,S_ROOTS,S_LABELS,S_NAMES};global.BotanicaEngine=BotanicaEngine;global.BotanicaSeededRandom=SeededRandom;
})(typeof window!=='undefined'?window:globalThis);
