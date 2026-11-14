import { LASER } from './player'

export type Laser = ReturnType<typeof startLaser>

export function startLaser(canvas: HTMLCanvasElement, host: HTMLElement) {
  const context = canvas.getContext('2d')
  let on = false
  let tip: Point | null = null
  let trail: Stamp[] = []
  let strokes: Point[][] = []
  let drawing: Point[] | null = null
  let lifted = 0
  let frame = 0

  const draw = (now: number) => {
    frame = 0
    trail = trail.filter(stamp => now - stamp.t < LASER.trailMs)
    const fade = drawing ? 1 : 1 - Math.max(0, now - lifted - LASER.holdMs) / LASER.fadeMs
    if (fade <= 0) strokes = []
    if (context) paint(context, canvas, host, { tip: on ? tip : null, trail, strokes, fade })
    if (on || trail.length || strokes.length) frame = requestAnimationFrame(draw)
  }
  const wake = () => {
    if (!frame) frame = requestAnimationFrame(draw)
  }
  const resize = () => {
    const ratio = devicePixelRatio || 1
    canvas.width = Math.round(innerWidth * ratio)
    canvas.height = Math.round(innerHeight * ratio)
    wake()
  }
  const move = (event: PointerEvent) => {
    if (!on) return
    const now = performance.now()
    for (const e of event.getCoalescedEvents?.() ?? [event]) {
      const point = { x: e.clientX, y: e.clientY }
      trail.push({ ...point, t: now })
      drawing?.push(point)
      tip = point
    }
    wake()
  }
  const down = (event: PointerEvent) => {
    if (!on || event.button !== 0 || (event.target as Element).closest?.('button,a')) return
    tip = { x: event.clientX, y: event.clientY }
    drawing = [tip]
    strokes.push(drawing)
    wake()
  }
  const lift = () => {
    if (!drawing) return
    drawing = null
    lifted = performance.now()
  }
  const up = (event: PointerEvent) => {
    lift()
    if (event.pointerType === 'touch') tip = null
  }
  const leave = () => {
    tip = null
  }
  const toggle = (value = !on) => {
    on = value
    if (on) host.dataset.laser = ''
    else delete host.dataset.laser
    if (!on) lift()
    wake()
    return on
  }

  resize()
  addEventListener('resize', resize)
  addEventListener('pointermove', move)
  addEventListener('pointerdown', down)
  addEventListener('pointerup', up)
  addEventListener('pointercancel', up)
  document.documentElement.addEventListener('pointerleave', leave)
  return {
    toggle,
    stop: () => {
      toggle(false)
      cancelAnimationFrame(frame)
      removeEventListener('resize', resize)
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      document.documentElement.removeEventListener('pointerleave', leave)
    },
  }
}

type Point = { x: number; y: number }
type Stamp = Point & { t: number }
type Scene = { tip: Point | null; trail: Stamp[]; strokes: Point[][]; fade: number }

function paint(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  { tip, trail, strokes, fade }: Scene,
) {
  const ratio = canvas.width / innerWidth
  const unit = Math.min(innerWidth, innerHeight) / 100
  const tone = getComputedStyle(host).getPropertyValue('--slide-tone').trim() || '#ff3b30'
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, innerWidth, innerHeight)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = tone
  context.fillStyle = tone
  context.shadowColor = tone
  context.globalAlpha = fade
  context.shadowBlur = unit * 1.2
  context.lineWidth = unit * LASER.ink
  for (const stroke of strokes) smooth(context, stroke)
  context.shadowBlur = 0
  context.lineCap = 'butt'
  for (let i = 1; i < trail.length; i++) {
    const life = i / trail.length
    context.globalAlpha = life * 0.8
    context.lineWidth = unit * LASER.dot * 1.4 * life
    context.beginPath()
    context.moveTo(trail[i - 1].x, trail[i - 1].y)
    context.lineTo(trail[i].x, trail[i].y)
    context.stroke()
  }
  if (!tip) return
  context.globalAlpha = 1
  context.shadowBlur = unit * 2.6
  dot(context, tip, unit * LASER.dot)
  context.shadowBlur = 0
  context.fillStyle = '#fff'
  dot(context, tip, unit * LASER.dot * 0.42)
}

function smooth(context: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 1) return dot(context, points[0], context.lineWidth / 2)
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 }
    context.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y)
  }
  const last = points[points.length - 1]
  context.lineTo(last.x, last.y)
  context.stroke()
}

function dot(context: CanvasRenderingContext2D, at: Point, radius: number) {
  context.beginPath()
  context.arc(at.x, at.y, radius, 0, Math.PI * 2)
  context.fill()
}
