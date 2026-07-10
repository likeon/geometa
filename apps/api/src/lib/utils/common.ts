export function assertNotNullish<T>(
  value: T,
  message = 'Value must not be null or undefined',
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

// A pg unique-violation surfaces as code 23505; drizzle-orm wraps the postgres.js
// error in `.cause`, so walk both the error and its cause.
export function isUniqueViolation(
  error: unknown,
  constraintName: string,
): boolean {
  return [error, (error as { cause?: unknown } | undefined)?.cause].some(
    (e) => {
      const pgError = e as
        | { code?: string; constraint_name?: string }
        | undefined;
      return (
        pgError?.code === '23505' && pgError?.constraint_name === constraintName
      );
    },
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
