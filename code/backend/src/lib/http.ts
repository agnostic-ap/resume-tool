import { type ZodSchema } from 'zod'

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return schema.parse(body ?? {})
}

export function getParam(params: unknown, key: string): string {
  if (!params || typeof params !== 'object') throw new Error(`Missing route param: ${key}`)
  const value = (params as Record<string, unknown>)[key]
  if (typeof value !== 'string' || !value) throw new Error(`Missing route param: ${key}`)
  return value
}

export function headerValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}
