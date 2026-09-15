export function logDatabase(operation: string, ...details: unknown[]) {
  if (__DEV__) {
    console.log(`[db] ${operation}`, ...details);
  }
}
