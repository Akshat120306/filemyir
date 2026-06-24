export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 10) return 'Phone number must be 10 digits'
  if (!/^[6-9]/.test(digits)) return 'Phone number must start with 6, 7, 8 or 9'
  return null
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address'
  return null
}

export function validatePan(pan: string): string | null {
  if (!pan) return null // PAN is optional in most forms
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase())) return 'PAN must be in format: ABCDE1234F'
  return null
}

export function validateName(name: string): string | null {
  if (name.trim().length < 2) return 'Name must be at least 2 characters'
  if (!/^[a-zA-Z\s.'-]+$/.test(name.trim())) return 'Name can only contain letters, spaces and . \' -'
  return null
}
