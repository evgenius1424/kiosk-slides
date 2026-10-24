import type { Font, FontFile } from '@/lib/presentation/look'

export type LabTheme = {
  id: string
  name: string
  className: string
  font: string
  tone: string
  candidate: boolean
}

export const labThemes: LabTheme[] = [
  current('room-dark', 'Dark', 'classic', '#a594ff'),
  current('room-light', 'Light', 'classic', '#c8392b'),
  current('studio', 'Studio', 'classic', '#5fe3d6'),
  candidate('swiss', 'Swiss Editorial', 'inter', '#e1251b'),
  candidate('soft', 'Soft Architectural', 'figtree', '#55786f'),
  candidate('bold', 'Bold Graphic', 'archivo-expanded', '#ff5b1f'),
  candidate('editorial', 'Warm Editorial', 'literata', '#9a3324'),
  candidate('technical', 'Technical Minimal', 'space-grotesk', '#2457f5'),
]

export const labFonts: Font[] = [
  {
    id: 'literata',
    name: 'Literata',
    stack: "'Literata',Georgia,serif",
    width: 0.58,
    cyrillicWidth: 0.66,
    files: [
      { family: 'Literata', file: 'literata.woff2', weights: '200 900', script: 'latin' },
      {
        family: 'Literata',
        file: 'literata-cyrillic.woff2',
        weights: '200 900',
        script: 'cyrillic',
      },
    ],
  },
]

export const labFiles: FontFile[] = [
  ...labFonts.flatMap(f => f.files),
  { family: 'JetBrains Mono', file: 'jetbrains-mono.woff2', weights: '100 800', script: 'latin' },
]

export const labItalics = [
  { file: 'literata-italic.woff2', range: 'U+0000-024F,U+2000-206F,U+2212' },
  { file: 'literata-italic-cyrillic.woff2', range: 'U+0400-045F,U+0490-0491' },
]

const MONO = "'JetBrains Mono',ui-monospace,Menlo,monospace"

const swiss = `
.slide.swiss{--slide-bg:#f4f2ec;--slide-text:#111111;--slide-muted:#57554f;--slide-surface:#e8e5dc;--slide-line:#cdc9bd;--slide-accent:#111111;--slide-highlight:var(--slide-tone);--slide-wash:var(--slide-bg)}
.slide.swiss::before{content:none}
.slide.swiss .slide-meta{position:relative;color:var(--slide-text);font-weight:600;letter-spacing:.06em}
.slide.swiss .slide-meta::after{content:'';position:absolute;left:0;right:0;bottom:-1.1cqw;height:.22cqw;background:var(--slide-text)}
.slide.swiss .label-dot{display:inline-block;width:.85cqw;height:.85cqw;margin-right:.8cqw;background:var(--slide-highlight);vertical-align:-.05cqw}
.slide.swiss .slide-footer{position:relative}
.slide.swiss .slide-footer::before{content:'';position:absolute;left:0;right:0;top:-1.1cqw;height:1px;background:var(--slide-line)}
.slide.swiss h2{font-weight:650}
.slide.swiss h2 strong{font-weight:650}
.slide.swiss.kind-message::after{content:'';position:absolute;z-index:-1;inset:0 5cqw;background:repeating-linear-gradient(90deg,transparent 0 calc(90cqw/6 - 1px),color-mix(in srgb,var(--slide-text) 7%,transparent) calc(90cqw/6 - 1px) calc(90cqw/6));pointer-events:none}
.slide.swiss .widget-label{color:var(--slide-text);font-weight:700;letter-spacing:.06em}
.slide.swiss .comparison{gap:4cqw}
.slide.swiss .comparison section{background:none;border:0;border-top:.22cqw solid var(--slide-text);border-radius:0;padding:2cqw 0 0}
.slide.swiss .comparison .comparison-after{border-top-color:var(--slide-highlight);box-shadow:none}
.slide.swiss .comparison-after .widget-label{color:var(--slide-highlight)}
.slide.swiss .slide-steps li,.slide.swiss .slide-bullets li,.slide.swiss .slide-checklist li{position:relative}
.slide.swiss .slide-steps li+li::after,.slide.swiss .slide-bullets li+li::after,.slide.swiss .slide-checklist li+li::after{content:'';position:absolute;left:0;right:0;top:calc(-.85cqw*var(--text-fit,1));height:1px;background:var(--slide-line)}
.slide.swiss .slide-steps li span{color:var(--slide-highlight);font-weight:700}
.slide.swiss .slide-bullets li::before{width:.8cqw;height:.8cqw;border-radius:0;transform:translateY(-.2cqw)}
.slide.swiss .slide-checklist li>span{border-radius:0;border-color:var(--slide-text)}
.slide.swiss .slide-quote{border-left-width:.5cqw}
.slide.swiss .code-frame{border:0;border-top:.22cqw solid var(--slide-text);border-radius:0;background:var(--slide-surface)}
.slide.swiss .code-frame>div{border-bottom-color:var(--slide-line);color:var(--slide-text);text-transform:uppercase;letter-spacing:.08em;font-weight:600}
.slide.swiss .code-dots{visibility:hidden}
.slide.swiss .slide-table{background:none;border:0;border-top:.22cqw solid var(--slide-text);border-radius:0}
.slide.swiss .slide-table th{color:var(--slide-text);font-weight:700;border-bottom-color:var(--slide-text)}
.slide.swiss .slide-table th,.slide.swiss .slide-table td{padding-left:0}
.slide.swiss .slide-table td{font-variant-numeric:tabular-nums}
.slide.swiss .chart-bar{rx:0}
.slide.swiss .chart-axis{stroke:var(--slide-text)}
.slide.swiss .slide-chart .s1{color:var(--slide-text)}
.slide.swiss .slide-chart .s2{color:#8f8b80}
.slide.swiss .slide-chart .s3{color:#c3beb1}
.slide.swiss .chart-legend span{border-radius:0}
.slide.swiss .flow-box{background:none;border-color:var(--slide-text);border-radius:0}
.slide.swiss .flow-shared{background:var(--slide-highlight);border-color:var(--slide-highlight);color:#fff;box-shadow:none}
.slide.swiss .slide-buttons a{border-radius:0;border-color:var(--slide-text);background:none}
`

const soft = `
.slide.soft{--slide-bg:#ebeae6;--slide-text:#22262a;--slide-muted:#5e646a;--slide-surface:color-mix(in srgb,#ffffff 62%,var(--slide-bg));--slide-line:#d6d6d1;--slide-accent:#22262a;--slide-highlight:color-mix(in oklab,var(--slide-tone) 88%,#000);--slide-wash:var(--slide-bg)}
.slide.soft::before{-webkit-mask-size:200% 220%;mask-size:200% 220%;-webkit-mask-position:0 0;mask-position:0 0;opacity:.9}
.slide.soft::after{content:'';position:absolute;z-index:-1;width:62cqw;height:62cqw;right:-20cqw;bottom:-36cqw;border-radius:50%;background:color-mix(in srgb,var(--slide-tone) 7%,var(--slide-bg));outline:1px solid color-mix(in srgb,var(--slide-tone) 18%,var(--slide-bg));outline-offset:3.2cqw;pointer-events:none}
.slide.soft.kind-message::after{width:78cqw;height:78cqw;right:-26cqw;bottom:-44cqw}
.slide.soft:is(.kind-table,.kind-code,.kind-chart,.kind-before-after)::after{width:44cqw;height:44cqw;right:-22cqw;bottom:-30cqw;opacity:.7}
.slide.soft .slide-meta{letter-spacing:.16em;font-weight:500}
.slide.soft h2{font-weight:600}
.slide.soft .comparison section,.slide.soft .flow-box,.slide.soft .slide-buttons a{border-radius:1.2cqw;border-color:color-mix(in srgb,var(--slide-line) 70%,transparent);box-shadow:0 .15cqw .6cqw rgb(30 34 38/.04)}
.slide.soft .comparison .comparison-after,.slide.soft .flow-shared{border-color:color-mix(in srgb,var(--slide-highlight) 45%,transparent);box-shadow:0 .15cqw .6cqw rgb(30 34 38/.05);background:color-mix(in srgb,#ffffff 78%,var(--slide-bg))}
.slide.soft .comparison-after .widget-label{color:var(--slide-highlight)}
.slide.soft .slide-bullets li::before{width:.7cqw;height:.7cqw;border-radius:50%;transform:translateY(-.25cqw)}
.slide.soft .slide-steps li span{color:var(--slide-highlight)}
.slide.soft .slide-checklist li>span{border-radius:50%;border-color:color-mix(in srgb,var(--slide-muted) 55%,transparent)}
.slide.soft .slide-quote{border-left-width:.2cqw}
.slide.soft .code-frame,.slide.soft .slide-table{border-radius:1.2cqw;border-color:color-mix(in srgb,var(--slide-line) 70%,transparent);box-shadow:0 .15cqw .6cqw rgb(30 34 38/.04)}
.slide.soft .code-frame>div{border-bottom-color:color-mix(in srgb,var(--slide-line) 70%,transparent)}
.slide.soft .code-dots{opacity:.45}
.slide.soft .slide-table td{border-top-color:color-mix(in srgb,var(--slide-line) 70%,transparent)}
.slide.soft .chart-bar{rx:1.5cqw}
.slide.soft .chart-axis{stroke:color-mix(in srgb,var(--slide-line) 80%,var(--slide-text))}
.slide.soft .chart-legend span{border-radius:50%}
`

const bold = `
.slide.bold{--slide-bg:var(--slide-tone);--slide-text:#0c0c0c;--slide-muted:color-mix(in srgb,#0c0c0c 74%,var(--slide-tone));--slide-surface:color-mix(in srgb,#000 11%,var(--slide-tone));--slide-line:#0c0c0c;--slide-accent:#ffffff;--slide-highlight:#ffffff;--slide-wash:var(--slide-bg)}
.slide.bold::before{content:none}
.slide.bold::after{content:'';position:absolute;z-index:-1;width:40cqw;height:40cqw;right:-12cqw;top:-14cqw;border-radius:50%;background:color-mix(in srgb,#000 9%,var(--slide-tone));pointer-events:none}
.slide.bold.kind-message::after{width:64cqw;height:64cqw;right:-16cqw;top:auto;bottom:-30cqw}
.slide.bold:is(.kind-table,.kind-code,.kind-chart)::after{width:24cqw;height:24cqw;right:-10cqw;top:-12cqw}
.slide.bold .slide-meta{color:var(--slide-text);font-weight:700}
.slide.bold h2{font-weight:800;letter-spacing:-.062em}
.slide.bold h2 strong{font-weight:800}
.slide.bold .slide-body{color:var(--slide-text)}
.slide.bold .slide-footer{color:var(--slide-text)}
.slide.bold .widget-label{color:var(--slide-text);font-weight:700}
.slide.bold .comparison section{border:0;border-radius:0}
.slide.bold .comparison .comparison-after{background:#0c0c0c;color:#ffffff;box-shadow:none}
.slide.bold .comparison-after .widget-label{color:var(--slide-tone)}
.slide.bold .slide-steps li span{display:inline-flex;align-items:center;justify-content:center;height:3cqw;background:#0c0c0c;color:var(--slide-tone);font-weight:800}
.slide.bold .slide-bullets li::before{width:.9cqw;height:.9cqw;border-radius:0;background:#0c0c0c;transform:translateY(-.15cqw)}
.slide.bold .slide-checklist li>span{border-radius:0;border-color:#0c0c0c}
.slide.bold .slide-checklist li.done>span{background:#0c0c0c;border-color:#0c0c0c;color:var(--slide-tone)}
.slide.bold .slide-checklist li.done{color:var(--slide-muted)}
.slide.bold .slide-quote{border-left:.6cqw solid #0c0c0c}
.slide.bold .slide-quote figcaption{color:var(--slide-text);font-weight:700}
.slide.bold .code-frame{border:0;border-radius:0;background:#0c0c0c}
.slide.bold .code-frame>div{border-bottom-color:#2a2a2a;color:var(--slide-tone);font-weight:700;text-transform:uppercase}
.slide.bold .code-dots{visibility:hidden}
.slide.bold .slide-table{border:0;border-radius:0}
.slide.bold .slide-table th{background:#0c0c0c;color:var(--slide-tone);font-weight:700;border:0}
.slide.bold .slide-table td{border-top-color:color-mix(in srgb,#000 22%,var(--slide-tone));font-variant-numeric:tabular-nums}
.slide.bold .chart-bar{rx:0}
.slide.bold .chart-axis{stroke:#0c0c0c;stroke-width:3}
.slide.bold .chart-label{fill:#0c0c0c}
.slide.bold .chart-legend{color:var(--slide-text)}
.slide.bold .chart-point{stroke:var(--slide-tone)}
.slide.bold .slide-chart .s0{color:#0c0c0c}
.slide.bold .slide-chart .s1{color:#ffffff}
.slide.bold .slide-chart .s2{color:color-mix(in srgb,#000 40%,var(--slide-tone))}
.slide.bold .slide-chart .s3{color:color-mix(in srgb,#fff 50%,var(--slide-tone))}
.slide.bold .chart-legend span{border-radius:0}
.slide.bold .flow-box{border:0;border-radius:0}
.slide.bold .flow-shared{background:#0c0c0c;color:#ffffff;box-shadow:none}
.slide.bold .flow-arrow{color:#0c0c0c;font-weight:800}
.slide.bold .slide-buttons a{border:0;border-radius:0;background:#0c0c0c;color:#ffffff}
.slide.bold .slide-buttons a::after{color:var(--slide-tone)}
`

const editorial = `
.slide.editorial{--slide-bg:#f3ede1;--slide-text:#1f1b16;--slide-muted:#685f54;--slide-surface:#ebe3d3;--slide-line:#cdc2ad;--slide-accent:#1f1b16;--slide-highlight:var(--slide-tone);--slide-wash:var(--slide-bg)}
.slide.editorial::before{-webkit-mask:none;mask:none;background:url("data:image/svg+xml,${grain(0.05)}");opacity:1}
.slide.editorial .slide-meta{position:relative;letter-spacing:.16em;font-weight:500}
.slide.editorial .slide-meta::after{content:'';position:absolute;left:0;right:0;bottom:-1.1cqw;height:3px;border-top:1px solid var(--slide-line);border-bottom:1px solid var(--slide-line)}
.slide.editorial .slide-footer{position:relative;font-style:italic}
.slide.editorial .slide-footer::before{content:'';position:absolute;left:0;right:0;top:-1.1cqw;height:1px;background:var(--slide-line)}
.slide.editorial .slide-brand{font-style:normal;letter-spacing:-.04em}
.slide.editorial h2{font-weight:500;font-variant-numeric:lining-nums}
.slide.editorial h2 strong{font-style:italic;font-weight:500}
.slide.editorial .slide-body{font-variant-numeric:oldstyle-nums}
.slide.editorial .widget-label{letter-spacing:.14em}
.slide.editorial .comparison{gap:4cqw}
.slide.editorial .comparison section{background:none;border:0;border-top:1px solid var(--slide-text);border-radius:0;padding:2cqw 0 0}
.slide.editorial .comparison .comparison-after{border-top:2px solid var(--slide-highlight);box-shadow:none}
.slide.editorial .comparison-after .widget-label{color:var(--slide-highlight)}
.slide.editorial .comparison p{font-size:calc(2.1cqw*var(--text-fit,1))}
.slide.editorial .slide-steps li span{color:var(--slide-highlight);font-style:italic;font-size:2cqw}
.slide.editorial .slide-bullets li::before{height:1px;background:var(--slide-highlight);transform:translateY(-.7cqw)}
.slide.editorial .slide-checklist li>span{border-radius:0;border-width:1px;border-color:var(--slide-text)}
.slide.editorial .slide-quote{position:relative;border:0;padding-left:2.4cqw}
.slide.editorial .slide-quote::before{content:'\\201C';position:absolute;left:-2.2cqw;top:-.1em;font-size:9cqw;line-height:1;color:var(--slide-highlight)}
.slide.editorial .slide-quote blockquote{font-style:italic;font-weight:400}
.slide.editorial .code-frame{border-color:var(--slide-line);border-radius:.2cqw}
.slide.editorial .code-frame>div{font-style:italic}
.slide.editorial .code-dots{visibility:hidden}
.slide.editorial .slide-table{background:none;border:0;border-top:2px solid var(--slide-text);border-bottom:2px solid var(--slide-text);border-radius:0}
.slide.editorial .slide-table th{color:var(--slide-text);border-bottom-color:var(--slide-text)}
.slide.editorial .slide-table th,.slide.editorial .slide-table td{padding-left:0}
.slide.editorial .slide-table td{font-variant-numeric:tabular-nums lining-nums}
.slide.editorial .slide-metric strong{font-weight:400;font-style:italic;letter-spacing:-.04em}
.slide.editorial .slide-metric>span{font-style:italic}
.slide.editorial .chart-bar{rx:0}
.slide.editorial .chart-axis{stroke:var(--slide-text);stroke-width:1.5}
.slide.editorial .chart-line{stroke-width:3}
.slide.editorial .chart-label{font-style:italic}
.slide.editorial .slide-chart .s1{color:var(--slide-text)}
.slide.editorial .slide-chart .s2{color:#9a8f7f}
.slide.editorial .slide-chart .s3{color:#c9bea9}
.slide.editorial .flow-box{background:none;border-color:var(--slide-text);border-radius:0}
.slide.editorial .flow-shared{border-color:var(--slide-highlight);box-shadow:0 0 0 1px var(--slide-highlight);color:var(--slide-highlight);font-style:italic}
.slide.editorial .slide-buttons a{background:none;border:0;border-bottom:1px solid var(--slide-text);border-radius:0;padding-left:0;padding-right:0}
`

const technical = `
.slide.technical{--slide-bg:#f1f2f4;--slide-text:#0d1117;--slide-muted:#565e69;--slide-surface:#ffffff;--slide-line:#d3d7dd;--slide-accent:#0d1117;--slide-highlight:var(--slide-tone);--slide-wash:var(--slide-bg);--lab-mono:${MONO}}
.slide.technical::before{-webkit-mask:none;mask:none;background:linear-gradient(90deg,color-mix(in srgb,var(--slide-text) 6%,transparent) 1px,transparent 1px) 5cqw 0/5cqw 5cqw,linear-gradient(color-mix(in srgb,var(--slide-text) 6%,transparent) 1px,transparent 1px) 0 3.5cqw/5cqw 5cqw}
.slide.technical:is(.kind-table,.kind-code,.kind-chart,.kind-before-after)::before{opacity:.5}
.slide.technical::after{content:'';position:absolute;z-index:-1;inset:1.6cqw 2.2cqw;pointer-events:none;--c:color-mix(in srgb,var(--slide-text) 45%,transparent);background:linear-gradient(var(--c),var(--c)) 0 .55cqw/1.2cqw 1px no-repeat,linear-gradient(var(--c),var(--c)) .55cqw 0/1px 1.2cqw no-repeat,linear-gradient(var(--c),var(--c)) 100% .55cqw/1.2cqw 1px no-repeat,linear-gradient(var(--c),var(--c)) calc(100% - .55cqw) 0/1px 1.2cqw no-repeat,linear-gradient(var(--c),var(--c)) 0 calc(100% - .55cqw)/1.2cqw 1px no-repeat,linear-gradient(var(--c),var(--c)) .55cqw 100%/1px 1.2cqw no-repeat,linear-gradient(var(--c),var(--c)) 100% calc(100% - .55cqw)/1.2cqw 1px no-repeat,linear-gradient(var(--c),var(--c)) calc(100% - .55cqw) 100%/1px 1.2cqw no-repeat}
.slide.technical .slide-meta{font-family:var(--lab-mono);font-size:1.3cqw;letter-spacing:.04em}
.slide.technical .slide-label{font-size:1.2cqw}
.slide.technical .slide-label::before{content:'[ ';color:var(--slide-highlight)}
.slide.technical .slide-label::after{content:' ]';color:var(--slide-highlight)}
.slide.technical h2 code{font-family:var(--lab-mono)}
.slide.technical .slide-content code{font-family:var(--lab-mono)}
.slide.technical .widget-label{font-family:var(--lab-mono);font-size:1.25cqw;letter-spacing:.04em}
.slide.technical .comparison section,.slide.technical .flow-box{border-radius:.25cqw}
.slide.technical .comparison .comparison-after,.slide.technical .flow-shared{border-color:var(--slide-highlight);box-shadow:inset .3cqw 0 0 var(--slide-highlight)}
.slide.technical .comparison-after .widget-label{color:var(--slide-highlight)}
.slide.technical .flow-box{font-family:var(--lab-mono);font-size:1.7cqw}
.slide.technical .flow-arrow{font-family:var(--lab-mono)}
.slide.technical .slide-steps li span{font-family:var(--lab-mono);color:var(--slide-highlight);font-size:1.5cqw}
.slide.technical .slide-bullets li::before{width:.6cqw;height:.6cqw;border-radius:0;transform:translateY(-.3cqw)}
.slide.technical .slide-checklist li>span{border-radius:.15cqw;border-color:color-mix(in srgb,var(--slide-muted) 55%,transparent)}
.slide.technical .slide-quote{border-left-width:.25cqw}
.slide.technical .slide-quote figcaption{font-family:var(--lab-mono);font-size:1.3cqw}
.slide.technical .code-frame{border:0;border-radius:.3cqw;background:#0d1117}
.slide.technical .code-frame>div{border-bottom-color:#232a33;color:#8b949e;font-family:var(--lab-mono);font-size:1.3cqw}
.slide.technical .code-dots{visibility:hidden}
.slide.technical .code-frame pre{font-variant-ligatures:none;color:#e6edf3;font-family:var(--lab-mono);font-size:1.75cqw}
.slide.technical .slide-table{border-radius:.25cqw}
.slide.technical .slide-table th{font-family:var(--lab-mono);font-size:calc(var(--table-size,2cqw)*.62);letter-spacing:.04em;background:color-mix(in srgb,var(--slide-bg) 50%,#fff)}
.slide.technical .slide-table td{font-variant-numeric:tabular-nums}
.slide.technical .slide-metric strong{font-family:var(--lab-mono);font-weight:500;letter-spacing:-.06em}
.slide.technical .chart-bar{rx:0}
.slide.technical .chart-axis{stroke:var(--slide-text);stroke-width:1.5}
.slide.technical .chart-line{stroke-width:3}
.slide.technical .chart-point{r:5}
.slide.technical .chart-label{font-family:var(--lab-mono);font-size:17px}
.slide.technical .chart-legend{font-family:var(--lab-mono);font-size:1.4cqw}
.slide.technical .chart-legend span{border-radius:0}
.slide.technical .slide-chart .s1{color:var(--slide-text)}
.slide.technical .slide-chart .s2{color:#8a929d}
.slide.technical .slide-chart .s3{color:#c3c8cf}
.slide.technical .slide-buttons a{border-radius:.25cqw;font-family:var(--lab-mono);font-weight:500}
`

const fontTweaks = `
.frame[data-font=literata] .slide h2{letter-spacing:-.025em}
.frame[data-font=literata] :is(.slide-meta,.slide-footer,.slide-table th,.chart-legend,.widget-label,.slide-metric>span){line-height:1.15}
`

export const labStyles = fontTweaks + swiss + soft + bold + editorial + technical

function current(id: string, name: string, font: string, tone: string): LabTheme {
  return { id, name, className: id, font, tone, candidate: false }
}

function candidate(id: string, name: string, font: string, tone: string): LabTheme {
  return { id, name, className: id, font, tone, candidate: true }
}

function grain(alpha: number) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35 0 0 0 0 .27 0 0 0 0 .16 0 0 0 ${alpha * 9} -${alpha * 4}'/></filter><rect width='240' height='240' filter='url(%23g)'/></svg>`
}
