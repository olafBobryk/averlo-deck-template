// Static first-paint code: no interpolated application data or storage writes.
// It runs before React and hands over once fonts, the mark's image (or a
// video's first frame) and the page are in, or at the cap; input ends it at
// once. No ring. BootLoader.module.css lifts the screen if this never runs.
export const BOOT_CAP_MS = 3000;
/** Every load shows it this long, so a fast load reads as a beat rather than a
    flash. */
export const BOOT_MIN_MS = 400;
export const bootBootstrap = `(()=>{
const root=document.getElementById("deck-boot");
if(!root)return;
const hold=root.hasAttribute("data-hold");
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const started=performance.now();
const video=root.querySelector("video");
const poster=root.querySelector("img");
const parts={fonts:0,media:0,page:0};
let lander=null,ended=null,settled=false,capped=false,phase="loading",cap=0;
const set=(next)=>{phase=next;root.dataset.state=next};
const input=()=>finish();
const unlisten=()=>{
clearTimeout(cap);
removeEventListener("pointerdown",input,true);
removeEventListener("keydown",input,true);
};
const finish=()=>{
if(phase==="leaving"||phase==="done")return;
const flown=phase==="landing";
unlisten();
/* After the flight the backdrop and the orb are already at 0: nothing is left
   to fade, and "leaving" would fade the backdrop back in under the fading
   screen, a veil over the whole page. */
set(flown?"done":"leaving");
if(ended)ended();
if(!flown)setTimeout(()=>set("done"),reduced?0:240);
};
const go=()=>{
if(!settled||(!lander&&!capped)||phase!=="loading")return;
if(document.hidden)return finish();
const now=performance.now();
const left=started+${BOOT_MIN_MS}-now;
if(left>0)return void setTimeout(go,left);
(lander||finish)();
};
const report=()=>{
if(parts.fonts&&parts.media&&parts.page&&!settled){settled=true;go()}
};
window.__deckBoot={
state:()=>phase,
orb:root.querySelector("[data-boot-orb]"),
ready:(fn)=>{lander=fn;parts.page=1;report();go()},
onEnd:(fn)=>{ended=fn},
lift:()=>{
if(phase!=="loading")return;
unlisten();
set("landing");
setTimeout(finish,2000);
},
finish,
complete:()=>{settled=true;go()},
};
addEventListener("pointerdown",input,true);
addEventListener("keydown",input,true);
if(hold)return;
cap=setTimeout(()=>{settled=capped=true;go()},${BOOT_CAP_MS});
const fontsIn=()=>{parts.fonts=1;report()};
(document.fonts?document.fonts.load('400 16px "Inter"').then(()=>document.fonts.ready):Promise.resolve()).then(fontsIn,fontsIn);
const mediaIn=()=>{parts.media=1;report()};
if(reduced||!video){poster.decode().then(mediaIn,mediaIn)}
else{
video.addEventListener("loadeddata",mediaIn,{once:true});
video.addEventListener("error",mediaIn,{once:true});
video.addEventListener("playing",()=>video.classList.add(video.dataset.playing));
video.src=video.dataset.src;
video.play().catch(()=>{});
}
})()`;
