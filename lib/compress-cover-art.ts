// Cover art is stored inline as a base64 `data:` URL and embedded into
// server-rendered ISR pages. Raw multi-MB uploads blew past Vercel's 20MB ISR
// limit (FALLBACK_BODY_TOO_LARGE), so we downscale on a canvas before storing:
// longest edge <= 640px (never upscaled), re-encoded as JPEG q0.82 (typical
// result 40-80KB). If even the compressed result exceeds this cap we refuse the
// image with an inline error rather than storing bloat.
const COVER_MAX_EDGE = 640
export const COVER_MAX_CHARS = 128 * 1024
export const COVER_TOO_LARGE_MESSAGE = "That image is too large — try a smaller one."

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to decode image"))
    img.src = src
  })
}

// Only meaningful for PNG sources: scan the alpha channel so we can preserve
// transparency (PNG) instead of flattening it onto a black JPEG background.
function canvasHasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const { data } = ctx.getImageData(0, 0, width, height)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

/**
 * Downscale `file` onto a canvas (longest edge <= COVER_MAX_EDGE, never
 * upscaled) and return a compressed `data:` URL. Re-encodes as JPEG q0.82;
 * keeps PNG only when the source is a transparent PNG whose PNG encoding still
 * fits under the cap, otherwise JPEG (which flattens transparency to black —
 * acceptable for a cover tile). Revokes the object URL before returning.
 * Rejects on a corrupt/undecodable file.
 */
export async function compressCoverArt(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(objectUrl)
    const longestEdge = Math.max(img.naturalWidth, img.naturalHeight)
    const scale = longestEdge > COVER_MAX_EDGE ? COVER_MAX_EDGE / longestEdge : 1
    const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale))
    const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement("canvas")
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context unavailable")
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    // Prefer PNG only for transparent PNG sources that stay under the cap;
    // otherwise JPEG, which is far smaller for photographic covers.
    if (
      file.type === "image/png" &&
      canvasHasTransparency(ctx, targetWidth, targetHeight)
    ) {
      const png = canvas.toDataURL("image/png")
      if (png.length <= COVER_MAX_CHARS) return png
    }
    return canvas.toDataURL("image/jpeg", 0.82)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
