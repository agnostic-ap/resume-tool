import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface ExportPdfOptions {
  watermark?: boolean
  watermarkText?: string
  /** Rasterization scale. Higher is sharper but heavier. */
  scale?: number
  /** JPEG quality 0-1. JPEG keeps multi-page resumes far smaller than PNG. */
  quality?: number
}

const A4_WIDTH_PX = 794 // 210mm at 96dpi

export async function exportToPDF(elementId: string, filename = '我的简历.pdf', options: ExportPdfOptions = {}) {
  const el = document.getElementById(elementId)
  if (!el) return

  const scale = options.scale ?? 2
  const quality = options.quality ?? 0.92

  const originalTransform = el.style.transform
  const originalWidth = el.style.width
  el.style.transform = 'none'
  el.style.width = `${A4_WIDTH_PX}px`

  await new Promise((r) => setTimeout(r, 100))

  try {
    const canvas = await html2canvas(el, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()

    // Height (in source-canvas pixels) that maps to one full A4 page. Cropping each
    // page from the source — instead of stretching one tall image across pages with a
    // negative offset — avoids vertical scaling artifacts and keeps text crisp, while
    // JPEG encoding controls file size at scale.
    const pageHeightPx = Math.floor((canvas.width * pdfH) / pdfW)
    const pageCount = Math.max(1, Math.ceil(canvas.height / pageHeightPx))

    const pageCanvas = document.createElement('canvas')
    const ctx = pageCanvas.getContext('2d')

    for (let page = 0; page < pageCount; page += 1) {
      const sourceY = page * pageHeightPx
      const sliceHeight = Math.min(pageHeightPx, canvas.height - sourceY)
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceHeight
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)
      }
      const renderedHeight = (sliceHeight / canvas.width) * pdfW
      if (page > 0) pdf.addPage()
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', quality), 'JPEG', 0, 0, pdfW, renderedHeight)
    }

    if (options.watermark) {
      const text = options.watermarkText || 'Made with Resume Tool'
      for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) {
        pdf.setPage(page)
        pdf.setFontSize(8)
        pdf.setTextColor(160, 160, 160)
        pdf.text(text, pdfW / 2, pdfH - 5, { align: 'center' })
      }
    }

    pdf.save(filename)
  } finally {
    el.style.transform = originalTransform
    el.style.width = originalWidth
  }
}
