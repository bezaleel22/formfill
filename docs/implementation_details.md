# Implementation Details: AutoFill

This document outlines the detailed implementation of the AutoFill tool, covering key components, functionalities, challenges encountered, and the solutions developed.

## Core Components and Flow

The system automates the process of extracting student data from a handwritten registration form image and submitting it to the BEMIS portal. The application is presented as a SaaS-style landing page with the functional app embedded. The general flow is:

1.  **Landing Page Interaction (Client-side)**:
    *   User interacts with the landing page (Hero, Features).
    *   User navigates to the embedded application section via scroll or "Get Started" / "Use App" buttons.
2.  **Settings Configuration (Client-side, "Settings & Model" Tab within App)**:
    *   User adds their OpenRouter API key (if not already present) via UI.
    *   User adds their BEMIS session cookie via UI.
    *   User inputs the School ID.
    *   User selects the desired AI model from a dropdown.
3.  **Image Upload & Automatic AI Extraction (Client-side, "AI Extract" Tab within App)**:
    *   User uploads an image of the registration form (drag & drop, browse, or camera scan).
    *   This action automatically triggers a request to the backend.
4.  **Backend API (`/api/extract-form-data` using Hono on Bun.js)**: Receives the image, selected AI model name (from settings), and uses a stored API key.
5.  **AI Data Extraction (`aiExtractionService.ts`)**: The image is sent to the chosen Vision Language Model (VLM) via OpenRouter API to extract structured student data as JSON.
6.  **Frontend Review (Client-side, "AI Extract" Tab)**: Extracted student name fields are displayed in an inline control for user review and correction.
7.  **Backend API (`/api/submit-student` using Hono on Bun.js)**: Receives the (potentially corrected) student data and school ID (from settings).
8.  **BEMIS Data Submission (`bemisService.ts`)**: The extracted and formatted data is submitted to the BEMIS portal, handling authentication (using stored session cookie) and CSRF protection.
9.  **Response Handling**: The Hono backend API returns a success or error message to the frontend, displayed in the "AI Extract" tab.

## 1. Authentication and CSRF Management (BEMIS Submission)

Interacting with the BEMIS portal requires handling session cookies and CSRF (Cross-Site Request Forgery) tokens.

*   **Session Management (`authUtils.ts`, `sessionCookieService.ts`)**:
    *   The BEMIS session cookie (including the `XSRF-TOKEN`) is managed via the UI in the "Settings & Model" tab and stored in a local `session.txt` file by the backend.
    *   `getSessionCookie()` (in `authUtils.ts` or `sessionCookieService.ts`): Reads the full cookie string from `session.txt`.
    *   `extractXsrfToken()`: Parses the `XSRF-TOKEN` value from the full cookie string. This token is needed for the `X-XSRF-TOKEN` request header.

*   **CSRF Form Field Token (`csrfUtils.ts`)**:
    *   BEMIS uses a per-form CSRF token (typically named `__RequestVerificationToken`) embedded within the HTML of the student creation modal.
    *   `fetchFormFieldCsrfToken()`:
        1.  Makes a GET request to the BEMIS `StudentCreateModal` page (`/Students/StudentCreateModal?schoolid=...`).
        2.  Sends the main session cookie and the `X-XSRF-TOKEN` header with this GET request.
        3.  Parses the HTML response to extract the value of the `__RequestVerificationToken` input field. This token is then used in the actual POST submission.

## 2. API Key Management (`apiKeyService.ts`)

This service handles the storage and retrieval of OpenRouter API keys, managed via the "Settings & Model" tab.

*   **Storage**: API keys are stored in a JSON file (`api_keys.json`).
*   **Functionality**:
    *   `addApiKey()`: Adds a new key.
    *   `getApiKeys()`: Retrieves all keys.
    *   `getNextApiKey()`: Retrieves the next available key (currently the first one).
    *   `clearApiKeys()`: Removes all keys.
    *   `getApiKeysCount()`: Returns the number of stored keys.
*   **Frontend Integration**: The "Settings & Model" tab uses API endpoints (`/api/settings/apikeys/*`) to interact with this service.

## 3. AI Data Extraction (`aiExtractionService.ts`)

This service is responsible for converting the handwritten form image into structured JSON data.

*   **Model**: Dynamically uses the AI model specified by the user (selected in the "Settings & Model" tab, e.g., `qwen/qwen-vl-max`, `qwen/qwen2.5-vl-72b-instruct:free`) via the OpenRouter API. The `modelName` is passed as a parameter to `extractStudentDataFromImage()`.
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
        *   Includes `id` ("0"), `schoolid` (from "Settings & Model" tab), and the `__RequestVerificationToken`.
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
*   **API Key Management Endpoints (`/api/settings/apikeys/*`)**:
    *   `POST /api/settings/apikeys`: Adds a new API key.
    *   `GET /api/settings/apikeys/count`: Gets the count of stored API keys.
    *   `GET /api/settings/apikeys/current`: Gets the current/next API key (though UI primarily uses count).
    *   `DELETE /api/settings/apikeys`: Removes a specific API key (not currently implemented in UI but backend might support).
*   **Session Cookie Management Endpoint (`/api/settings/session-cookie`)**:
    *   `POST /api/settings/session-cookie`: Saves the provided BEMIS session cookie to `session.txt`.
*   **Static Files**: Serves the `public` directory using `serveStatic` from `hono/bun`.

## 6. Frontend (`public/index.html` & `public/app.js`)

The frontend is a single HTML page (`index.html`) styled with Tailwind CSS and powered by `app.js`.

*   **`index.html`**:
    *   **Landing Page Structure**:
        *   Sticky Header with "AutoFill" title and "Use App" button.
        *   Hero section with title, tagline, and "Get Started Now" button.
        *   Features section highlighting key benefits.
        *   Footer with copyright.
        *   Dynamic background with grid and glowing/animated artifacts.
    *   **Embedded Application Section (`#the-app-section`)**:
        *   Styled to appear as a distinct app area on the page.
        *   Contains tab navigation ("AI Extract", "Settings & Model").
        *   **"AI Extract" Tab**:
            *   Image dropzone (drag & drop, click to browse).
            *   "Scan with Camera" button (for mobile).
            *   Image preview area.
            *   Inline controls for reviewing student's full name and submitting to BEMIS (appear after extraction).
            *   Response areas for AI extraction and BEMIS submission.
        *   **"Settings & Model" Tab**:
            *   Dropdown (`<select id="aiModelSelect">`) for AI model selection.
            *   Input for School ID.
            *   Form for OpenRouter API key management (add key, view count).
            *   Form for BEMIS session cookie management.
            *   Response areas for settings updates.
    *   Full-screen modal for camera capture.

*   **`app.js`**:
    *   **Landing Page Interactivity**:
        *   Smooth scrolling for "Get Started Now" and "Use App" buttons to `#the-app-section`.
        *   Intersection Observer for fade-in animations on landing page sections.
    *   **Application Logic**:
        *   Tab switching between "AI Extract" and "Settings & Model".
        *   Image preview and camera capture functionality.
        *   Drag & drop support for image uploads.
        *   **Settings Management**:
            *   Handles API key addition and count display via `/api/settings/apikeys/*`.
            *   Handles BEMIS session cookie saving via `/api/settings/session-cookie`.
        *   **AI Extraction Trigger**:
            *   Automatically on image selection (file input, drop, or camera capture).
            *   Creates a `FormData` object with the image and selected `aiModel` (from Settings tab).
            *   Makes a `fetch` POST request to `/api/extract-form-data`.
            *   Populates review fields (student full name) with extracted data.
            *   Displays success/error messages in `aiResponseAreaWrapper`.
        *   **BEMIS Submission Trigger**:
            *   On "Submit to BEMIS" button click (in inline controls).
            *   Gathers corrected name data, School ID (from Settings tab), and the full AI-extracted data.
            *   Makes a `fetch` POST request to `/api/submit-student`.
            *   Displays the final success or error message in `bemisResponseAreaWrapper`.
        *   General message display utility for alerts.

## 7. Key Challenges & Solutions During Development

*   **CSRF Protection**: Implemented a two-step fetch for the form-specific token.
*   **BEMIS Error Responses**: Used `Accept: application/json` header.
*   **BEMIS Field Name and Data Quirks**: Iterative testing and prompt refinement.
*   **AI Prompt Engineering**: Extensive iterative refinement of the VLM prompt for accuracy and format.
*   **BEMIS Success Response**: Handled `204 No Content` as success.
*   **Payload Completeness**: `formDataUtils.ts` ensures all keys are sent.
*   **Hono Form Data Handling**: Adapted to Hono's `c.req.formData()` and `File` object.
*   **API Key & Session Cookie Security**: Stored in backend files (`api_keys.json`, `session.txt`), managed via UI and specific API endpoints, rather than exposing directly in frontend JS. Files are gitignored.
*   **Mobile Camera Permissions & HTTPS**: Ensured `isSecureContext` checks and clear error messaging for camera access.
*   **UI Responsiveness & Touch Issues**: Addressed with `event.stopPropagation()` and careful element layering.
*   **Dynamic UI Updates**: Managing visibility and content of inline review controls and response areas.

## 8. Configuration and Setup

*   **BEMIS Session Cookie**: Added via the UI ("Settings & Model" tab).
*   **OpenRouter API Key**: Added via the UI ("Settings & Model" tab).
*   **School ID**: Provided in the UI ("Settings & Model" tab).
*   **AI Model**: Selected from dropdown in UI ("Settings & Model" tab).
*   **Constants (`constants.ts`)**: Defines base URLs, paths, AI model names, etc.
*   **`.env` file (Optional for local dev)**: Can be used for `OPENROUTER_API_KEY` if needed by backend directly, though current flow relies on UI-provided keys.