export function createLogger(scope: string) {
  return (event: string, ...details: unknown[]) => {
    if (__DEV__) {
      console.log(`[${scope}] ${event}`, ...details);
    }
  };
}
