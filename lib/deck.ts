export type Slide = {
  title: string; label: string; footer: string; heading: string; body: string;
  type: 'message' | 'before-after' | 'steps' | 'flow' | 'code' | 'metric' | 'agent-chat' | 'image' | 'art';
  values: Record<string, string>; items: string[]; layout: string; duration?: number;
}
export type Deck = { title: string; duration: number; loop: boolean; slides: Slide[] }

export function parseDeck(source: string): Deck {
  const lines = source.replace(/\r/g, '').split('\n');
  let start = 0;
  let title = 'Untitled deck'; let duration = 12; let loop = true;
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (end < 0) throw new Error('Line 1: close the front matter with ---');
    const front = lines.slice(1, end).join('\n');
    title = front.match(/^title:\s*(.+)$/m)?.[1] || title;
    const theme = front.match(/^theme:\s*(.+)$/m)?.[1];
    if (theme && !['room-dark', 'room-light'].includes(theme)) throw new Error(`Unknown theme “${theme}”. Use room-dark or room-light.`);
    duration = Number(front.match(/duration:\s*(\d+)s/)?.[1] || 12);
    loop = !/loop:\s*false/.test(front); start = end + 1;
  }
  const chunks: { text: string[]; line: number }[] = [{ text: [], line: start + 1 }];
  let fenced = false; let directive = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) fenced = !fenced;
    if (!fenced && line.startsWith(':::')) directive = line.trim() !== ':::';
    if (!fenced && !directive && line.trim() === '---') chunks.push({ text: [], line: i + 2 });
    else chunks[chunks.length - 1].text.push(line);
  }
  if (fenced) throw new Error('Close the code block with ```');
  if (directive) throw new Error('Close the directive with :::');
  const slides: Slide[] = chunks.filter(c => c.text.join('').trim()).map(chunk => {
    let text = chunk.text.join('\n');
    const fail = (message: string): never => { throw new Error(`Line ${chunk.line}: ${message}`) };
    const slide: Slide = { title: '', label: '', footer: '', heading: '', body: '', type: 'message', values: {}, items: [], layout: 'auto' };
    let widgets = 0;
    text = text.replace(/:::([\w-]+)\s*\n([\s\S]*?)\n:::/g, (_, name: string, value: string) => {
      if (!['meta', 'before-after', 'flow', 'metric', 'agent-chat'].includes(name)) return fail(`Unknown directive “${name}”.`);
      const allowed: Record<string, string[]> = { meta: ['title','label','footer','layout','duration'], 'before-after': ['before','after'], flow: ['starts'], metric: ['value','caption'], 'agent-chat': ['profile','heading'] };
      const values: Record<string, string> = {};
      value.split('\n').filter(Boolean).forEach(line => {
        if (name === 'flow' && line.startsWith('- ')) { slide.items.push(line.slice(2)); return; }
        const match = line.match(/^([\w-]+):\s*(.*)$/);
        if (!match || !allowed[name].includes(match[1])) fail(`Unsupported ${name} field: ${line}`);
        if (match) values[match[1]] = match[2];
      });
      if (name === 'meta') {
        slide.title = values.title || ''; slide.label = values.label || ''; slide.footer = values.footer || ''; slide.layout = values.layout || 'auto';
        if (!['auto','stacked','split-left'].includes(slide.layout)) fail('Layout must be auto, stacked, or split-left.');
        if (values.duration) { if (!/^\d+s$/.test(values.duration)) fail('Use a duration such as 12s.'); slide.duration = Number(values.duration.slice(0, -1)); }
      } else { widgets++; slide.type = name as Slide['type']; slide.values = values; }
      return '';
    });
    if (text.includes(':::')) fail('Malformed directive. Close it on its own line with :::.');
    const code = text.match(/```([^\n]*)\n([\s\S]*?)```/);
    if (code) { widgets++; slide.type = 'code'; slide.values = { language: code[1], code: code[2].trim() }; text = text.replace(code[0], ''); if (code[2].split('\n').length > 12) fail('Shorten code to 12 lines or split this slide.'); }
    const headings = text.match(/^# .+$/gm) || [];
    if (headings.length !== 1) fail('Each slide needs exactly one # heading.');
    const heading = headings[0]!;
    slide.heading = heading.slice(2); text = text.replace(heading, '').trim();
    if (slide.heading.length > 115) fail('Shorten the headline to 115 characters or split the slide.');
    if ((slide.heading.match(/==/g)?.length || 0) % 2) fail('Close the ==highlight== span.');
    const steps = text.match(/^\d+\. .+$/gm);
    if (steps) { widgets++; slide.type = 'steps'; slide.items = steps.map(s => s.replace(/^\d+\. /, '')); text = text.replace(/^\d+\. .+$/gm, '').trim(); if (steps.length > 5) fail('Use at most five steps.'); }
    const image = text.match(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/);
    if (image) { widgets++; slide.type = 'image'; slide.values = { alt: image[1], src: image[2], caption: image[3] || '' }; text = text.replace(image[0], '').trim(); if (!/^(data:image\/(png|jpeg|webp);base64,|https:\/\/|\/images\/)/.test(image[2])) fail('Use an HTTPS image URL or embedded image data.'); }
    if (widgets > 1) fail('Use one supporting widget per slide.');
    if (slide.type === 'flow') { const starts = (slide.values.starts || '').replace(/^\[|\]$/g, '').split(',').filter(Boolean); if (starts.length < 1 || starts.length > 2 || slide.items.length > 4) fail('A flow needs one or two starts and at most four following boxes.'); }
    if (slide.type === 'agent-chat' && !/^[a-zA-Z0-9_-]+$/.test(slide.values.profile || '')) fail('Provide a named agent profile.');
    if (text.length > 320 || slide.items.some(i => i.length > 95) || Object.values(slide.values).some(v => v.length > 450 && !v.startsWith('data:image'))) fail('Supporting content is too long. Shorten it or split the slide.');
    slide.body = text; return slide;
  });
  if (!slides.length) throw new Error('Add a slide with a # headline.');
  if (slides.length > 40) throw new Error('Use at most 40 slides per deck.');
  return { title, duration: Math.max(2, Math.min(120, duration)), loop, slides };
}

export function downloadFile(content: string, filename: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const artSlide: Slide = { title: 'A little atmosphere', label: 'Visual experiment', footer: 'The idea stays clear. The movement is optional.', heading: 'A little motion.\n==A lasting impression.==', body: 'Big shapes. Quiet movement. Nothing to compete with your message.', type: 'art', values: {}, items: [], layout: 'split-left' };

export async function exportDeck(element: HTMLElement, css: string, deck: Deck, motion: boolean) {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const image of Array.from(clone.querySelectorAll('img'))) {
    const response = await fetch(image.src); if (!response.ok) throw new Error('Could not embed an image. Check its URL and try again.');
    const blob = await response.blob();
    image.src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
  }
  const config = JSON.stringify({ duration: deck.duration, loop: deck.loop, durations: deck.slides.map(s => s.duration || deck.duration) });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${deck.title.replace(/[<>&"]/g, '')}</title><style>${css}html,body{margin:0;background:#111310;width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif}.portable-slide{display:none;width:100vw;height:100dvh;container-type:inline-size}.portable-slide.active{display:block}.portable-slide .slide{height:100%;border-radius:0}.portable-slide.active .slide{${motion ? 'animation:slide-enter .3s ease-out' : 'animation:none'}}#notice{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#fff;color:#111;padding:12px 20px;border-radius:8px;z-index:5}#notice:empty{display:none}</style></head><body>${clone.innerHTML}<div id="notice" role="status"></div><script>const config=${config};const slides=[...document.querySelectorAll('.portable-slide')];let index=0,timer,playing=false,last=0,total=0,gesture;const show=()=>{slides.forEach((s,i)=>s.classList.toggle('active',i===index));schedule()};const pause=()=>{playing=false;clearTimeout(timer)};const schedule=()=>{clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(index===slides.length-1&&!config.loop){pause();return}index=(index+1)%slides.length;show()},config.durations[index]*1000)};const move=d=>{pause();index=Math.max(0,Math.min(slides.length-1,index+d));show()};document.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229||e.target.closest('input,textarea,button'))return;if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();move(1)}if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();move(-1)}if(e.key.toLowerCase()==='p'){playing=!playing;schedule();const n=document.querySelector('#notice');n.textContent=playing?'Autoscroll on':'Autoscroll off';setTimeout(()=>n.textContent='',1800)}});document.addEventListener('click',pause);document.addEventListener('wheel',e=>{e.preventDefault();clearTimeout(gesture);gesture=setTimeout(()=>{last=0;total=0},220);if(last)return;total+=e.deltaY;if(Math.abs(total)>60){move(Math.sign(total));last=Date.now();total=0}},{passive:false});show();<\/script></body></html>`;
  downloadFile(html, 'kiosk-slides.html', 'text/html');
}
