import { renderToStaticMarkup } from 'react-dom/server'
import {
  presentationLook,
  findFont,
  fontFace,
  hasCyrillic,
  type Presentation,
  type Theme,
  type Transition,
} from '@/lib/presentation'
import { slideStyles } from '@/lib/slide-styles'
import {
  IDLE_MS,
  PLAYER_KEYS,
  PLAYER_WORDS,
  SETTLE_MS,
  SLIDE_HASH,
  SWIPE,
  TRANSITION_MS,
  WHEEL,
  slideLabel,
  slideSeconds,
} from '@/lib/player'
import { SlideView } from '.'

export type PresentationHtmlOptions = {
  theme?: Theme
  tone?: string
  transition?: Transition
  shareSafe?: boolean
  site?: string
  embedImage: (src: string) => Promise<string>
  embedFont: (file: string) => Promise<string>
}

export async function presentationHtml(
  presentation: Presentation,
  {
    theme = presentation.theme,
    tone = presentation.tone,
    transition = presentation.transition,
    shareSafe = presentation.shareSafe,
    site,
    embedImage,
    embedFont,
  }: PresentationHtmlOptions,
): Promise<string> {
  const look = presentationLook(presentation)
  const cyrillic = hasCyrillic(JSON.stringify(presentation))
  const files = findFont(presentation.font).files.filter(f => cyrillic || f.script === 'latin')
  const faces = await Promise.all(files.map(async f => fontFace(f, await embedFont(f.file))))
  const slides = await Promise.all(
    presentation.slides.map(async (slide, i, all) => {
      const embedded =
        slide.kind === 'image' ? { ...slide, src: await embedImage(slide.src) } : slide
      const label = escapeAttribute(slideLabel(slide, i, all.length))
      return `<div class="portable-slide" role="region" aria-roledescription="slide" aria-label="${label}"><div class="slide-frame">${renderToStaticMarkup(<SlideView slide={embedded} theme={theme} accent={tone} look={look} />)}</div></div>`
    }),
  )
  const config = JSON.stringify({
    duration: presentation.duration,
    loop: presentation.loop,
    durations: presentation.slides.map(s => slideSeconds(s, presentation.duration)),
    transition,
    shareSafe,
    ms: TRANSITION_MS,
    keys: PLAYER_KEYS,
    swipe: SWIPE,
    wheel: WHEEL,
    idle: IDLE_MS,
    settle: SETTLE_MS,
    words: PLAYER_WORDS,
    credit: presentation.credit && site ? site : '',
    hash: SLIDE_HASH.source,
  })
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${presentation.title.replace(/[<>&"]/g, '')}</title><style>${faces.join('')}${slideStyles}${pageStyles(theme)}${printStyles}</style></head><body class="slide-backdrop ${theme}" style="--slide-tone:${tone}">${slides.join('')}${controls}<div id="notice" role="status"></div><div id="spoken" aria-live="polite"></div><script>const config=${config};${player}</script></body></html>`
}

export async function fetchAsDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src
  const response = await fetch(src)
  if (!response.ok) throw new Error('Could not embed an image. Check its URL and try again.')
  const blob = await response.blob()
  return `data:${blob.type || 'image/png'};base64,${base64(new Uint8Array(await blob.arrayBuffer()))}`
}

const SAFE_AREA =
  'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'

const PAGE_BACKGROUNDS: Record<Theme, string> = {
  'room-dark': '#121214',
  'room-light': '#fafafa',
  studio: '#000000',
  paper: '#f3ede1',
  poster: '#111111',
  marker: '#f6f6f3',
}

const pageStyles = (theme: Theme) =>
  `html,body{margin:0;background:${PAGE_BACKGROUNDS[theme]};width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif}.portable-slide{display:none;position:fixed;inset:0;box-sizing:border-box;padding:${SAFE_AREA};touch-action:pinch-zoom}.portable-slide.active,.portable-slide.kt-leave{display:flex;align-items:center;justify-content:center}.slide-frame{width:100%;height:100%;container-type:inline-size}@media(min-aspect-ratio:16/9){.slide-frame{width:auto;aspect-ratio:16/9;max-width:100%}}.portable-slide .slide{height:100%;border-radius:0;transition:opacity .2s ease-out}[data-settling] .portable-slide .slide{opacity:0;transition:none}#notice{position:fixed;bottom:max(20px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:#fff;color:#111;padding:12px 20px;border-radius:8px;z-index:5}#notice:empty{display:none}#notice a{color:inherit}#spoken{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}#full{position:fixed;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));z-index:6;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:#18181bb3;color:#fff;cursor:pointer;touch-action:manipulation;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:opacity .25s}#full[hidden]{display:none}#full.idle{opacity:0;pointer-events:none}#full .exit,.fullscreen #full .enter{display:none}.fullscreen #full .exit{display:block}`

const printStyles = `@page{size:16in 9in;margin:0}@media print{html,body{width:auto;height:auto;overflow:visible;-webkit-print-color-adjust:exact;print-color-adjust:exact}.portable-slide,.portable-slide.active,.portable-slide.kt-leave{display:block;position:relative;inset:auto;width:16in;height:9in;padding:0;overflow:hidden;background:var(--slide-wash);break-inside:avoid}.portable-slide+.portable-slide{break-before:page}.slide-frame{width:100%;height:100%;aspect-ratio:auto}.portable-slide *{animation:none!important;transition:none!important}[data-settling] .portable-slide .slide{opacity:1}#full,#notice,#spoken{display:none!important}}`

const icon = (path: string, className: string) =>
  `<svg class="${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`

const controls = `<button id="full" type="button" aria-label="Toggle full screen" hidden>${icon('M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3', 'enter')}${icon('M18 6 6 18M6 6l12 12', 'exit')}</button>`

const player = `const slides=[...document.querySelectorAll('.portable-slide')],full=document.querySelector('#full');
const root=document.documentElement,canFull=!!(root.requestFullscreen||root.webkitRequestFullscreen);
const fromHash=()=>{const m=new RegExp(config.hash).exec(location.hash);return m?Math.max(0,Math.min(slides.length-1,m[1]-1)):null};
let index=fromHash()??0,shown=index,timer,leaving,idle,settle,playing=false,safe=config.shareSafe,locked=false,total=0,gesture,start=null,lock=null,asking=false;
const fullElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
const mark=()=>{const h='#'+(index+1);if(location.hash===h)return;try{history.replaceState(history.state,'',h)}catch{location.replace(h)}};
const keep=()=>{const want=playing||!!fullElement();if(!want){if(lock){lock.release().catch(()=>{});lock=null}return}if(asking||lock&&!lock.released||document.visibilityState!=='visible'||!navigator.wakeLock)return;asking=true;navigator.wakeLock.request('screen').then(l=>{lock=l;asking=false;keep()},()=>{asking=false})};
const mode=()=>safe&&config.transition!=='none'?'share':config.transition;
const show=()=>{const from=shown,t=mode();shown=index;root.dataset.transition=t;if(from!==index)root.style.setProperty('--kt-dir',index<from?-1:1);slides.forEach(s=>s.classList.remove('kt-enter','kt-leave'));void root.offsetWidth;slides.forEach((s,i)=>{const on=i===index;s.classList.toggle('active',on);s.inert=!on;if(on)s.removeAttribute('aria-hidden');else s.setAttribute('aria-hidden','true')});if(from!==index)document.querySelector('#spoken').textContent=slides[index].getAttribute('aria-label');clearTimeout(leaving);if(from!==index&&t!=='none'){slides[index].classList.add('kt-enter');slides[from].classList.add('kt-leave');leaving=setTimeout(()=>slides.forEach(s=>s.classList.remove('kt-enter','kt-leave')),config.ms[t])}mark();schedule()};
const say=(m,link)=>{const n=document.querySelector('#notice');n.textContent=m;if(link){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener';a.textContent=config.words.credit;n.append(' · ',a)}clearTimeout(say.t);say.t=setTimeout(()=>n.textContent='',link?6000:1800)};
const pause=()=>{playing=false;clearTimeout(timer);keep()};
const schedule=()=>{clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(index===slides.length-1&&!config.loop){pause();say(config.words.end,config.credit);return}index=(index+1)%slides.length;show()},config.durations[index]*1000);keep()};
const go=i=>{pause();index=Math.max(0,Math.min(slides.length-1,i));show()};
const move=d=>go(index+d);
const wake=()=>{full.classList.remove('idle');clearTimeout(idle);idle=setTimeout(()=>full.classList.add('idle'),config.idle)};
const toggleFull=()=>{if(fullElement())(document.exitFullscreen||document.webkitExitFullscreen).call(document);else{const r=(root.requestFullscreen||root.webkitRequestFullscreen).call(root);if(r&&r.catch)r.catch(()=>{})}};
const syncFull=()=>{root.classList.toggle('fullscreen',!!fullElement());keep()};
const actions={next:()=>move(1),previous:()=>move(-1),first:()=>go(0),last:()=>go(slides.length-1),fullscreen:()=>{if(canFull)toggleFull()},autoplay:()=>{playing=!playing;schedule();say(config.words.autoplay[playing?'on':'off'])},shareSafe:()=>{safe=!safe;root.dataset.transition=mode();say(config.words.shareSafe[safe?'on':'off'])}};
full.hidden=!canFull;
full.addEventListener('click',e=>{e.stopPropagation();toggleFull();wake()});
document.addEventListener('visibilitychange',keep);
addEventListener('hashchange',()=>{const i=fromHash();if(i!==null&&i!==index)go(i)});
addEventListener('resize',()=>{root.dataset.settling='';clearTimeout(settle);settle=setTimeout(()=>delete root.dataset.settling,config.settle)});
document.addEventListener('fullscreenchange',syncFull);document.addEventListener('webkitfullscreenchange',syncFull);
document.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,button'))return;const a=config.keys[e.key.length===1?e.key.toLowerCase():e.key];if(!a)return;e.preventDefault();actions[a]()});
document.addEventListener('click',pause);
document.addEventListener('pointermove',wake);document.addEventListener('pointerdown',wake);
document.addEventListener('touchstart',e=>{start=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
document.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y,d=Math.abs(dy)>Math.abs(dx)?dy:Math.abs(dx)>Math.abs(dy)*config.swipe.ratio?dx:0;start=null;if(Math.abs(d)>config.swipe.distance)move(d<0?1:-1)});
document.addEventListener('wheel',e=>{e.preventDefault();clearTimeout(gesture);gesture=setTimeout(()=>{locked=false;total=0},config.wheel.settleMs);if(locked)return;total+=e.deltaY*(e.deltaMode===1?config.wheel.lineHeight:1);if(Math.abs(total)>config.wheel.distance){move(Math.sign(total));locked=true;total=0}},{passive:false});
show();wake();`

function escapeAttribute(text: string) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function base64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
