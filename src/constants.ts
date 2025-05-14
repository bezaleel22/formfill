export const BEMIS_BASE_URL = "https://portal.bemis.com.ng";
export const STUDENT_CREATE_MODAL_PATH = "/Students/StudentCreateModal";

export const DEFAULT_SCHOOL_ID = "193"; // Example School ID, to be configured by the user

export const SESSION_FILE_PATH = "./session.txt";

// HTTP Headers
export const HEADER_COOKIE = "Cookie";
export const HEADER_CONTENT_TYPE = "Content-Type";
export const HEADER_REQUEST_VERIFICATION_TOKEN = "requestverificationtoken";
export const HEADER_ACCEPT = "Accept";
export const HEADER_XSRF_TOKEN = "X-XSRF-TOKEN"; // Standard XSRF token header name

// Content Types
export const CONTENT_TYPE_FORM_URLENCODED = "application/x-www-form-urlencoded";
export const ACCEPT_JSON_TEXT_ANY = "application/json, text/plain, */*";

// CSRF Tokens
export const XSRF_TOKEN_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_FORM_FIELD_NAME = "__RequestVerificationToken";

// AI Service Constants
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_AI_MODEL = 'qwen/qwen2.5-vl-72b-instruct:free';
export const ALTERNATIVE_AI_MODEL = 'qwen/qwen-vl-max';
