interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
}

export function isMissingPostgrestFunction(error: PostgrestErrorLike | null | undefined, functionName: string) {
  if (!error) return false;
  if (error.code === 'PGRST202' || error.code === '42883') return true;
  const message = error.message || '';
  return message.includes(functionName)
    && /could not find the function|does not exist/i.test(message);
}
