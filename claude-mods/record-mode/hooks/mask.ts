const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
// +33 6 12 34 56 78, 06 12 34 56 78, 06.12.34.56.78, +1 (555) 123-4567 ...
const PHONE = /(?<![\w€])(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}(?![\w€])/g
// 1 234,56 €, 1234 €, €12, 12 EUR, 12 euros
const EURO =
  /(?:€\s?\d[\d\s.,]*\d|€\s?\d|\d[\d\s.,]*\s?(?:€|EUR\b|euros?\b))/gi

const digits = (s: string) => s.replace(/\D/g, '').length

export const mask = (text: string): string =>
  text
    .replace(EMAIL, '[EMAIL]')
    .replace(EURO, '[MONTANT €]')
    .replace(PHONE, m => (digits(m) >= 8 && digits(m) <= 15 ? '[TÉLÉPHONE]' : m))

export const maskDeep = (value: unknown): unknown => {
  if (typeof value === 'string') return mask(value)
  if (Array.isArray(value)) return value.map(maskDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskDeep(v)]))
  }
  return value
}
