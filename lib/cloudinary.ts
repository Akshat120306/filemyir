export async function deleteFromCloudinary(url: string): Promise<void> {
  await fetch('/api/cloudinary/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
}

export async function uploadToCloudinary(file: File): Promise<string> {
  // Always use image resource type — publicly accessible, supports PDF/image/doc
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
  formData.append('folder', 'taxos_documents')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? 'Upload failed')
  }
  const data = await res.json()
  return data.secure_url as string
}
