import { renderToStaticMarkup } from 'react-dom/server'
import { findFont, fontFace, type Deck, type Theme } from '@/lib/deck'
import { slideStyles } from '@/lib/slide-styles'
import { TRANSITION_MS, type Transition } from '@/lib/transitions'
import { SlideView } from '.'

export type DeckHtmlOptions = {
  theme?: Theme
  tone: string
  transition: Transition
  shareSafe?: boolean
  embedImage: (src: string) => Promise<string>
  embedFont: (file: string) => Promise<string>
}

export async function deckHtml(deck: Deck, { theme = deck.theme, tone, transition, shareSafe = false, embedImage, embedFont }: DeckHtmlOptions): Promise<string> {
  const look = { font: deck.font, scale: deck.scale, brand: deck.brand }
  const font = findFont(deck.font)
  const face = font.file ? fontFace(font, await embedFont(font.file)) : ''
  const slides = await Promise.all(deck.slides.map(async slide => {
    const embedded = slide.kind === 'image' ? { ...slide, src: await embedImage(slide.src) } : slide
    return `<div class="portable-slide"><div class="slide-frame">${renderToStaticMarkup(<SlideView slide={embedded} theme={theme} accent={tone} look={look} />)}</div></div>`
  }))
  const config = JSON.stringify({ duration: deck.duration, loop: deck.loop, durations: deck.slides.map(s => s.duration || deck.duration), transition, shareSafe, ms: TRANSITION_MS })
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${deck.title.replace(/[<>&"]/g, '')}</title><style>${face}${slideStyles}${pageStyles(theme)}</style></head><body class="slide-backdrop ${theme}" style="--slide-tone:${tone}">${slides.join('')}${controls}<div id="notice" role="status"></div><script>const config=${config};${player}<\/script></body></html>`
}

export async function fetchAsDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src
  const response = await fetch(src)
  if (!response.ok) throw new Error('Could not embed an image. Check its URL and try again.')
  const blob = await response.blob()
  return `data:${blob.type || 'image/png'};base64,${base64(new Uint8Array(await blob.arrayBuffer()))}`
}

const SAFE_AREA = 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'

const pageStyles = (theme: Theme) => `html,body{margin:0;background:${theme === 'room-light' ? '#fafafa' : '#121214'};width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif}.portable-slide{display:none;position:fixed;inset:0;box-sizing:border-box;padding:${SAFE_AREA};touch-action:pinch-zoom}.portable-slide.active,.portable-slide.kt-leave{display:flex;align-items:center;justify-content:center}.slide-frame{width:100%;height:100%;container-type:inline-size}@media(min-aspect-ratio:16/9){.slide-frame{width:auto;aspect-ratio:16/9;max-width:100%}}.portable-slide .slide{height:100%;border-radius:0}#notice{position:fixed;bottom:max(20px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:#fff;color:#111;padding:12px 20px;border-radius:8px;z-index:5}#notice:empty{display:none}#full{position:fixed;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));z-index:6;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:#18181bb3;color:#fff;cursor:pointer;touch-action:manipulation;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:opacity .25s}#full[hidden]{display:none}#full.idle{opacity:0;pointer-events:none}#full .exit,.fullscreen #full .enter{display:none}.fullscreen #full .exit{display:block}`

const icon = (path: string, className: string) => `<svg class="${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`

const controls = `<button id="full" type="button" aria-label="Toggle full screen" hidden>${icon('M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3', 'enter')}${icon('M18 6 6 18M6 6l12 12', 'exit')}</button>`

const player = `const slides=[...document.querySelectorAll('.portable-slide')],full=document.querySelector('#full');
const root=document.documentElement,canFull=!!(root.requestFullscreen||root.webkitRequestFullscreen);
let index=0,shown=0,timer,leaving,idle,playing=false,safe=config.shareSafe,last=0,total=0,gesture,start=null;
const fullElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
const mode=()=>safe&&config.transition!=='none'?'share':config.transition;
const show=()=>{const from=shown,t=mode();shown=index;root.dataset.transition=t;if(from!==index)root.style.setProperty('--kt-dir',index<from?-1:1);slides.forEach(s=>s.classList.remove('kt-enter','kt-leave'));void root.offsetWidth;slides.forEach((s,i)=>s.classList.toggle('active',i===index));clearTimeout(leaving);if(from!==index&&t!=='none'){slides[index].classList.add('kt-enter');slides[from].classList.add('kt-leave');leaving=setTimeout(()=>slides.forEach(s=>s.classList.remove('kt-enter','kt-leave')),config.ms[t])}schedule()};
const say=m=>{const n=document.querySelector('#notice');n.textContent=m;clearTimeout(say.t);say.t=setTimeout(()=>n.textContent='',1800)};
const pause=()=>{playing=false;clearTimeout(timer)};
const schedule=()=>{clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(index===slides.length-1&&!config.loop){pause();return}index=(index+1)%slides.length;show()},config.durations[index]*1000)};
const move=d=>{pause();index=Math.max(0,Math.min(slides.length-1,index+d));show()};
const wake=()=>{full.classList.remove('idle');clearTimeout(idle);idle=setTimeout(()=>full.classList.add('idle'),2600)};
const toggleFull=()=>{if(fullElement())(document.exitFullscreen||document.webkitExitFullscreen).call(document);else{const r=(root.requestFullscreen||root.webkitRequestFullscreen).call(root);if(r&&r.catch)r.catch(()=>{})}};
const syncFull=()=>root.classList.toggle('fullscreen',!!fullElement());
full.hidden=!canFull;
full.addEventListener('click',e=>{e.stopPropagation();toggleFull();wake()});
document.addEventListener('fullscreenchange',syncFull);document.addEventListener('webkitfullscreenchange',syncFull);
document.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229||e.target.closest('input,textarea,button'))return;if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();move(1)}if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();move(-1)}if(e.key.toLowerCase()==='f'&&canFull)toggleFull();if(e.key.toLowerCase()==='p'){playing=!playing;schedule();say(playing?'Autoscroll on':'Autoscroll off')}if(e.key.toLowerCase()==='s'){safe=!safe;root.dataset.transition=mode();say(safe?'Screen-share safe on':'Screen-share safe off')}});
document.addEventListener('click',pause);
document.addEventListener('pointermove',wake);document.addEventListener('pointerdown',wake);
document.addEventListener('touchstart',e=>{start=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
document.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y,d=Math.abs(dx)>Math.abs(dy)?dx:dy;start=null;if(Math.abs(d)>45)move(d<0?1:-1)});
document.addEventListener('wheel',e=>{e.preventDefault();clearTimeout(gesture);gesture=setTimeout(()=>{last=0;total=0},220);if(last)return;total+=e.deltaY;if(Math.abs(total)>60){move(Math.sign(total));last=Date.now();total=0}},{passive:false});
show();wake();`

function base64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
