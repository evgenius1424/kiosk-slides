import { renderToStaticMarkup } from 'react-dom/server'
import type { Deck, Theme } from '@/lib/deck'
import { slideStyles } from '@/lib/slide-styles'
import { SlideView } from '.'

export type DeckHtmlOptions = {
  theme?: Theme
  tone: string
  motion: boolean
  embedImage: (src: string) => Promise<string>
}

export async function deckHtml(deck: Deck, { theme = deck.theme, tone, motion, embedImage }: DeckHtmlOptions): Promise<string> {
  const slides = await Promise.all(deck.slides.map(async slide => {
    const embedded = slide.kind === 'image' ? { ...slide, src: await embedImage(slide.src) } : slide
    return `<div class="portable-slide">${renderToStaticMarkup(<SlideView slide={embedded} theme={theme} accent={tone} />)}</div>`
  }))
  const config = JSON.stringify({ duration: deck.duration, loop: deck.loop, durations: deck.slides.map(s => s.duration || deck.duration) })
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${deck.title.replace(/[<>&"]/g, '')}</title><style>${slideStyles}${pageStyles(motion)}</style></head><body>${slides.join('')}${controls}<div id="notice" role="status"></div><script>const config=${config};${player}<\/script></body></html>`
}

export async function fetchAsDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src
  const response = await fetch(src)
  if (!response.ok) throw new Error('Could not embed an image. Check its URL and try again.')
  const blob = await response.blob()
  return `data:${blob.type || 'image/png'};base64,${base64(new Uint8Array(await blob.arrayBuffer()))}`
}

const pageStyles = (motion: boolean) => `html,body{margin:0;background:#18181b;width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif}.portable-slide{display:none;width:100vw;height:100dvh;container-type:inline-size;touch-action:pan-y pinch-zoom}.portable-slide.active{display:block}.portable-slide .slide{height:100%;border-radius:0}.portable-slide.active .slide{${motion ? 'animation:slide-enter .3s ease-out' : 'animation:none'}}#notice{position:fixed;bottom:84px;left:50%;transform:translateX(-50%);background:#fff;color:#111;padding:12px 20px;border-radius:8px;z-index:5}#notice:empty{display:none}#controls{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:6px;padding:6px;border-radius:999px;background:#18181bcc;color:#fff;font-size:14px;font-variant-numeric:tabular-nums;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:opacity .25s}#controls.idle{opacity:0;pointer-events:none}#controls button{display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;touch-action:manipulation}#controls button:disabled{opacity:.35;cursor:default}#controls button[hidden]{display:none}#counter{padding:0 8px;min-width:56px;text-align:center}#full{margin-left:4px;background:#ffffff1f!important}#full .exit,.fullscreen #full .enter{display:none}.fullscreen #full .exit{display:block}`

const icon = (path: string, className = '') => `<svg class="${className}" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`

const controls = `<nav id="controls" aria-label="Slide controls"><button id="prev" type="button" aria-label="Previous slide">${icon('m15 18-6-6 6-6')}</button><span id="counter"></span><button id="next" type="button" aria-label="Next slide">${icon('m9 18 6-6-6-6')}</button><button id="full" type="button" aria-label="Toggle full screen" hidden>${icon('M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3', 'enter')}${icon('M18 6 6 18M6 6l12 12', 'exit')}</button></nav>`

const player = `const slides=[...document.querySelectorAll('.portable-slide')];
const bar=document.querySelector('#controls'),counter=document.querySelector('#counter'),prev=document.querySelector('#prev'),next=document.querySelector('#next'),full=document.querySelector('#full');
const root=document.documentElement,canFull=!!(root.requestFullscreen||root.webkitRequestFullscreen);
let index=0,timer,idle,playing=false,last=0,total=0,gesture,start=null;
const fullElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
const show=()=>{slides.forEach((s,i)=>s.classList.toggle('active',i===index));counter.textContent=(index+1)+' / '+slides.length;prev.disabled=index===0;next.disabled=index===slides.length-1;schedule()};
const pause=()=>{playing=false;clearTimeout(timer)};
const schedule=()=>{clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(index===slides.length-1&&!config.loop){pause();return}index=(index+1)%slides.length;show()},config.durations[index]*1000)};
const move=d=>{pause();index=Math.max(0,Math.min(slides.length-1,index+d));show()};
const wake=()=>{bar.classList.remove('idle');clearTimeout(idle);idle=setTimeout(()=>bar.classList.add('idle'),2600)};
const toggleFull=()=>{if(fullElement())(document.exitFullscreen||document.webkitExitFullscreen).call(document);else{const r=(root.requestFullscreen||root.webkitRequestFullscreen).call(root);if(r&&r.catch)r.catch(()=>{})}};
const syncFull=()=>root.classList.toggle('fullscreen',!!fullElement());
full.hidden=!canFull;
prev.addEventListener('click',e=>{e.stopPropagation();move(-1);wake()});
next.addEventListener('click',e=>{e.stopPropagation();move(1);wake()});
full.addEventListener('click',e=>{e.stopPropagation();toggleFull();wake()});
document.addEventListener('fullscreenchange',syncFull);document.addEventListener('webkitfullscreenchange',syncFull);
document.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229||e.target.closest('input,textarea,button'))return;if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();move(1)}if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();move(-1)}if(e.key.toLowerCase()==='f'&&canFull)toggleFull();if(e.key.toLowerCase()==='p'){playing=!playing;schedule();const n=document.querySelector('#notice');n.textContent=playing?'Autoscroll on':'Autoscroll off';setTimeout(()=>n.textContent='',1800)}});
document.addEventListener('click',pause);
document.addEventListener('pointermove',wake);document.addEventListener('pointerdown',wake);
document.addEventListener('touchstart',e=>{start=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
document.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2)move(dx<0?1:-1)});
document.addEventListener('wheel',e=>{e.preventDefault();clearTimeout(gesture);gesture=setTimeout(()=>{last=0;total=0},220);if(last)return;total+=e.deltaY;if(Math.abs(total)>60){move(Math.sign(total));last=Date.now();total=0}},{passive:false});
show();wake();`

function base64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
