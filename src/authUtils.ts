import { readFile } from 'fs/promises';
import { SESSION_FILE_PATH, XSRF_TOKEN_COOKIE_NAME } from './constants';

/**
 * Reads the full session cookie string from the session.txt file.
 * @returns {Promise<string>} The full session cookie string.
 * @throws {Error} If session.txt is not found or is empty.
 */
export async function getSessionCookie(): Promise<string> {
  try {
    const cookie = await readFile(SESSION_FILE_PATH, 'utf-8');
    if (!cookie || cookie.trim() === '') {
      throw new Error(
        `Session file '${SESSION_FILE_PATH}' is empty. Please provide your full session cookie string.`,
      );
    }
    return cookie.trim();
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Session file '${SESSION_FILE_PATH}' not found. Please create it and paste your full session cookie string.`,
      );
    }
    console.error(`Error reading session cookie from ${SESSION_FILE_PATH}:`, error);
    throw error; // Re-throw original error or a more specific one
  }
}

/**
 * Extracts the XSRF-TOKEN value from the full cookie string.
 * @param {string} fullCookieString The complete cookie string from the browser.
 * @returns {string | null} The value of the XSRF-TOKEN or null if not found.
 */
export function extractXsrfToken(fullCookieString: string): string | null {
  if (!fullCookieString) {
    console.warn('Full cookie string is empty, cannot extract XSRF-TOKEN.');
    return null;
  }

  const cookies = fullCookieString.split(';');
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name === XSRF_TOKEN_COOKIE_NAME) {
      return rest.join('='); // Value might contain '='
    }
  }

  console.warn(`'${XSRF_TOKEN_COOKIE_NAME}' not found in the provided cookie string.`);
  return null;
}