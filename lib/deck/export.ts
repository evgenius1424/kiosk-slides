import type { Deck } from './types'

export function downloadFile(content: string, filename: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportDeck(element: HTMLElement, css: string, deck: Deck, motion: boolean) {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const image of Array.from(clone.querySelectorAll('img'))) {
    const response = await fetch(image.src); if (!response.ok) throw new Error('Could not embed an image. Check its URL and try again.');
    const blob = await response.blob();
    image.src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
  }
  const config = JSON.stringify({ duration: deck.duration, loop: deck.loop, durations: deck.slides.map(s => s.duration || deck.duration) });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${deck.title.replace(/[<>&"]/g, '')}</title><style>${css}html,body{margin:0;background:#18181b;width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif}.portable-slide{display:none;width:100vw;height:100dvh;container-type:inline-size}.portable-slide.active{display:block}.portable-slide .slide{height:100%;border-radius:0}.portable-slide.active .slide{${motion ? 'animation:slide-enter .3s ease-out' : 'animation:none'}}#notice{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#fff;color:#111;padding:12px 20px;border-radius:8px;z-index:5}#notice:empty{display:none}</style></head><body>${clone.innerHTML}<div id="notice" role="status"></div><script>const config=${config};const slides=[...document.querySelectorAll('.portable-slide')];let index=0,timer,playing=false,last=0,total=0,gesture;const show=()=>{slides.forEach((s,i)=>s.classList.toggle('active',i===index));schedule()};const pause=()=>{playing=false;clearTimeout(timer)};const schedule=()=>{clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(index===slides.length-1&&!config.loop){pause();return}index=(index+1)%slides.length;show()},config.durations[index]*1000)};const move=d=>{pause();index=Math.max(0,Math.min(slides.length-1,index+d));show()};document.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229||e.target.closest('input,textarea,button'))return;if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();move(1)}if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();move(-1)}if(e.key.toLowerCase()==='p'){playing=!playing;schedule();const n=document.querySelector('#notice');n.textContent=playing?'Autoscroll on':'Autoscroll off';setTimeout(()=>n.textContent='',1800)}});document.addEventListener('click',pause);document.addEventListener('wheel',e=>{e.preventDefault();clearTimeout(gesture);gesture=setTimeout(()=>{last=0;total=0},220);if(last)return;total+=e.deltaY;if(Math.abs(total)>60){move(Math.sign(total));last=Date.now();total=0}},{passive:false});show();<\/script></body></html>`;
  downloadFile(html, 'kiosk-slides.html', 'text/html');
}
