
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const DPR = window.devicePixelRatio || 1;
canvas.width = 1080 * DPR;
canvas.height = 1920 * DPR;
ctx.scale(DPR,DPR);

let running=false;
let startTime=0;

function wordsList(){
const val = document.getElementById("words").value || "";
return val.split("\n").map(w=>w.trim()).filter(Boolean);
}

function currentFontColor(){
const preset=document.getElementById("fontPreset").value;
if(preset==="white") return "#ffffff";
if(preset==="black") return "#000000";
if(preset==="red") return "#ff2a2a";
return document.getElementById("fontColor").value;
}

function drawGlitchText(text,x,y,size){

const glitch = parseInt(document.getElementById("glitch").value)/100;

ctx.font="900 "+size+"px Arial Black";
ctx.textAlign="center";
ctx.textBaseline="middle";
ctx.fillStyle=currentFontColor();
ctx.fillText(text,x,y);

if(glitch>0){

for(let i=0;i<5*glitch;i++){

let sliceY=y+(Math.random()-0.5)*size;
let sliceH=10+Math.random()*40;

ctx.save();
ctx.beginPath();
ctx.rect(0,sliceY,1080,sliceH);
ctx.clip();

ctx.fillStyle=currentFontColor();
ctx.globalAlpha=0.4;
ctx.fillText(text,x+(Math.random()-0.5)*40*glitch,y);

ctx.restore();
}

}
}

function draw(word,progress){

const bg=document.getElementById("bgMode").value;
ctx.fillStyle = bg==="black" ? "#000" : "#fff";
ctx.fillRect(0,0,1080,1920);

const layout=document.getElementById("layoutMode").value;
const letterMode=document.getElementById("letterMode").value;
const scale=document.getElementById("sizeScale").value/100;

const size=260*scale;

if(letterMode==="sequential"){

const letters=word.split("");
const index=Math.floor(progress*letters.length);
const visible=letters.slice(0,index+1);

if(layout==="vertical"){
visible.forEach((l,i)=>{
drawGlitchText(l,540,960-(visible.length*size)/2+i*size,size);
});
}else{
drawGlitchText(visible.join(""),540,960,size);
}

}else{

if(layout==="vertical"){
word.split("").forEach((l,i)=>{
drawGlitchText(l,540,960-(word.length*size)/2+i*size,size);
});
}else if(layout==="horizontal"){
const spacing=size*0.8;
word.split("").forEach((l,i)=>{
drawGlitchText(l,540-(word.length*spacing)/2+i*spacing,960,size);
});
}else{
drawGlitchText(word,540,960,size);
}

}

}

function animate(timestamp){

if(!running) return;

const list=wordsList();
if(list.length===0) return;

const sec=parseFloat(document.getElementById("secPerWord").value);
const elapsed=(timestamp-startTime)/1000;

const index=Math.floor(elapsed/sec)%list.length;
const progress=(elapsed%sec)/sec;

draw(list[index],progress);

requestAnimationFrame(animate);
}

document.getElementById("previewBtn").onclick=()=>{
running=true;
startTime=performance.now();
requestAnimationFrame(animate);
};

document.getElementById("stopBtn").onclick=()=>{
running=false;
};

document.getElementById("recordBtn").onclick=()=>{

running=true;
startTime=performance.now();

const stream=canvas.captureStream(60);
const recorder=new MediaRecorder(stream,{mimeType:"video/webm"});
const chunks=[];

recorder.ondataavailable=e=>chunks.push(e.data);
recorder.onstop=()=>{
const blob=new Blob(chunks,{type:"video/webm"});
const url=URL.createObjectURL(blob);
const a=document.createElement("a");
a.href=url;
a.download="voidkultur_reel.webm";
a.click();
};

recorder.start();
requestAnimationFrame(animate);

setTimeout(()=>{
recorder.stop();
running=false;
},parseInt(document.getElementById("totalSec").value)*1000);
};
