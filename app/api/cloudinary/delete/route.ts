import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function extractPublicId(url: string): { publicId: string; resourceType: string } {
  const match = url.match(/cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)/)
  if (!match) return { publicId: '', resourceType: 'image' }
  const resourceType = match[1]
  let publicId = match[2]
  // Images: strip extension from public_id. Raw/video: keep it.
  if (resourceType === 'image') publicId = publicId.replace(/\.[^.]+$/, '')
  return { publicId, resourceType }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ ok: false, error: 'No URL' }, { status: 400 })

  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!apiKey || !apiSecret || !cloudName) {
    return NextResponse.json({ ok: false, error: 'Cloudinary credentials missing' }, { status: 500 })
  }

  const { publicId, resourceType } = extractPublicId(url)
  if (!publicId) return NextResponse.json({ ok: false, error: 'Could not extract public_id' }, { status: 400 })

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex')

  const form = new URLSearchParams()
  form.append('public_id', publicId)
  form.append('timestamp', String(timestamp))
  form.append('api_key', apiKey)
  form.append('signature', signature)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    { method: 'POST', body: form }
  )
  const data = await res.json()

  if (data.result === 'ok' || data.result === 'not found') {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ ok: false, error: data.result }, { status: 500 })
}
