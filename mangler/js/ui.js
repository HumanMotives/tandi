// ========================= 5) js/ui.js =========================
this.stopLoop = byId('stopLoop');
this.loopToggle = byId('loopToggle');
this.reverse = byId('reverse');


// sliders
this.start = byId('start'); this.startOut = byId('startOut');
this.length = byId('length'); this.lengthOut = byId('lengthOut');
this.rate = byId('rate'); this.rateOut = byId('rateOut');


this.attack = byId('attack'); this.attackOut = byId('attackOut');
this.decay = byId('decay'); this.decayOut = byId('decayOut');
this.sustain = byId('sustain'); this.sustainOut = byId('sustainOut');
this.release = byId('release'); this.releaseOut = byId('releaseOut');
this.filter = byId('filter'); this.filterOut = byId('filterOut');
this.wet = byId('wet'); this.wetOut = byId('wetOut');


this.delay = byId('delay'); this.delayOut = byId('delayOut');
this.feedback = byId('feedback'); this.feedbackOut = byId('feedbackOut');


// randomize
this.randomSlice = byId('randomSlice');
this.randomTone = byId('randomTone');
this.randomFX = byId('randomFX');
this.randomAll = byId('randomAll');


this.logEl = byId('log');


// helpers
this._bindValueMirrors();
}


on(el, ev, fn){ el.addEventListener(ev, fn); }
log(msg){ this.logEl.textContent += '\n'+msg; this.logEl.scrollTop = this.logEl.scrollHeight; }


_bindValueMirrors(){
const pairs = [
['start','startOut'], ['length','lengthOut'], ['rate','rateOut'],
['attack','attackOut'], ['decay','decayOut'], ['sustain','sustainOut'], ['release','releaseOut'],
['filter','filterOut'], ['wet','wetOut'],
['delay','delayOut'], ['feedback','feedbackOut']
];
for (const [i,o] of pairs){
const input = this[i]; const out = this[o];
const update = ()=>{ out.value = Number(input.value).toFixed( (i==='filter')?0:2 ); };
input.addEventListener('input', update); update();
}
}
}
