



// transport
ui.on(ui.playOnce,'click', ()=>{
if (!engine.buffer) return alert('Load audio first');
const reverse = ui.reverse.checked;
engine.makeSlice(wf.slice.start, wf.slice.length, reverse);
engine.playSlice({
rate:Number(ui.rate.value),
filterHz:Number(ui.filter.value),
wet:Number(ui.wet.value),
A:Number(ui.attack.value), D:Number(ui.decay.value), S:Number(ui.sustain.value), R:Number(ui.release.value)
}, (t0)=>{ /* could capture start time */ });
ui.log('▶️ Played slice once');
});


ui.on(ui.startLoop,'click', ()=>{
if (!engine.buffer) return alert('Load audio first');
const reverse = ui.reverse.checked;
engine.makeSlice(wf.slice.start, wf.slice.length, reverse);
engine.startFeedbackLoop({
delayTime:Number(ui.delay.value),
feedback:Number(ui.feedback.value),
rate:Number(ui.rate.value),
loop:ui.loopToggle.checked,
loopStart:wf.slice.start,
loopEnd:wf.slice.start + wf.slice.length
}, ()=>{});
ui.log(`🔁 Loop started (delay ${ui.delay.value}s, fb ${ui.feedback.value})`);
});


ui.on(ui.stopLoop,'click', ()=>{ engine.stopLoop(); ui.log('⏹️ Loop stopped'); });


// randomizers
ui.on(ui.randomSlice,'click', ()=>{
if (!engine.buffer) return;
const dur = engine.buffer.duration;
ui.length.value = (0.01 + Math.random()*Math.min(1,dur)).toFixed(3);
const maxStart = Math.max(0, dur - Number(ui.length.value));
ui.start.value = (Math.random()*(maxStart/dur)).toFixed(3);
ui.rate.value = (0.1 + Math.random()*2.9).toFixed(2);
ui.start.dispatchEvent(new Event('input')); ui.length.dispatchEvent(new Event('input')); ui.rate.dispatchEvent(new Event('input'));
ui.log('🎲 Random slice');
});


ui.on(ui.randomTone,'click', ()=>{
ui.attack.value=(Math.random()).toFixed(2);
ui.decay.value=(Math.random()).toFixed(2);
ui.sustain.value=(Math.random()).toFixed(2);
ui.release.value=(Math.random()*3).toFixed(2);
ui.filter.value=(100+Math.random()*19900)|0;
ui.wet.value=Math.random().toFixed(2);
['attack','decay','sustain','release','filter','wet'].forEach(id=>ui[id].dispatchEvent(new Event('input')));
ui.log('🎲 Random tone');
});


ui.on(ui.randomFX,'click', ()=>{
ui.delay.value=(Math.random()*5).toFixed(2);
ui.feedback.value=(Math.random()*0.95).toFixed(2);
ui.delay.dispatchEvent(new Event('input')); ui.feedback.dispatchEvent(new Event('input'));
ui.log('🎲 Random FX');
});


ui.on(ui.randomAll,'click', ()=>{ ui.randomSlice.click(); ui.randomTone.click(); ui.randomFX.click(); ui.log('🔀 Randomized all'); });


// bootstrap: keep outputs synced and waveform sized
syncFromSliders();
window.addEventListener('DOMContentLoaded', ()=>{
// force initial resize/setup
const ev = new Event('resize'); window.dispatchEvent(ev);
});
