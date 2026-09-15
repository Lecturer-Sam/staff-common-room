/**
 * Client for the Beacon Material Service.
 *
 * The generators are Python and live in a separate container (service/), so the
 * portal reaches them over HTTP rather than bundling them. Point the app at the
 * deployed service with:
 *
 *     VITE_MATERIALS_URL=https://beacon-materials-xxxxx-ew.a.run.app
 *
 * Leaving it unset falls back to the same origin, which expects a dev proxy —
 * see docs/MATERIAL_SERVICE.md.
 */

// In dev, fall back to the Vite proxy (see vite.config.js) so the browser stays
// on one origin and needs no CORS. In production this must be set explicitly.
const BASE =
  import.meta.env.VITE_MATERIALS_URL || (import.meta.env.DEV ? '/materials' : '')

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Pull the server-supplied filename out of a Content-Disposition header. */
export function filenameFrom(header) {
  const match = /filename="?([^"]+)"?/i.exec(header || '')
  return match ? match[1] : 'beacon_materials.docx'
}

async function call(path, { body, idToken } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (idToken) headers.Authorization = `Bearer ${idToken}`

  const res = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err.detail || err.error || ''
    } catch {
      detail = await res.text().catch(() => '')
    }
    const error = new Error(detail || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return res
}

/** Grades and subjects the service can generate, for populating dropdowns. */
export async function fetchCatalog() {
  const res = await call('/catalog')
  return res.json()
}

/** Service liveness plus whether it can see the curriculum data. */
export async function fetchHealth() {
  const res = await call('/health')
  return res.json()
}

/**
 * Generate a Scheme of Learning or Record of Work.
 *
 * @param {object} request
 * @param {'scheme'|'record'} request.kind
 * @param {string} request.grade            e.g. 'B4'
 * @param {string} [request.subject]        subject key; omit for all subjects in the grade
 * @param {'1'|'2'|'3'} [request.term]      a single term; omit for the full year
 * @param {boolean} [request.perTerm]       one document per term
 * @param {string} [request.school]         pre-printed on the cover
 * @param {string} [request.teacher]
 * @param {string} [request.class_name]
 * @param {string} [request.year]
 * @param {string} [request.hod]            scheme covers only
 * @param {string} [idToken]                Firebase ID token, when REQUIRE_AUTH=1
 * @returns {Promise<{blob: Blob, filename: string, isZip: boolean}>}
 */
export async function generateMaterial(request, idToken) {
  const res = await call('/generate', { body: request, idToken })
  const blob = await res.blob()
  const filename = filenameFrom(res.headers.get('Content-Disposition'))
  return { blob, filename, isZip: blob.type === 'application/zip' }
}

/** Trigger a browser download and release the object URL afterwards. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Generate and download in one step.
 * Returns the filename so callers can show it in a toast.
 */
export async function generateAndDownload(request, idToken) {
  const { blob, filename, isZip } = await generateMaterial(request, idToken)
  downloadBlob(blob, filename)
  return { filename, isZip }
}

export { DOCX_MIME }
