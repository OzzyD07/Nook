// Deliberately regex based: React Native's URL implementation is incomplete on some
// runtimes, and this check has to behave identically on the Worker and on devices.
const HTTPS_URL = /^https:\/\/([a-z0-9-]+\.)+[a-z0-9-]{2,}(:\d{1,5})?([/?#][^\s]*)?$/i;

/** True for absolute `https://` URLs with a dotted hostname and no credentials. */
export function isHttpsUrl(value: string): boolean {
  return value.length <= 2048 && HTTPS_URL.test(value);
}
