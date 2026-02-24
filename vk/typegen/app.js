
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 1080;
canvas.height = 1920;

let running = false;
let startTime = 0;

function getWords(){
  return document.getElementById("words").value
    .split("\n")
    .map(w=>w.trim())
    .filter(Boolean);
}

function drawWord(word, progress){

  const layout = document.getElementById("layoutMode").value;
  const letterMode = document.getElementById("letterMode").value;
  const scale = document.getElementById("sizeScale").value / 100;

  const bg = document.getElementById("bgMode").value;
  ctx.fillStyle = bg === "black" ? "#000" : "#fff";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = bg === "black" ? "#fff" : "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const baseSize = 260 * scale;
  ctx.font = "900 " + baseSize + "px Arial Black";

  if(letterMode === "sequential"){
    const letters = word.split("");
    const index = Math.floor(progress * letters.length);
    const visible = letters.slice(0,index+1);

    if(layout === "vertical"){
      visible.forEach((l,i)=>{
        ctx.fillText(l, canvas.width/2, canvas.height/2 - (visible.length*baseSize)/2 + i*baseSize);
      });
    } else {
      ctx.fillText(visible.join(""), canvas.width/2, canvas.height/2);
    }

  } else {

    if(layout === "vertical"){
      word.split("").forEach((l,i)=>{
        ctx.fillText(l, canvas.width/2, canvas.height/2 - (word.length*baseSize)/2 + i*baseSize);
      });
    } else if(layout === "horizontal"){
      const spacing = baseSize*0.9;
      word.split("").forEach((l,i)=>{
        ctx.fillText(l, canvas.width/2 - (word.length*spacing)/2 + i*spacing, canvas.height/2);
      });
    } else {
      ctx.fillText(word, canvas.width/2, canvas.height/2);
    }
  }
}

function animate(timestamp){

  if(!running) return;

  const words = getWords();
  const secPerWord = parseFloat(document.getElementById("secPerWord").value);
  const elapsed = (timestamp - startTime)/1000;

  const index = Math.floor(elapsed / secPerWord) % words.length;
  const progress = (elapsed % secPerWord) / secPerWord;

  drawWord(words[index], progress);

  requestAnimationFrame(animate);
}

document.getElementById("previewBtn").onclick = ()=>{
  running = true;
  startTime = performance.now();
  requestAnimationFrame(animate);
};

document.getElementById("stopBtn").onclick = ()=>{
  running = false;
};

document.getElementById("recordBtn").onclick = ()=>{

  running = true;
  startTime = performance.now();

  const stream = canvas.captureStream(60);
  const recorder = new MediaRecorder(stream, {mimeType:"video/webm"});
  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);

  recorder.onstop = ()=>{
    const blob = new Blob(chunks,{type:"video/webm"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voidkultur_reel.webm";
    a.click();
  };

  recorder.start();
  requestAnimationFrame(animate);

  setTimeout(()=>{
    recorder.stop();
    running = false;
  }, parseInt(document.getElementById("totalSec").value)*1000);
};
