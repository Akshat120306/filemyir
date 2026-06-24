const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']

export async function uploadToCloudinary(file: File): Promise<string> {
  const isImage = IMAGE_TYPES.includes(file.type)
  // Images → /image/upload, everything else (PDF, doc, etc) → /raw/upload
  const resourceType = isImage ? 'image' : 'raw'

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
  formData.append('folder', 'taxos_documents')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? 'Upload failed')
  }
  const data = await res.json()
  return data.secure_url as string
}
