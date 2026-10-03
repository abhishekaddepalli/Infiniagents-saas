import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ForbiddenError, UnauthorizedError } from './auth'

/** Thrown by route handlers for expected, user-facing failures. */
export class AppError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AppError'
    this.status = status
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Converts any thrown value into a safe JSON response.
 * Raw errors and stack traces are logged server-side but never sent to the
 * browser — users always see a readable message instead.
 */
export function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return fail(error.message, 401)
  if (error instanceof ForbiddenError) return fail(error.message, 403)
  if (error instanceof AppError) return fail(error.message, error.status)
  if (error instanceof ZodError) {
    const first = error.errors[0]
    return fail(first ? `${first.path.join('.') || 'Field'}: ${first.message}` : 'Invalid input.', 422)
  }
  console.error('[agentflow] unhandled error:', error)
  return fail('Something went wrong on our side. Please try again.', 500)
}

/** Wraps a route handler with consistent error handling. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleError(error)
    }
  }
}
