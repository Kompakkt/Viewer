const MAX_HIERARCHY_RETRIES = 3;

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_HIERARCHY_RETRIES,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Retry attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

export { retryWithBackoff, MAX_HIERARCHY_RETRIES };
