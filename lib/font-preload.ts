import { EXTENDED_TEXT, fonts } from './presentation'
import { STORAGE_KEY } from './presentations'
import { SHARE_PREFIX } from './share'

export function fontPreloadScript() {
  const files = Object.fromEntries(
    fonts
      .filter(f => f.files.length)
      .map(f => [
        f.id,
        ['core', 'extended'].map(
          role => `/fonts/${f.files.find(file => file.role === role)!.file}`,
        ),
      ]),
  )
  const config = JSON.stringify({
    key: STORAGE_KEY,
    share: SHARE_PREFIX,
    files,
    extended: EXTENDED_TEXT.source,
  })
  return `(()=>{try{const c=${config};if(location.hash.startsWith(c.share))return;const l=JSON.parse(localStorage.getItem(c.key));const s=(l.items.find(p=>p.id===l.current)||l.items[0]).source.replace(/\\r/g,'');const front=/^---\\n([\\s\\S]*?)\\n---/.exec(s);const font=front&&/^font:(.*)$/m.exec(front[1]);const files=font&&c.files[font[1].trim().toLowerCase().replace(/\\s+/g,'-')];if(!files)return;const link=document.createElement('link');link.rel='preload';link.as='font';link.type='font/woff2';link.crossOrigin='anonymous';link.href=files[new RegExp(c.extended,'u').test(s+s.toUpperCase())?1:0];document.head.append(link)}catch{}})()`
}
