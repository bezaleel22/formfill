# BEMIS Student Form AI Extractor & Submitter (Hono Version)

This project provides a REST API and a basic SPA to automate the submission of the "Create New Student" form on the BEMIS portal (`https://portal.bemis.com.ng/`). It is built using Bun.js, TypeScript, and the Hono web framework. A key feature is the AI-driven extraction of student data from handwritten form images.

## Features

*   **AI-Powered Data Extraction:** Utilizes multimodal AI models (via OpenRouter API) to extract student data directly from uploaded images of handwritten forms.
*   **Configurable AI Model:** The UI allows selection between different compatible AI models for extraction (e.g., Qwen-VL-Max, Qwen2.5-VL-Instruct).
*   **Hono Framework:** Employs the Hono web framework for routing and request handling, offering a lightweight and fast server.
*   **Core BEMIS Submission Logic:** Interacts directly with the BEMIS web server by making HTTP requests.
*   **Session & CSRF Handling:** Manages session cookies and CSRF tokens required by BEMIS.
*   **REST API:**
    *   `POST /api/extract-form-data`: Receives an image file and selected AI model, returns extracted student data (JSON).
    *   `POST /api/submit-student`: Receives extracted student data (JSON) and processes the submission to BEMIS.
    *   API Key Management Endpoints (e.g., `POST /api/settings/apikeys`, `GET /api/settings/apikeys/count`): For managing OpenRouter API keys.
*   **SPA (Basic):** A Single Page Application (styled with Pico.css) for image upload, AI model selection, API key management, data review, and initiating BEMIS submission.
*   **Modular Design:** Code is organized into services (AI extraction, BEMIS interaction, API key management), utilities, and API routing.

## Prerequisites

*   **Bun.js:** Ensure Bun.js is installed ([https://bun.sh/](https://bun.sh/)).
*   **Active BEMIS Portal Session:** A valid session cookie from an active BEMIS portal login is required for BEMIS submission.
*   **OpenRouter API Key:** An API key from [OpenRouter.ai](https://openrouter.ai/) is required for the AI data extraction feature. This can be added via the SPA's settings section.

## Setup

1.  **Clone/Download Files.**
2.  **Install Dependencies:**
    ```bash
    bun install
    ```
3.  **Obtain BEMIS Session Cookie (for BEMIS submission):**
    *   Log in to `https://portal.bemis.com.ng/`.
    *   Use browser developer tools (Network tab) to find and copy the **entire value** of the `Cookie` request header for a portal request.
    *   Example: `.AspNetCore.Antiforgery.abcdef=XYZ123; XSRF-TOKEN=verylongtokenstring; .AspNetCore.Identity.Application=anotherverylongidentitystring;`
4.  **Create `session.txt` (for BEMIS submission):**
    *   In the project root, create `session.txt`.
    *   Paste the full BEMIS session cookie string into this file and save. (This file is gitignored).
5.  **API Keys (for AI Extraction):**
    *   OpenRouter API keys are managed via the application's UI (Settings section) or by pre-populating `api_keys.json` (see `src/apiKeyService.ts`).

## Running the API Server

*   **Development Mode (with auto-restart):**
    ```bash
    bun dev
    ```
*   **Production/Standard Mode:**
    ```bash
    bun start
    ```
The server will start (typically on `http://localhost:3000`).

## Using the Application & API

The primary way to use the application is through the SPA available at `http://localhost:3000/`.

### SPA Functionality:
1.  **Settings:** Add your OpenRouter API key.
2.  **AI Form Data Extraction:**
    *   Upload an image of the handwritten student form.
    *   Select the desired AI model from the dropdown.
    *   Click "Extract Data with AI".
    *   The extracted data (student name fields) will be shown for review.
3.  **Review & Submit to BEMIS:**
    *   Correct any inaccuracies in the displayed name fields.
    *   Enter the BEMIS School ID.
    *   Click "Submit to BEMIS".

### API Endpoints:

#### `POST /api/extract-form-data`
*   **Method:** `POST`
*   **Content-Type:** `multipart/form-data`
*   **Description:** Extracts student data from an uploaded image using the specified AI model.
*   **Form Data Fields:**
    *   `formImage`: The image file.
    *   `aiModel`: (String) The name of the AI model to use (e.g., "qwen/qwen-vl-max").
*   **Success Response (200 OK):** `{ "success": true, "message": "Data extracted successfully.", "studentData": { ... } }`
*   **Error Response:** `{ "success": false, "message": "...", "errorDetails": { ... } }`

#### `POST /api/submit-student`
*   **Method:** `POST`
*   **Content-Type:** `application/json`
*   **Description:** Submits new student data (previously extracted by AI) to BEMIS.
*   **Request Body (JSON):**
    ```json
    {
      "schoolId": "YOUR_SCHOOL_ID", // e.g., "193"
      "studentData": { // The JSON object from /api/extract-form-data
        "id": "0",
        "student.SchoolId": "", // Will be populated by BEMIS logic if schoolId is provided
        "student.Surname": "ActualSurname",
        // ... other student fields (see src/interfaces.ts)
      }
    }
    ```
*   **Success Response (e.g., 200, 204 from BEMIS):** `{ "success": true, "message": "...", "status": BEMIS_HTTP_STATUS, "data": BEMIS_RESPONSE_DATA }`
*   **Error Response (e.g., 400, 401, 500):** `{ "success": false, "message": "...", "status": BEMIS_HTTP_STATUS, "data": BEMIS_ERROR_DATA }`

#### API Key Management (Example: `POST /api/settings/apikeys`)
*   Used by the SPA to manage OpenRouter API keys. See `src/index.ts` for details.

## Development

*   **Main Server & API (Hono):** `src/index.ts`
*   **AI Data Extraction Logic:** `src/aiExtractionService.ts`
*   **BEMIS Interaction Logic:** `src/bemisService.ts`
*   **API Key Management:** `src/apiKeyService.ts`
*   **Utilities:** `src/authUtils.ts`, `src/csrfUtils.ts`, `src/formDataUtils.ts`
*   **Constants & Interfaces:** `src/constants.ts`, `src/interfaces.ts`
*   **Static SPA Files:** `public/` directory (`index.html`, `app.js`).

This project was bootstrapped with `bun init`.
