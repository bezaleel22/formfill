# System Architecture: BEMIS Student Data Automation (Hono on Bun.js)

## 1. Overview

This document outlines the architecture for the BEMIS Student Data Automation tool. The system is designed to automate the submission of student registration data to the BEMIS portal (`https://portal.bemis.com.ng/`) by extracting information from handwritten form images using a user-selectable AI Vision Language Model (VLM) and then programmatically submitting this data. The backend is built with the Hono web framework running on the Bun.js runtime, serving a simple frontend for user interaction.

## 2. Goals

*   Automate student record creation in BEMIS from handwritten form images.
*   Utilize AI (VLM) for accurate data extraction from images, with user-selectable models.
*   Provide a simple web interface for uploading images, managing API keys, and selecting AI models.
*   Handle BEMIS authentication using existing browser sessions for submission.
*   Manage BEMIS CSRF tokens correctly for secure submissions.
*   Maintain a modular and understandable codebase using Hono for a lightweight and fast server.

## 3. System Components

*   **Bun.js Runtime:** The application is executed using Bun.js.
*   **Hono Web Framework:** Used for API routing, request handling, and middleware.
*   **Frontend (HTML, PicoCSS, JavaScript - `public/` directory):**
    *   `public/index.html`: Main user interface for image upload, API key management, AI model selection, and School ID input.
    *   `public/app.js`: Client-side JavaScript for handling form submissions, image preview, camera capture, and displaying results.
*   **AI Extraction Service (`src/aiExtractionService.ts`):**
    *   Communicates with the OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`).
    *   Uses the VLM specified by the `modelName` parameter (e.g., Qwen `qwen-vl-max`, `qwen2.5-vl-72b-instruct:free`).
    *   Converts uploaded images to Data URIs.
    *   Sends images and a detailed prompt to the VLM for data extraction.
    *   Parses the VLM's JSON response.
*   **BEMIS Service (`src/bemisService.ts`):**
    *   Handles all direct interactions with the BEMIS portal for data submission.
    *   Manages authentication (session cookies) and CSRF token fetching.
    *   Submits the extracted student data as `application/x-www-form-urlencoded` payload.
    *   Interprets BEMIS responses.
*   **API Key Service (`src/apiKeyService.ts`):**
    *   Manages OpenRouter API keys stored in `api_keys.json`.
    *   Provides functions to add, retrieve, and count API keys.
*   **Utility Modules:**
    *   `src/authUtils.ts`: Reads BEMIS session cookie from `session.txt` and extracts the XSRF token.
    *   `src/csrfUtils.ts`: Fetches the form-specific `__RequestVerificationToken` from BEMIS.
    *   `src/formDataUtils.ts`: Prepares the `URLSearchParams` payload for BEMIS submission.
*   **Configuration & Data Structures:**
    *   `src/constants.ts`: Defines URLs, paths, AI model names, and other constants.
    *   `src/interfaces.ts`: TypeScript interfaces for `StudentData` and API payloads.
    *   `session.txt` (manual): Stores the user's BEMIS session cookie.
    *   `api_keys.json` (managed by app): Stores OpenRouter API keys.
*   **Main API Server (`src/index.ts` - Hono on Bun.js):**
    *   Sets up the Hono application.
    *   Defines API endpoints:
        *   `/api/extract-form-data`: Handles `multipart/form-data` for image and AI model selection.
        *   `/api/submit-student`: Handles JSON payload for BEMIS submission.
        *   `/api/settings/apikeys/*`: Endpoints for API key management.
    *   Serves static files from the `public` directory.

## 4. Workflow and Data Flow

```mermaid
graph TD
    A[User via Browser (SPA)] -- 1. Upload Image, Select AI Model --> B[Hono Backend API (/api/extract-form-data)];
    B -- 2. Image, API Key (from apiKeyService), Selected AI Model --> C[AI Extraction Service (OpenRouter)];
    C -- 3. Extracted Student JSON --> B;
    B -- 4. Extracted JSON --> A;
    A -- 5. User Reviews/Corrects Data, Enters School ID --> F[Hono Backend API (/api/submit-student)];
    F -- 6. Student Data & School ID --> D[BEMIS Service];
    D -- 6a. Read Session Cookie --> G[session.txt];
    G -- 6b. Session Cookie --> D;
    D -- 6c. Fetch Form CSRF Token --> E[BEMIS Portal];
    E -- 6d. Form CSRF Token --> D;
    D -- 7. Submit Student Data (POST) --> E;
    E -- 8. Submission Response --> D;
    D -- 9. Parsed BEMIS Response --> F;
    F -- 10. Final Result (Success/Error JSON) --> A;

    subgraph Frontend
        A
    end

    subgraph Backend (Hono on Bun.js)
        B
        F
        C
        D
        G
        H[authUtils.ts]
        I[csrfUtils.ts]
        J[formDataUtils.ts]
        K[apiKeyService.ts]
    end
    B --- K; 
    F --- H;
    F --- I;
    D --- H;
    D --- I;


    subgraph External Services
        E
        C
    end
```

### 4.1. User Interaction & AI Extraction (Frontend -> Backend -> AI -> Backend -> Frontend)
1.  The user accesses the SPA.
2.  User manages OpenRouter API keys via the Settings section (interacting with `/api/settings/apikeys/*`).
3.  User selects an image file and chooses an AI model from the dropdown.
4.  On "Extract Data" click, the frontend POSTs `multipart/form-data` (image, model name) to `/api/extract-form-data`.
5.  The Hono backend (`index.ts`):
    *   Retrieves an API key using `apiKeyService`.
    *   Passes the image and selected model name to `aiExtractionService`.
6.  `aiExtractionService` communicates with OpenRouter using the specified model and returns extracted JSON.
7.  The backend sends this JSON back to the frontend.
8.  The frontend displays key fields (like name) for review.

### 4.2. BEMIS Submission (Frontend -> Backend -> BEMIS -> Backend -> Frontend)
1.  User reviews/corrects data and enters the School ID.
2.  On "Submit to BEMIS" click, the frontend POSTs JSON (full extracted data, school ID) to `/api/submit-student`.
3.  The Hono backend (`index.ts`) calls `bemisService.processStudentSubmission()`.
4.  `bemisService` handles BEMIS authentication, CSRF, payload preparation, and submission.
5.  The BEMIS response is processed and sent back to the frontend.
6.  The frontend displays the final result.

## 5. Key Technical Details
*   **API Endpoints**:
    *   `POST /api/extract-form-data`: `multipart/form-data` (image, aiModel).
    *   `POST /api/submit-student`: `application/json` (studentData, schoolId).
    *   `/api/settings/apikeys/*`: For API key CRUD operations.
*   **Static File Serving**: Hono's `serveStatic` for `./public`.
*   **AI Model Selection**: Frontend sends `aiModel` string; backend passes to `aiExtractionService`.

## 6. Error Handling
*   **Hono API Server**: Global `app.onError` and specific endpoint status codes.
*   **Service Level Errors**: Services propagate errors for consistent API responses.
*   **Frontend**: Displays messages from the backend.

## 7. Security Considerations
*   **BEMIS Session Cookie**: `session.txt` is manually managed.
*   **OpenRouter API Keys**: Stored in `api_keys.json` (gitignore recommended), managed via API.
*   **CSRF Protection**: System handles BEMIS's CSRF.

## 8. Future Considerations
*   More robust API key rotation/selection.
*   Advanced input validation.
*   Configuration file for settings.