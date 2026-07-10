export function assertNotNullish<T>(
  value: T,
  message = 'Value must not be null or undefined',
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

// drizzle-orm wraps the postgres.js error in `.cause`, so walk both the error
// and its cause when looking for a SQLSTATE code.
function pgErrors(error: unknown) {
  return [error, (error as { cause?: unknown } | undefined)?.cause] as (
    | { code?: string; constraint_name?: string }
    | undefined
  )[];
}

export function isPgError(error: unknown, sqlState: string): boolean {
  return pgErrors(error).some((e) => e?.code === sqlState);
}

export function isUniqueViolation(
  error: unknown,
  constraintName: string,
): boolean {
  return pgErrors(error).some(
    (e) => e?.code === '23505' && e?.constraint_name === constraintName,
  );
}

export function generateRandomString(length: number) {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(randomValues)
    .map((byte) => charset[byte % charset.length])
    .join('');
}
