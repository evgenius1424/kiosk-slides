import { PILL_LINE_HEIGHT } from '@/lib/presentation'
import { transitionStyles } from './player'

const PILL_HEIGHT = '1.08em'

const PILL_SHIFT: Record<string, number> = {
  classic: 0.05,
  inter: 0.065,
  figtree: 0.05,
  'bricolage-grotesque': 0.03,
  'space-grotesk': 0.045,
  'archivo-expanded': 0.035,
  'golos-text': 0.08,
  literata: 0.135,
}

export const slideStyles =
  `
.slide,.slide-backdrop{--slide-glow:${glow(0.8, 0.65, -0.05, 0.06)};position:relative;isolation:isolate}.slide.studio,.slide-backdrop.studio{--slide-glow:${glow(0.62, 0.75, -0.2, 0.14)}}.slide::before,.slide-backdrop::before{content:'';position:absolute;inset:0;z-index:-1;background:var(--slide-tone);-webkit-mask:var(--slide-glow) 0 0/100% 100% no-repeat;mask:var(--slide-glow) 0 0/100% 100% no-repeat;pointer-events:none}.slide-backdrop .slide::before{content:none}
.slide{--slide-accent:#ffffff;--slide-tone:#ffffff;--slide-highlight:color-mix(in oklab,var(--slide-tone) 85%,#fff);--slide-wash:color-mix(in srgb,var(--slide-bg) 95%,var(--slide-tone));--slide-bg:#121214;--slide-text:#fafafa;--slide-muted:#b4b4bd;--slide-surface:#242428;--slide-line:#3f3f46;display:flex;flex-direction:column;justify-content:space-between;width:100%;height:100%;padding:3.5cqw 5cqw;background:var(--slide-wash);color:var(--slide-text);overflow:hidden;box-sizing:border-box;font-family:var(--slide-font,Arial,Helvetica,sans-serif)}
.slide *{box-sizing:border-box}.slide.room-light{--slide-bg:#fafafa;--slide-text:#18181b;--slide-muted:#52525b;--slide-surface:#f0f0f2;--slide-line:#d4d4d8;--slide-accent:#09090b;--slide-highlight:color-mix(in oklab,var(--slide-tone) 85%,#000);--slide-wash:color-mix(in srgb,var(--slide-bg) 97%,var(--slide-tone))}.slide.studio{--slide-bg:#000000;--slide-text:#ffffff;--slide-muted:#8f8f96;--slide-surface:#141416;--slide-line:#2c2c30;--slide-accent:#ffffff;--slide-highlight:color-mix(in oklab,var(--slide-tone) 90%,#fff);--slide-wash:var(--slide-bg)}
.slide-meta{text-transform:uppercase;letter-spacing:.12em;display:flex;align-items:center;justify-content:space-between;font-size:1.5cqw;font-weight:500;color:var(--slide-muted)}.slide-label{font-size:1.3cqw}.label-dot{display:none}.slide-content{display:flex;flex-direction:column;justify-content:center;flex:1;padding:2.5cqw 0;gap:2.5cqw;min-height:0}.slide h2{margin:0;font-size:6.5cqw;line-height:1.08;letter-spacing:-.05em;font-weight:600;max-width:80cqw;text-wrap:balance;white-space:pre-line}.slide .opening{letter-spacing:0}.slide .closing{margin-left:.05em}.slide .dash{letter-spacing:0;margin:0 .04em 0 .1em}.slide h2 strong{font-weight:750;color:var(--slide-highlight)}.slide h2 code{font-family:ui-monospace,Menlo,monospace;font-size:.85em;letter-spacing:-.02em}.slide h2 a{color:inherit;text-decoration-thickness:.06em;text-underline-offset:.12em}.slide-body{font-size:calc(2.2cqw*var(--text-fit,1));line-height:1.5;margin:calc(2.5cqw*var(--text-fit,1)) 0 0;color:var(--slide-muted);white-space:pre-line;max-width:75cqw}.slide-footer{display:flex;align-items:center;justify-content:space-between;gap:3cqw;font-size:1.4cqw;color:var(--slide-muted);line-height:1.4}.slide-brand{flex-shrink:0;color:var(--slide-text);font-size:2cqw;font-weight:700;line-height:1;letter-spacing:-.08em;padding-right:.08em;white-space:nowrap}.slide-brand.custom{letter-spacing:-.03em;padding-right:.03em}.brand-period{color:var(--slide-accent)}
.kind-before-after h2,.kind-steps h2,.kind-flow h2{font-size:5cqw}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:2cqw}.comparison section{padding:2cqw;background:var(--slide-surface);border:1px solid var(--slide-line);border-radius:.5cqw}.comparison .comparison-after,.flow-shared{border-color:var(--slide-highlight);box-shadow:0 0 0 1px var(--slide-highlight)}.widget-label{text-transform:uppercase;letter-spacing:.1em;font-size:1.4cqw;color:var(--slide-muted)}.comparison p{font-size:calc(2.1cqw*var(--text-fit,1));line-height:1.4;margin:1cqw 0 0}.slide-steps{padding:0;margin:0;list-style:none;display:flex;flex-direction:column;gap:calc(1.7cqw*var(--text-fit,1))}.slide-steps li{display:flex;align-items:center;gap:1.5cqw;font-size:calc(2.2cqw*var(--text-fit,1));line-height:1.4}.slide-steps li span{font-size:1.6cqw;color:var(--slide-muted);width:3cqw;flex-shrink:0}.slide-flow{display:flex;flex-direction:column;gap:1.6cqw}.flow-line{display:flex;align-items:center;gap:1cqw}.flow-box{border:1px solid var(--slide-line);background:var(--slide-surface);padding:1.4cqw;border-radius:.5cqw;font-size:1.9cqw;margin:0;text-align:center}.flow-arrow{font-size:2cqw;color:var(--slide-muted)}
.kind-code .slide-content{flex-direction:row;align-items:center;gap:4cqw}.kind-code .slide-message{flex:1;min-width:0}.kind-code h2{font-size:5.4cqw}.code-frame{width:50%;border:1px solid var(--slide-line);border-radius:.6cqw;background:var(--slide-surface);overflow:hidden}.code-frame>div{display:flex;justify-content:space-between;padding:1.3cqw;border-bottom:1px solid var(--slide-line);color:var(--slide-muted);font-size:1.4cqw}.code-dots{letter-spacing:.3cqw}.code-frame pre{padding:2cqw;font-size:1.9cqw;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--slide-accent)}.slide-metric{display:flex;align-items:center;gap:3cqw}.slide-metric strong{font-size:12cqw;line-height:1;color:var(--slide-highlight);letter-spacing:-.07em}.slide-metric>span{font-size:calc(2.6cqw*var(--text-fit,1));color:var(--slide-muted);max-width:25cqw}.kind-metric h2{font-size:5cqw}.slide-image{margin:0;max-height:22cqw;text-align:center}.slide-image img{display:block;box-sizing:border-box;margin:0 auto;max-width:100%;max-height:20cqw;object-fit:contain;padding:.8cqw;background:#fff;border-radius:.6cqw}.room-light .slide-image img{border:1px solid var(--slide-line)}.slide-image figcaption{font-size:1.5cqw;color:var(--slide-muted);margin-top:.6cqw}
.kind-table h2{font-size:5cqw}.slide-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--slide-line);border-radius:.5cqw;background:var(--slide-surface);overflow:hidden}.slide-table th{text-align:left;text-transform:uppercase;letter-spacing:.1em;font-size:calc(var(--table-size,2cqw)*.7);font-weight:500;color:var(--slide-muted);padding:calc(var(--table-size,2cqw)*.6) calc(var(--table-size,2cqw)*.8);border-bottom:1px solid var(--slide-line)}.slide-table td{font-size:var(--table-size,2cqw);line-height:1.35;padding:calc(var(--table-size,2cqw)*.5) calc(var(--table-size,2cqw)*.8);border-top:1px solid var(--slide-line)}.slide-table tbody tr:first-child td{border-top:0}
.kind-chart h2{font-size:5cqw}.slide-chart{margin:0;display:flex;flex-direction:column;gap:1cqw}.slide-chart svg{width:100%;max-height:22cqw;overflow:visible}.slide-chart .s0{color:var(--slide-highlight)}.slide-chart .s1{color:color-mix(in srgb,var(--slide-highlight) 60%,transparent)}.slide-chart .s2{color:color-mix(in srgb,var(--slide-highlight) 33%,transparent)}.slide-chart .s3{color:color-mix(in srgb,var(--slide-highlight) 18%,transparent)}.chart-axis{stroke:var(--slide-line);stroke-width:2}.chart-bar{fill:currentColor}.chart-line{fill:none;stroke:currentColor;stroke-width:4;stroke-linejoin:round;stroke-linecap:round}.chart-point{fill:currentColor;stroke:var(--slide-bg);stroke-width:2}.chart-label{fill:var(--slide-muted);font-size:20px}.chart-legend{display:flex;gap:2cqw;padding:0;margin:0;list-style:none;font-size:1.6cqw;color:var(--slide-muted)}.chart-legend span{display:inline-block;width:1.2cqw;height:1.2cqw;margin-right:.6cqw;border-radius:.2cqw;background:currentColor;vertical-align:middle}
.slide-buttons{display:flex;flex-wrap:wrap;gap:1.5cqw}.slide-buttons a{display:inline-flex;align-items:center;gap:1cqw;padding:1.4cqw 2.4cqw;border:1px solid var(--slide-line);border-radius:.6cqw;background:var(--slide-surface);color:var(--slide-highlight);font-size:calc(2.1cqw*var(--text-fit,1));font-weight:650;text-decoration:none}.slide-buttons a::after{content:'↗';color:var(--slide-muted)}.slide-buttons a:hover{border-color:var(--slide-highlight)}
.slide-body strong,.slide-quote strong{color:var(--slide-text);font-weight:650}.slide-content code{font-family:ui-monospace,Menlo,monospace;font-size:.9em}.slide-content p a,.slide-content li a,.slide-content td a{color:inherit;text-underline-offset:.15em}.kind-bullets h2,.kind-checklist h2,.kind-quote h2{font-size:5cqw}.slide-bullets,.slide-checklist{padding:0;margin:0;list-style:none;display:flex;flex-direction:column;gap:calc(1.7cqw*var(--text-fit,1))}.slide-bullets li,.slide-checklist li{display:flex;align-items:baseline;gap:1.8cqw;font-size:calc(2.2cqw*var(--text-fit,1));line-height:1.4}.slide-bullets li::before{content:'';flex-shrink:0;width:1.2cqw;height:.3cqw;border-radius:.2cqw;background:var(--slide-highlight);transform:translateY(-.55cqw)}.slide-checklist li>span{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:2cqw;height:2cqw;border:2px solid var(--slide-line);border-radius:.45cqw;font-size:1.4cqw;font-weight:800;line-height:1;align-self:center}.slide-checklist li.done>span{background:var(--slide-highlight);border-color:var(--slide-highlight);color:var(--slide-bg)}.slide-checklist li.done{color:var(--slide-muted)}.slide-quote{margin:0;padding-left:2.4cqw;border-left:.35cqw solid var(--slide-highlight);max-width:72cqw}.slide-quote blockquote{margin:0;font-size:calc(3.1cqw*var(--text-fit,1));line-height:1.3;letter-spacing:-.02em;font-weight:500;white-space:pre-line}.slide-quote figcaption{margin-top:1.4cqw;text-transform:uppercase;letter-spacing:.1em;font-size:1.4cqw;color:var(--slide-muted)}
.slide.scale-large h2,.slide.scale-hero h2,.slide.heading-fit h2{font-size:var(--heading-size,6.5cqw)}.slide.scale-large h2{max-width:86cqw;line-height:1.05;letter-spacing:-.055em}.scale-large .slide-body{font-size:calc(2.4cqw*var(--text-fit,1));max-width:80cqw}.slide.scale-hero{padding:2.8cqw 4cqw}.scale-hero .slide-meta{font-size:1.3cqw}.scale-hero .slide-label{font-size:1.2cqw}.scale-hero .slide-content{padding:1.5cqw 0}.slide.scale-hero h2{max-width:92cqw;line-height:1;letter-spacing:-.06em}.scale-hero .slide-body{font-size:calc(2.7cqw*var(--text-fit,1));line-height:1.45;max-width:80cqw}.scale-hero .slide-footer{font-size:1.3cqw}.scale-hero .slide-brand{font-size:1.8cqw}.scale-hero .slide-steps li,.scale-hero .slide-bullets li,.scale-hero .slide-checklist li{font-size:calc(2.6cqw*var(--text-fit,1))}.scale-hero .slide-quote blockquote{font-size:calc(3.6cqw*var(--text-fit,1))}.scale-hero .comparison p,.scale-hero .slide-buttons a{font-size:calc(2.4cqw*var(--text-fit,1))}.scale-hero .slide-metric>span{font-size:calc(3cqw*var(--text-fit,1))}


.slide.font-literata h2{letter-spacing:-.025em}.slide.font-literata :is(.slide-meta,.slide-footer,.slide-table th,.chart-legend,.widget-label,.slide-metric>span){line-height:1.15}
${paper()}
${poster()}
${marker()}
${pillShifts()}

.slide-backdrop{--slide-tone:#ffffff;--slide-bg:#121214;--slide-wash:color-mix(in srgb,var(--slide-bg) 95%,var(--slide-tone));background:var(--slide-wash)}.slide-backdrop.room-light{--slide-bg:#fafafa;--slide-wash:color-mix(in srgb,var(--slide-bg) 97%,var(--slide-tone))}.slide-backdrop.studio{--slide-bg:#000000;--slide-wash:var(--slide-bg)}.slide-backdrop.paper{--slide-bg:#f3ede1;--slide-wash:var(--slide-bg)}.slide-backdrop.poster{--slide-bg:var(--slide-tone);--slide-wash:var(--slide-bg)}.slide-backdrop.marker{--slide-bg:#f6f6f3;--slide-wash:var(--slide-bg)}.slide-backdrop:is(.poster,.marker)::before{content:none}.slide-backdrop .slide{background:transparent}

` + transitionStyles

function glow(width: number, height: number, top: number, strength: number) {
  const falloff = [
    [0, 1],
    [12, 0.8],
    [25, 0.58],
    [40, 0.36],
    [55, 0.19],
    [70, 0.08],
    [85, 0.02],
    [100, 0],
  ]
  const stops = falloff
    .map(([at, k]) => `<stop offset='${at}%' stop-color='%23fff' stop-opacity='${k}'/>`)
    .join('')
  const dither = 0.05
  const fade = Math.round(strength * 170)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='none'><radialGradient id='l' cx='0' cy='0' r='1' gradientTransform='translate(.5 ${top}) scale(${width} ${height})'>${stops}</radialGradient><filter id='d' x='0' y='0' width='1' height='1' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.7'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0' result='n'/><feComponentTransfer in='SourceAlpha' result='w'><feFuncA type='linear' slope='${fade}'/></feComponentTransfer><feComposite in='n' in2='w' operator='arithmetic' k1='1' k3='-.5' k4='.5' result='m'/><feComposite in='SourceGraphic' in2='m' operator='arithmetic' k2='${strength}' k3='${dither}' k4='${-dither / 2}'/></filter><rect width='1600' height='900' fill='url(%23l)' filter='url(%23d)'/></svg>`
  return `url("data:image/svg+xml,${svg}")`
}

function paper() {
  const grain = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35 0 0 0 0 .27 0 0 0 0 .16 0 0 0 .45 -.2'/></filter><rect width='240' height='240' filter='url(%23g)'/></svg>`
  return `.slide.paper{--slide-bg:#f3ede1;--slide-text:#1f1b16;--slide-muted:#685f54;--slide-surface:#ebe3d3;--slide-line:#cdc2ad;--slide-accent:#1f1b16;--slide-highlight:color-mix(in oklab,var(--slide-tone) 94%,#000);--slide-wash:var(--slide-bg)}
.slide.paper::before,.slide-backdrop.paper::before{-webkit-mask:none;mask:none;background:url("data:image/svg+xml,${grain}")}
.paper .slide-meta{letter-spacing:.16em}.paper .slide-footer{font-style:italic}.paper .slide-brand{font-style:normal;letter-spacing:-.04em}
.slide.paper h2{font-weight:500;font-variant-numeric:lining-nums}.slide.paper h2 strong{font-style:italic;font-weight:500}.paper .slide-body{font-variant-numeric:oldstyle-nums}
.paper .widget-label{letter-spacing:.14em}.paper .comparison section,.paper .flow-box,.paper .code-frame,.paper .slide-buttons a{border:0;border-radius:.4cqw}.paper .comparison .comparison-after,.paper .flow-shared{box-shadow:none}.paper .comparison-after .widget-label,.paper .flow-shared{color:var(--slide-highlight);font-style:italic}
.paper .slide-steps li span{color:var(--slide-highlight);font-style:italic;font-size:2cqw}.paper .slide-bullets li::before{height:.15cqw;transform:translateY(-.7cqw)}.paper .slide-checklist li>span{border-radius:0;border-width:1px;border-color:var(--slide-text)}.paper .slide-checklist li.done>span{color:var(--slide-bg)}
.paper .slide-quote{position:relative;border:0}.paper .slide-quote::before{content:'\\201C';position:absolute;left:-2.2cqw;top:-.1em;font-size:9cqw;line-height:1;color:var(--slide-highlight)}.paper .slide-quote blockquote{font-style:italic;font-weight:400}
.paper .code-frame>div{border:0;font-style:italic}.paper .code-dots{visibility:hidden}
.paper .slide-table{background:none;border:0;border-radius:0}.paper .slide-table th{color:var(--slide-text);border:0}.paper .slide-table td{border:0;font-variant-numeric:tabular-nums lining-nums}.paper .slide-table tbody tr:nth-child(odd) td{background:var(--slide-surface)}.paper .slide-table tbody td:first-child{border-radius:.4cqw 0 0 .4cqw}.paper .slide-table tbody td:last-child{border-radius:0 .4cqw .4cqw 0}
.paper .slide-metric strong{font-weight:400;font-style:italic;letter-spacing:-.04em}.paper .slide-metric>span{font-style:italic}
.paper .chart-axis{stroke:none}.paper .chart-bar{rx:0}.paper .chart-line{stroke-width:3}.paper .chart-label{font-style:italic}.paper .slide-chart .s1{color:var(--slide-text)}.paper .slide-chart .s2{color:#9a8f7f}.paper .slide-chart .s3{color:#c9bea9}.paper .chart-legend span{border-radius:0}
.paper .slide-buttons a{color:var(--slide-highlight)}`
}

function poster() {
  return `.slide.poster{--slide-bg:var(--slide-tone);--slide-text:var(--slide-ink);--slide-muted:color-mix(in srgb,var(--slide-ink) 76%,var(--slide-tone));--slide-surface:color-mix(in srgb,var(--slide-ink) 10%,var(--slide-tone));--slide-line:var(--slide-ink);--slide-accent:var(--slide-ink);--slide-highlight:var(--slide-ink);--slide-wash:var(--slide-bg)}
.slide.poster::before{content:none}.slide.poster::after{content:'';position:absolute;width:40cqw;height:40cqw;right:-12cqw;top:-14cqw;z-index:-2;border-radius:50%;background:color-mix(in srgb,var(--slide-ink) 8%,var(--slide-tone));pointer-events:none}.slide.poster.kind-message::after{width:64cqw;height:64cqw;right:-16cqw;top:auto;bottom:-30cqw}.slide.poster:is(.kind-table,.kind-code,.kind-chart)::after{width:24cqw;height:24cqw;right:-10cqw;top:-12cqw}
.poster .slide-meta,.poster .widget-label{color:var(--slide-text);font-weight:700}.poster .slide-body,.poster .slide-footer{color:var(--slide-text)}
.slide.poster h2{font-weight:800;letter-spacing:-.062em}${pill('poster', 'var(--slide-ink)', 'var(--slide-tone)')}
.poster .comparison section,.poster .flow-box{border:0;border-radius:1.2cqw}.poster .comparison .comparison-after,.poster .flow-shared{background:var(--slide-ink);color:var(--slide-tone);box-shadow:none}.poster .comparison-after .widget-label{color:var(--slide-tone)}.poster .flow-arrow{color:var(--slide-ink);font-weight:800}
.poster .slide-steps li span{display:inline-flex;align-items:center;justify-content:center;height:3cqw;border-radius:50%;background:var(--slide-ink);color:var(--slide-tone);font-weight:800}
.poster .slide-bullets li::before{width:.9cqw;height:.9cqw;border-radius:50%;background:var(--slide-ink);transform:translateY(-.15cqw)}
.poster .slide-checklist li>span{border-radius:50%;border-color:var(--slide-ink)}.poster .slide-checklist li.done>span{background:var(--slide-ink);border-color:var(--slide-ink);color:var(--slide-tone)}
.poster .slide-quote{border-left:.6cqw solid var(--slide-ink)}.poster .slide-quote figcaption{color:var(--slide-text);font-weight:700}
.poster .code-frame{border:0;border-radius:1.2cqw;background:var(--slide-ink)}.poster .code-frame>div{border:0;color:var(--slide-tone);font-weight:700;text-transform:uppercase}.poster .code-dots{visibility:hidden}.poster .code-frame pre{color:var(--slide-tone)}
.poster .slide-table{border:0;border-radius:1.2cqw;background:none}.poster .slide-table th{background:var(--slide-ink);color:var(--slide-tone);font-weight:700;border:0}.poster .slide-table td{border:0;font-variant-numeric:tabular-nums}.poster .slide-table tbody tr:nth-child(even) td{background:var(--slide-surface)}
.poster .slide-metric strong{color:var(--slide-tone);background:var(--slide-ink);border-radius:999px;padding:.02em .28em .04em}
.poster .chart-axis{stroke:none}.poster .chart-bar{rx:0}.poster .chart-label{fill:var(--slide-ink)}.poster .chart-legend{color:var(--slide-text)}.poster .chart-point{stroke:var(--slide-tone)}.poster .slide-chart .s0{color:var(--slide-ink)}.poster .slide-chart .s1{color:color-mix(in srgb,var(--slide-ink) 55%,var(--slide-tone))}.poster .slide-chart .s2{color:color-mix(in srgb,var(--slide-ink) 35%,var(--slide-tone))}.poster .slide-chart .s3{color:color-mix(in srgb,var(--slide-ink) 20%,var(--slide-tone))}
.poster .slide-buttons a{border:0;border-radius:999px;background:var(--slide-ink);color:var(--slide-tone)}.poster .slide-buttons a::after{color:var(--slide-tone)}`
}

function marker() {
  return `.slide.marker{--slide-bg:#f6f6f3;--slide-text:#111111;--slide-muted:#55565a;--slide-surface:#ebebe6;--slide-line:#d6d6d0;--slide-accent:#111111;--slide-highlight:#111111;--slide-wash:var(--slide-bg)}
.slide.marker::before{content:none}
.marker .slide-meta{color:var(--slide-text);font-weight:600}
.slide.marker h2{font-weight:800;letter-spacing:-.062em}${pill('marker', 'var(--slide-tone)', 'var(--slide-ink)')}
.marker .comparison section,.marker .flow-box{border:0;border-radius:1.4cqw}.marker .comparison .comparison-after,.marker .flow-shared{background:var(--slide-tone);color:var(--slide-ink);box-shadow:none}.marker .comparison-after .widget-label{color:var(--slide-ink)}.marker .flow-box{border-radius:999px;padding-left:2.2cqw;padding-right:2.2cqw}
.marker .slide-steps li span{display:inline-flex;align-items:center;justify-content:center;height:3cqw;border-radius:50%;background:var(--slide-tone);color:var(--slide-ink);font-weight:700}
.marker .slide-bullets li::before{width:1.2cqw;height:.55cqw;border-radius:999px;background:var(--slide-tone);box-shadow:inset 0 0 0 1px rgb(0 0 0/.12);transform:translateY(-.45cqw)}
.marker .slide-checklist li>span{border-radius:50%;border-color:#a8a8a2}.marker .slide-checklist li.done>span{background:var(--slide-tone);border-color:var(--slide-tone);color:var(--slide-ink)}
.marker .slide-quote{border-left:.6cqw solid var(--slide-tone);border-radius:.3cqw}
.marker .code-frame{border:0;border-radius:1.4cqw;background:#111111}.marker .code-frame>div{border:0;color:#9a9a9a}.marker .code-dots{visibility:hidden}.marker .code-frame pre{color:#f6f6f3}
.marker .slide-table{border:0;border-radius:0;background:none}.marker .slide-table th{border:0}.marker .slide-table td{border:0;font-variant-numeric:tabular-nums}.marker .slide-table tbody tr:nth-child(odd) td{background:var(--slide-surface)}.marker .slide-table tbody td:first-child{border-radius:999px 0 0 999px}.marker .slide-table tbody td:last-child{border-radius:0 999px 999px 0}
.marker .slide-metric strong{color:var(--slide-ink);background:var(--slide-tone);border-radius:999px;padding:.02em .28em .04em}
.marker .chart-axis{stroke:none}.marker .chart-bar{rx:1cqw}.marker .slide-chart .s0{color:#111111}.marker .slide-chart .s1{color:color-mix(in oklab,var(--slide-tone) 75%,#000)}.marker .slide-chart .s2{color:#9a9a96}.marker .slide-chart .s3{color:#cacac4}.marker .chart-legend span{border-radius:50%}
.marker .slide-buttons a{border:0;border-radius:999px;background:var(--slide-tone);color:var(--slide-ink)}.marker .slide-buttons a::after{color:var(--slide-ink)}`
}

function pill(theme: string, background: string, color: string) {
  const cap = `radial-gradient(closest-side,${background} calc(100% - 1px),#0000)`
  const y = 'calc(50% + var(--pill-shift))'
  return `.slide.${theme}:is(.scale-normal,.scale-large,.scale-hero) h2{line-height:${PILL_LINE_HEIGHT}}.slide.${theme} h2 strong{font-weight:800;color:${color};background:${cap} left ${y}/${PILL_HEIGHT} ${PILL_HEIGHT} no-repeat,${cap} right ${y}/${PILL_HEIGHT} ${PILL_HEIGHT} no-repeat,linear-gradient(${background},${background}) center ${y}/calc(100% - ${PILL_HEIGHT}) ${PILL_HEIGHT} no-repeat;padding:.3em .36em;position:relative;z-index:-1;-webkit-box-decoration-break:clone;box-decoration-break:clone}.slide.${theme} h2 .pill-gap{letter-spacing:0}`
}

function pillShifts() {
  return Object.entries(PILL_SHIFT)
    .map(([font, shift]) => `.slide.font-${font}{--pill-shift:${shift}em}`)
    .join('')
}
