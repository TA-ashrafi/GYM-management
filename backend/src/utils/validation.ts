export function isNonEmptyString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
