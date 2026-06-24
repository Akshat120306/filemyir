import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  // Only proxy Cloudinary URLs
  if (!url.includes('cloudinary.com')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const res = await fetch(url)
  if (!res.ok) return new NextResponse('Failed to fetch file', { status: res.status })

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const body = await res.arrayBuffer()

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
