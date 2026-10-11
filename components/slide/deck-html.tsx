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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${deck.title.replace(/[<>&"]/g, '')}</title><style>${slideStyles}${pageStyles(motion)}</style></head><body>${slides.join('')}<div id="notice" role="status"></div><script>const config=${config};${player}<\/script></body></html>`
}

export async function fetchAsDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src
  const response = await fetch(src)
  if (!response.ok) throw new Error('Could not embed an image. Check its URL and try again.')
  const blob = await response.blob()
  return `data:${blob.type || 'image/png'};base64,${base64(new Uint8Array(await blob.arrayBuffer()))}`
}

const pageStyles = (motion: boolean) => `html,body{margin:0;background:#18181b;width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif}.portable-slide{display:none;width:100vw;height:100dvh;container-type:inline-size}.portable-slide.active{display:block}.portable-slide .slide{height:100%;border-radius:0}.portable-slide.active .slide{${motion ? 'animation:slide-enter .3s ease-out' : 'animation:none'}}#notice{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#fff;color:#111;padding:12px 20px;border-radius:8px;z-index:5}#notice:empty{display:none}`

const player = `const slides=[...document.querySelectorAll('.portable-slide')];let index=0,timer,playing=false,last=0,total=0,gesture;const show=()=>{slides.forEach((s,i)=>s.classList.toggle('active',i===index));schedule()};const pause=()=>{playing=false;clearTimeout(timer)};const schedule=()=>{clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(index===slides.length-1&&!config.loop){pause();return}index=(index+1)%slides.length;show()},config.durations[index]*1000)};const move=d=>{pause();index=Math.max(0,Math.min(slides.length-1,index+d));show()};document.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229||e.target.closest('input,textarea,button'))return;if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();move(1)}if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();move(-1)}if(e.key.toLowerCase()==='p'){playing=!playing;schedule();const n=document.querySelector('#notice');n.textContent=playing?'Autoscroll on':'Autoscroll off';setTimeout(()=>n.textContent='',1800)}});document.addEventListener('click',pause);document.addEventListener('wheel',e=>{e.preventDefault();clearTimeout(gesture);gesture=setTimeout(()=>{last=0;total=0},220);if(last)return;total+=e.deltaY;if(Math.abs(total)>60){move(Math.sign(total));last=Date.now();total=0}},{passive:false});show();`

function base64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
