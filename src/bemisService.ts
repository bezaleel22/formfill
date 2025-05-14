import { getSessionCookie, extractXsrfToken } from './authUtils';
import { fetchFormFieldCsrfToken } from './csrfUtils';
import { prepareStudentDataPayload } from './formDataUtils';
import type { StudentData } from './interfaces';
import {
  BEMIS_BASE_URL,
  STUDENT_CREATE_MODAL_PATH,
  HEADER_COOKIE,
  HEADER_CONTENT_TYPE,
  CONTENT_TYPE_FORM_URLENCODED,
  HEADER_ACCEPT,
  ACCEPT_JSON_TEXT_ANY,
  HEADER_XSRF_TOKEN
} from './constants';

/**
 * Processes the submission of new student data to the BEMIS portal.
 * This involves fetching CSRF tokens and POSTing the student data.
 * @param studentDetails The data for the student to be created.
 * @param schoolId The ID of the school.
 * @returns A promise that resolves to an object indicating success or failure, a message, the status code, and optional data.
 */
export async function processStudentSubmission(
  studentDetails: StudentData,
  schoolId: string,
): Promise<{ success: boolean; status: number; message: string; data?: any }> {
  console.log(`Processing student submission for school ID: ${schoolId}`);
  console.log('Received studentDetails for submission:', JSON.stringify(studentDetails, null, 2)); 

  try {
    const fullSessionCookie = await getSessionCookie();
    console.log('Successfully read session cookie for BEMIS submission.');

    const xsrfTokenHeaderValue = extractXsrfToken(fullSessionCookie); 
    if (!xsrfTokenHeaderValue) {
      throw new Error('Failed to extract XSRF-TOKEN from session cookie for BEMIS submission.');
    }
    console.log(`Extracted XSRF-TOKEN for BEMIS submission header: ${xsrfTokenHeaderValue}`);

    const formFieldCsrfToken = await fetchFormFieldCsrfToken(
      fullSessionCookie,
      xsrfTokenHeaderValue,
      schoolId,
    );
    console.log(`Successfully fetched CSRF form field token for BEMIS submission: ${formFieldCsrfToken}`);

    const payload = prepareStudentDataPayload(
      studentDetails,
      schoolId,
      formFieldCsrfToken,
    );
    console.log('BEMIS submission form data payload prepared.');
    console.log('Exact payload string being sent to BEMIS:\n', payload.toString()); 

    const targetUrl = new URL(STUDENT_CREATE_MODAL_PATH, BEMIS_BASE_URL);
    console.log(`Submitting student data to BEMIS: ${targetUrl.toString()}`);

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        [HEADER_COOKIE]: fullSessionCookie,
        [HEADER_CONTENT_TYPE]: CONTENT_TYPE_FORM_URLENCODED,
        [HEADER_XSRF_TOKEN]: xsrfTokenHeaderValue, 
        [HEADER_ACCEPT]: ACCEPT_JSON_TEXT_ANY, 
      },
      body: payload,
      redirect: 'manual', 
    });

    console.log(`BEMIS submission response status: ${response.status} ${response.statusText}`);
    
    // Read body only if not 204, as 204 means no content
    let responseBodyText = '';
    if (response.status !== 204) {
        responseBodyText = await response.text(); 
    }

    if (response.status === 200 || response.status === 204) { // Added 204 as a success status
      const message = response.status === 204 
        ? 'Student data submitted successfully to BEMIS (204 No Content).' 
        : 'Student data submitted successfully to BEMIS (200 OK).';
      return { success: true, status: response.status, message: message, data: responseBodyText }; // responseBodyText will be empty for 204
    } else if (response.status === 302) { 
      const location = response.headers.get('Location');
      const message = `BEMIS submission resulted in a redirect (302) to: ${location || 'unknown location'}`;
      if (location && location.toLowerCase().includes('login')) {
        console.warn(message + ' BEMIS session might be expired or invalid.');
        return { success: false, status: response.status, message: message + ' BEMIS session might be expired or invalid.' };
      }
      console.log(message + ' Assuming redirect indicates successful submission.');
      return { success: true, status: response.status, message: message + ' Assuming redirect indicates successful submission.', data: responseBodyText }; // Body might be relevant for 302
    } else { 
      // responseBodyText would have been read if not 204
      console.error('BEMIS submission error response body snippet:', responseBodyText.substring(0, 1000) + (responseBodyText.length > 1000 ? "..." : ""));
      
      const contentType = response.headers.get('content-type');
      if ((contentType && contentType.includes('application/json')) || response.status === 400) {
          try {
              const errorJson = JSON.parse(responseBodyText); 
              return { 
                  success: false, 
                  status: response.status, 
                  message: errorJson.message || errorJson.details || `BEMIS form submission failed with status ${response.status}.`, 
                  data: errorJson 
              };
          } catch (e) {
              console.warn("Could not parse BEMIS error response as JSON, though expected for 400 or application/json content type.");
          }
      }
      throw new Error(`BEMIS form submission failed with status ${response.status}. Body: ${responseBodyText.substring(0,200)}`);
    }
  } catch (error: any) {
    console.error('Error during BEMIS student form submission process:', error.message);
    if (error.cause) console.error("Cause:", error.cause);
    return { success: false, status: error.status || 500, message: error.message || 'An unknown error occurred during BEMIS submission.' };
  }
}