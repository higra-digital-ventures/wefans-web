// Envelope de erro consistente: { error: { code, message, details? } } (seção A1).

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Não autenticado') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Sem permissão') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Não encontrado') =>
  new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, 'CONFLICT', message, details);
