import type { Container } from '../types'
import { ar } from './ar'
import { fr } from './fr'

export type LocaleCode = 'fr' | 'ar'
export type Translations = typeof fr

export const locales: Record<LocaleCode, Translations> = {
  fr,
  ar: ar as unknown as Translations,
}

export function containerStatusLabel(
  status: Container['status'],
  t: Translations,
): string {
  return t.containerStatus[status]
}

export { fr, ar }
