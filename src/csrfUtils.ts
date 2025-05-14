import {
  BEMIS_BASE_URL,
  STUDENT_CREATE_MODAL_PATH,
  HEADER_COOKIE,
  HEADER_REQUEST_VERIFICATION_TOKEN,
  CSRF_FORM_FIELD_NAME,
} from './constants';

/**
 * Fetches the "Create New Student" modal HTML and extracts the __RequestVerificationToken.
 * @param {string} fullSessionCookie The full session cookie string.
 * @param {string} xsrfTokenHeaderValue The value of the XSRF-TOKEN cookie (for the requestverificationtoken header).
 * @param {string} schoolId The ID of the school.
 * @returns {Promise<string>} The value of the __RequestVerificationToken.
 * @throws {Error} If the request fails, the response status is not OK, or the token is not found.
 */
export async function fetchFormFieldCsrfToken(
  fullSessionCookie: string,
  xsrfTokenHeaderValue: string,
  schoolId: string,
): Promise<string> {
  const modalUrl = new URL(STUDENT_CREATE_MODAL_PATH, BEMIS_BASE_URL);
  modalUrl.searchParams.append('schoolid', schoolId);

  console.log(`Fetching CSRF form field token from: ${modalUrl.toString()}`);

  try {
    const response = await fetch(modalUrl.toString(), {
      method: 'GET',
      headers: {
        [HEADER_COOKIE]: fullSessionCookie,
        [HEADER_REQUEST_VERIFICATION_TOKEN]: xsrfTokenHeaderValue,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch CSRF token modal. Status: ${response.status} ${response.statusText}. URL: ${modalUrl.toString()}`,
      );
    }

    const htmlResponse = await response.text();

    // Regex to find the __RequestVerificationToken input field and extract its value.
    // This is a common pattern: <input name="__RequestVerificationToken" type="hidden" value="TOKEN_VALUE_HERE" />
    // It looks for the name attribute, then captures the value from the value attribute.
    const tokenRegex = new RegExp(
      `<input[^>]*name=["']${CSRF_FORM_FIELD_NAME}["'][^>]*type=["']hidden["'][^>]*value=["']([^"']+)["'][^>]*\/?>`,
      'i' // Case-insensitive
    );

    const match = htmlResponse.match(tokenRegex);

    if (match && match[1]) {
      const formFieldToken = match[1];
      console.log(`Successfully extracted ${CSRF_FORM_FIELD_NAME}: ${formFieldToken}`);
      return formFieldToken;
    } else {
      // For debugging, log a snippet of the HTML if the token is not found.
      const snippet = htmlResponse.substring(0, Math.min(htmlResponse.length, 1000));
      console.error(`Could not find '${CSRF_FORM_FIELD_NAME}' in the HTML response. Snippet:\n${snippet}...`);
      throw new Error(
        `Could not extract '${CSRF_FORM_FIELD_NAME}' from the modal HTML. URL: ${modalUrl.toString()}`,
      );
    }
  } catch (error: any) {
    console.error(`Error fetching or parsing CSRF form field token from ${modalUrl.toString()}:`, error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
    throw error; // Re-throw to be handled by the caller
  }
}