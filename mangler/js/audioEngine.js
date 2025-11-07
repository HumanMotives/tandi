// ========================= 3) js/audioEngine.js =========================
gain.linearRampToValueAtTime(0, now + sliceLen + R);
}


playSlice({rate=1, filterHz=20000, wet=0.3, A=0.01,D=0.1,S=0.7,R=0.5}={}, onStart){
if (!this.sliceBuffer) return;
const now = this.ctx.currentTime;


// source
const src = this.ctx.createBufferSource();
src.buffer = this.sliceBuffer;
src.playbackRate.value = rate;


// tone
this.filter.frequency.value = filterHz;
const env = this.ctx.createGain();
this.applyADSR(env, now, A,D,S,R, this.sliceBuffer.duration);


// fx mix
this.wetGain.gain.value = wet;


// routing
src.connect(this.filter);
this.filter.connect(env);
env.connect(this.dryGain);
env.connect(this.convolver);
this.convolver.connect(this.wetGain);


src.start();
onStart?.(now);
}


startFeedbackLoop({delayTime=1.5, feedback=0.6, rate=1, loop=false, loopStart=0, loopEnd=0}={}, onStart){
if (!this.sliceBuffer) return;
if (this.loopSource) try{ this.loopSource.stop(); }catch{}


this.delay.delayTime.value = delayTime;
this.feedback.gain.value = feedback;


const src = this.ctx.createBufferSource();
src.buffer = this.sliceBuffer;
src.loop = loop;
if (loop){ src.loopStart = loopStart; src.loopEnd = loopEnd; }
src.playbackRate.value = rate;


// direct & into delay feedback
src.connect(this.ctx.destination);
src.connect(this.delay);


src.start();
this.loopSource = src;
onStart?.(this.ctx.currentTime);
}


stopLoop(){ if (this.loopSource){ try{ this.loopSource.stop(); }catch{} this.loopSource=null; } }
}

