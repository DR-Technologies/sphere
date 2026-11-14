export interface DatasetQueryDiagnostics {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function textField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export class DatasetQueryError extends Error {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;

  constructor(diagnostics: DatasetQueryDiagnostics) {
    super(diagnostics.message || 'Dataset query failed.');
    this.name = 'DatasetQueryError';
    this.code = diagnostics.code;
    this.details = diagnostics.details;
    this.hint = diagnostics.hint;
  }
}

export function normalizeDatasetQueryError(error: unknown) {
  if (error instanceof DatasetQueryError) return error;
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    return new DatasetQueryError({
      code: textField(value.code),
      message: textField(value.message),
      details: textField(value.details),
      hint: textField(value.hint)
    });
  }
  return new DatasetQueryError({ message: error instanceof Error ? error.message : String(error || 'Dataset query failed.') });
}

export function getDatasetQueryDiagnostics(error: unknown): DatasetQueryDiagnostics {
  const normalized = normalizeDatasetQueryError(error);
  return {
    code: normalized.code,
    message: normalized.message,
    details: normalized.details,
    hint: normalized.hint
  };
}

export function getDatasetQueryUserMessage(error: unknown) {
  const { code } = getDatasetQueryDiagnostics(error);
  if (code === '57014') return 'La consulta tardó demasiado. Intenta cargar esta visualización nuevamente.';
  if (code === '42P01') return 'La tabla analítica del dataset no está disponible.';
  if (code === '42703') return 'Una columna configurada para esta visualización ya no existe.';
  if (code === '42883' || code === '42804') return 'La agregación no es compatible con el tipo de esta columna.';
  return 'No se pudo consultar esta visualización. Puedes intentarlo nuevamente.';
}
