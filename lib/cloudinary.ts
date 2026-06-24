export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
  formData.append('folder', 'taxos_documents')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? 'Upload failed')
  }
  const data = await res.json()

  // Cloudinary returns image/upload URLs for all files including PDFs.
  // Replace with raw/upload so PDFs and docs open correctly in the browser.
  const url: string = data.secure_url
  return url.replace('/image/upload/', '/raw/upload/').replace('/video/upload/', '/raw/upload/')
}
