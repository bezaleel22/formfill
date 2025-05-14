# Implementation Details

This document outlines the detailed implementation of the BEMIS Student Data Automation tool, covering key components, functionalities, challenges encountered, and the solutions developed.

## Core Components and Flow

The system automates the process of extracting student data from a handwritten registration form image and submitting it to the BEMIS portal. The general flow is:

1.  **Frontend (Client-side)**:
    *   User adds their OpenRouter API key (if not already present).
    *   User selects an image of the registration form.
    *   User selects the desired AI model from a dropdown.
2.  **Backend API (`/api/extract-form-data` using Hono on Bun.js)**: Receives the image, selected AI model name, and uses a stored API key.
3.  **AI Data Extraction (`aiExtractionService.ts`)**: The image is sent to the chosen Vision Language Model (VLM) via OpenRouter API to extract structured student data as JSON.
4.  **Frontend Review**: Extracted student name fields are displayed for user review and correction.
5.  **Backend API (`/api/submit-student` using Hono on Bun.js)**: Receives the (potentially corrected) student data and school ID.
6.  **BEMIS Data Submission (`bemisService.ts`)**: The extracted and formatted data is submitted to the BEMIS portal, handling authentication and CSRF protection.
7.  **Response Handling**: The Hono backend API returns a success or error message to the frontend.

## 1. Authentication and CSRF Management (BEMIS Submission)

Interacting with the BEMIS portal requires handling session cookies and CSRF (Cross-Site Request Forgery) tokens.

*   **Session Management (`authUtils.ts`)**:
    *   The BEMIS session cookie (including the `XSRF-TOKEN`) is read from a local `session.txt` file. This file needs to be populated manually by the user after logging into BEMIS via a browser and copying the cookie value.
    *   `getSessionCookie()`: Reads the full cookie string.
    *   `extractXsrfToken()`: Parses the `XSRF-TOKEN` value from the full cookie string. This token is needed for the `X-XSRF-TOKEN` request header.

*   **CSRF Form Field Token (`csrfUtils.ts`)**:
    *   BEMIS uses a per-form CSRF token (typically named `__RequestVerificationToken`) embedded within the HTML of the student creation modal.
    *   `fetchFormFieldCsrfToken()`:
        1.  Makes a GET request to the BEMIS `StudentCreateModal` page (`/Students/StudentCreateModal?schoolid=...`).
        2.  Sends the main session cookie and the `X-XSRF-TOKEN` header with this GET request.
        3.  Parses the HTML response to extract the value of the `__RequestVerificationToken` input field. This token is then used in the actual POST submission.

## 2. API Key Management (`apiKeyService.ts`)

This service handles the storage and retrieval of OpenRouter API keys.

*   **Storage**: API keys are stored in a JSON file (`api_keys.json`).
*   **Functionality**:
    *   `addApiKey()`: Adds a new key.
    *   `getApiKeys()`: Retrieves all keys.
    *   `getNextApiKey()`: Retrieves the next available key (currently the first one).
    *   `clearApiKeys()`: Removes all keys.
    *   `getApiKeysCount()`: Returns the number of stored keys.
*   **Frontend Integration**: The SPA uses API endpoints (`/api/settings/apikeys/*`) to interact with this service.

## 3. AI Data Extraction (`aiExtractionService.ts`)

This service is responsible for converting the handwritten form image into structured JSON data.

*   **Model**: Dynamically uses the AI model specified by the user (e.g., `qwen/qwen-vl-max`, `qwen/qwen2.5-vl-72b-instruct:free`) via the OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`). The `modelName` is passed as a parameter to `extractStudentDataFromImage()`.
*   **Image Handling**:
    *   The input image buffer is converted to a Base64 Data URI (`bufferToDataURI()`) for embedding in the API request.
*   **Prompt Engineering**: A detailed prompt guides the VLM to:
    *   Extract data according to a specified TypeScript interface (`StudentData`).
    *   Ensure exact field name matching (case-sensitive, including typos like `student.MotherOccption`).
    *   **Specific Formatting Rules (Key Refinements)**:
        *   Guardian Info: Uses father's details if guardian info is "not filled in".
        *   Class & Section Mapping: Maps handwritten class names to specific `student.Class` and `student.Section` values.
        *   PreviousClass Mapping: Applies similar mapping rules.
        *   Address Parsing: Extracts `student.Street`, `student.City`, and `student.ResidenceState`.
        *   Email Handling: Takes the first email for `student.Email`; appends subsequent emails to `student.Notes`.
        *   Phone Number Handling: Takes the first number for specific phone fields; appends subsequent numbers to `student.Notes`.
        *   State Names: Removes " State" suffix.
        *   Blood Group: Extracts only the letter (A, B, O, AB).
        *   DateOfAdmission: Extracts *only the year* (YYYY format).
        *   Name Field Uppercasing: Converts specified name fields to ALL UPPERCASE.
    *   **Output**: The VLM is instructed to return a single valid JSON object.
*   **Post-processing**:
    *   The service parses the JSON string from the VLM's response.
    *   It ensures default values for `id` ("0") and `student.SchoolId` ("") are present.
    *   A list of required keys is checked, and if any are missing, they are added with an empty string.

## 4. BEMIS Data Submission (`bemisService.ts` & `formDataUtils.ts`)

This component handles the actual POST request to the BEMIS portal.

*   **Payload Preparation (`formDataUtils.ts`)**:
    *   `prepareStudentDataPayload()`:
        *   Constructs a `URLSearchParams` object.
        *   Includes `id` ("0"), `schoolid`, and the `__RequestVerificationToken`.
        *   Iterates through `ALL_STUDENT_DATA_KEYS` and appends each key-value pair.
        *   Ensures all fields defined in `ALL_STUDENT_DATA_KEYS` are present.
*   **HTTP POST Request (`bemisService.ts`)**:
    *   `processStudentSubmission()`:
        *   Target URL: `https://portal.bemis.com.ng/Students/StudentCreateModal`.
        *   Method: `POST`.
        *   **Headers**: `Cookie`, `Content-Type: application/x-www-form-urlencoded`, `X-XSRF-TOKEN`, `Accept: application/json, text/plain, */*`.
        *   `body`: The `URLSearchParams` payload.
        *   `redirect: 'manual'`.
*   **Response Handling (`bemisService.ts`)**:
    *   **Success**: `200 OK`, `204 No Content`.
    *   **Redirects**: `302 Found` (checks for session expiry).
    *   **Errors**: Attempts to parse JSON error details.

## 5. API Endpoints (`index.ts` - Hono on Bun.js)

Key API endpoints built using Hono:

*   **`POST /api/extract-form-data`**:
    *   Receives `formImage` (File) and `aiModel` (string) via `multipart/form-data`.
    *   Retrieves an OpenRouter API key using `apiKeyService.getNextApiKey()`.
    *   Converts the image `File` to a `Buffer`.
    *   Calls `extractStudentDataFromImage()` with the image buffer, API key, and `aiModel`.
    *   Returns JSON response with extracted `studentData` or error.
*   **`POST /api/submit-student`**:
    *   Receives `schoolId` and `studentData` (JSON) in the request body.
    *   Calls `processStudentSubmission()` with the data.
    *   Returns JSON response indicating BEMIS submission success or failure.
*   **API Key Management Endpoints (e.g., `/api/settings/apikeys/*`)**:
    *   `POST /api/settings/apikeys`: Adds a new API key.
    *   `GET /api/settings/apikeys/count`: Gets the count of stored API keys.
    *   `GET /api/settings/apikeys/current`: Gets the current/next API key.
    *   `DELETE /api/settings/apikeys`: Removes a specific API key.
*   **Static Files**: Serves the `public` directory using `serveStatic` from `hono/bun`.

## 6. Frontend (`public/index.html` & `public/app.js`)

A simple HTML interface for user interaction.

*   **`index.html`**:
    *   File input for image selection.
    *   Dropdown (`<select id="aiModelSelect">`) for AI model selection.
    *   Section for OpenRouter API key management.
    *   Text input for School ID.
    *   Button to trigger AI extraction.
    *   Section to review/correct student name fields.
    *   Button to trigger BEMIS submission.
    *   Areas to display image preview and responses.
*   **`app.js`**:
    *   Handles image preview and camera capture.
    *   Manages API key addition and count display.
    *   On "Extract Data with AI" click:
        *   Creates a `FormData` object with the image and selected `aiModel`.
        *   Makes a `fetch` POST request to `/api/extract-form-data`.
        *   Populates review fields with extracted name data.
        *   Displays success/error messages.
    *   On "Submit to BEMIS" click:
        *   Gathers corrected name data, school ID, and the full AI-extracted data.
        *   Makes a `fetch` POST request to `/api/submit-student`.
        *   Displays the final success or error message.

## 7. Key Challenges & Solutions During Development

*   **CSRF Protection**: Implemented a two-step fetch for the form-specific token.
*   **BEMIS Error Responses**: Used `Accept: application/json` header.
*   **BEMIS Field Name and Data Quirks**: Iterative testing and prompt refinement.
*   **AI Prompt Engineering**: Extensive iterative refinement of the VLM prompt for accuracy and format.
*   **BEMIS Success Response**: Handled `204 No Content` as success.
*   **Payload Completeness**: `formDataUtils.ts` ensures all keys are sent.
*   **Hono Form Data Handling**: Adapted to Hono's `c.req.formData()` and `File` object.
*   **API Key Security**: Stored keys in `api_keys.json` (gitignore recommended) and managed via a service, rather than exposing directly in frontend JS for API calls.

## 8. Configuration and Setup

*   **`session.txt`**: Manually created for BEMIS session cookie.
*   **OpenRouter API Key**: Added via the UI (Settings section).
*   **School ID**: Provided in the UI.
*   **Constants (`constants.ts`)**: Defines base URLs, paths, AI model names, etc.