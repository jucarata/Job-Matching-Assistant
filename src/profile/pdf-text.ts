import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs"
import pdfWorkerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"
import {
  EMPTY_PDF,
  LoadStepError,
  NOT_A_PDF,
  PDF_READ_FAILED,
} from "@/profile/load-errors"

function configurePdfWorker() {
  if (GlobalWorkerOptions.workerSrc) return
  if (import.meta.env.MODE === "test") {
    const relative = ["..", "..", "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"].join("/")
    GlobalWorkerOptions.workerSrc = new URL(relative, import.meta.url).href
    return
  }
  GlobalWorkerOptions.workerSrc = pdfWorkerSrc
}

export function validatePdfFile(file: File): File {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  if (!isPdf) throw new LoadStepError(NOT_A_PDF)
  return file
}

function textFromItems(items: ReadonlyArray<unknown>): string {
  let text = ""
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item)) continue
    const piece = item as { str: unknown; hasEOL?: unknown }
    if (typeof piece.str !== "string") continue
    text += piece.str
    if (piece.hasEOL) text += "\n"
  }
  return text
}

export async function extractPdfText(file: File): Promise<string> {
  configurePdfWorker()
  const data = new Uint8Array(await file.arrayBuffer())
  try {
    const document = await getDocument({
      data,
      verbosity: 0,
      useWasm: false,
      disableFontFace: true,
    }).promise
    try {
      const pages: string[] = []
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber)
        const content = await page.getTextContent()
        pages.push(textFromItems(content.items))
      }
      return pages.join("\n")
    } finally {
      await document.cleanup().catch(() => undefined)
    }
  } catch (error) {
    if (error instanceof LoadStepError) throw error
    throw new LoadStepError(PDF_READ_FAILED)
  }
}

export function assignFlatText(text: string): { flat_text: string } {
  if (text.trim() === "") throw new LoadStepError(EMPTY_PDF)
  return { flat_text: text }
}
