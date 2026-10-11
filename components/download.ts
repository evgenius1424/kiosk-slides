export function downloadFile(content: string, filename: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function printHtml(html: string) {
  document.querySelector('iframe.print-frame')?.remove()
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const frame = document.createElement('iframe')
  frame.className = 'print-frame'
  frame.tabIndex = -1
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }))
  frame.src = url
  document.body.append(frame)
  await loaded
  const view = frame.contentWindow!
  await view.document.fonts.ready
  view.addEventListener(
    'afterprint',
    () =>
      setTimeout(() => {
        frame.remove()
        URL.revokeObjectURL(url)
      }),
    { once: true },
  )
  view.focus()
  view.print()
}
