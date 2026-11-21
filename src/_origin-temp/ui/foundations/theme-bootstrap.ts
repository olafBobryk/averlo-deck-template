// Static first-paint code: no interpolated application data or storage writes.
export const themeBootstrap = `(()=>{let p="system";try{const v=localStorage.getItem("deck.theme");if(v==="dark"||v==="light")p=v}catch{}const t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t})()`;
