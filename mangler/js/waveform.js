// ========================= 4) js/waveform.js =========================


_drawBuffer(){
if (!this.buffer) return;
const g = this.ctx, c=this.canvas;
const ch = this.buffer.getChannelData(0);
const samples = ch.length;
const totalDur = this.buffer.duration;
const viewDur = totalDur/this.zoom;
const viewStart = this.offset*totalDur;


const pxPer = viewDur / c.width;
g.strokeStyle = '#7ec7ff';
g.lineWidth = 1;
g.beginPath();
for (let x=0; x<c.width; x++){
const t = viewStart + x*pxPer;
const idx = Math.floor((t/totalDur)*samples);
const sliceSize = Math.max(1, Math.floor(samples/c.width));
let min=1, max=-1;
for(let i=0;i<sliceSize;i++){
const v = ch[Math.min(samples-1, idx+i)]||0;
if (v<min) min=v; if (v>max) max=v;
}
const y1 = (1-min)*c.height/2; const y2=(1-max)*c.height/2;
g.moveTo(x,y1); g.lineTo(x,y2);
}
g.stroke();
}


_drawSlice(){
if (!this.buffer) return;
const g = this.ctx, c=this.canvas;
const x1 = this.worldToScreen(this.slice.start);
const x2 = this.worldToScreen(this.slice.start + this.slice.length);
g.fillStyle = 'rgba(142,242,194,0.18)';
g.fillRect(Math.min(x1,x2),0, Math.abs(x2-x1), c.height);
g.strokeStyle = '#8ef2c2'; g.lineWidth=2; g.strokeRect(Math.min(x1,x2),2, Math.abs(x2-x1), c.height-4);
}


_drawPlayhead(){
const g = this.ctx, c=this.canvas;
const x = this.worldToScreen(this.playheadSec);
g.strokeStyle = '#ffd86b'; g.lineWidth=2;
g.beginPath(); g.moveTo(x,0); g.lineTo(x,c.height); g.stroke();
}


draw(){
this._drawBackground();
this._drawBuffer();
this._drawSlice();
this._drawPlayhead();
}


animate(getCurrentTime){
if (this._raf) cancelAnimationFrame(this._raf);
const tick = ()=>{
const t = getCurrentTime?.() ?? 0;
this.setPlayhead(t);
this.draw();
this._raf = requestAnimationFrame(tick);
};
tick();
}
}
