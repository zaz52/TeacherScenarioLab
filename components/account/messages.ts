export function accountMessage(t: (key: string) => string, code: string) {
  const key = 'teacherlab.errors.' + code;
  const text = t(key);
  return text === key ? t('teacherlab.errors.ACCOUNT_SERVICE_UNAVAILABLE') : text;
}
