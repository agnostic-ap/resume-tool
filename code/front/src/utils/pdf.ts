import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function exportToPDF(elementId: string, filename = '我的简历.pdf') {
  const el = document.getElementById(elementId)
  if (!el) return

  const originalTransform = el.style.transform
  const originalWidth = el.style.width
  el.style.transform = 'none'
  el.style.width = '794px'

  await new Promise((r) => setTimeout(r, 100))

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()
    const imgW = canvas.width
    const imgH = canvas.height
    const ratio = imgW / pdfW
    const totalH = imgH / ratio

    let posY = 0
    let remaining = totalH

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, posY, pdfW, totalH)
    remaining -= pdfH

    while (remaining > 0) {
      posY -= pdfH
      pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, posY, pdfW, totalH)
      remaining -= pdfH
    }

    pdf.save(filename)
  } finally {
    el.style.transform = originalTransform
    el.style.width = originalWidth
  }
}
