# System Architecture: AutoFill - BEMIS Student Data Automation (Hono on Bun.js)

## 1. Overview

This document outlines the architecture for AutoFill, a tool designed to automate the submission of student registration data to the BEMIS portal (`https://portal.bemis.com.ng/`). The system extracts information from handwritten form images using a user-selectable AI Vision Language Model (VLM) and then programmatically submits this data.
The application is presented as a SaaS-style landing page with the functional app embedded directly within it. The landing page includes sections like Hero, Features, and the App itself, featuring a modern UI with dynamic backgrounds and animations. The backend is built with the Hono web framework running on the Bun.js runtime.

## 2. Goals

*   Automate student record creation in BEMIS from handwritten form images.
*   Utilize AI (VLM) for accurate data extraction from images, with user-selectable models.
*   Provide an engaging landing page that seamlessly integrates the application.
*   Offer a simple web interface within the embedded app for:
    *   Uploading images (drag & drop, file browse, camera scan).
    *   Managing OpenRouter API keys.
    *   Selecting AI models.
    *   Inputting School ID.
    *   Reviewing and submitting extracted data.
*   Handle BEMIS authentication using user-provided session cookies for submission.
*   Manage BEMIS CSRF tokens correctly for secure submissions.
*   Maintain a modular and understandable codebase using Hono for a lightweight and fast server.

## 3. System Components

*   **Bun.js Runtime:** The application is executed using Bun.js.
*   **Hono Web Framework:** Used for API routing, request handling, and middleware.
*   **Frontend (HTML, Tailwind CSS, JavaScript - `public/` directory):**
    *   `public/index.html`: Main HTML file structured as a landing page with:
        *   **Landing Sections:** Hero, Features, Footer with dynamic backgrounds and animations.
        *   **Embedded Application Section:** Contains the core AutoFill tool.
            *   **AI Extract Tab:** Image upload (dropzone, file input, camera), image preview, AI extraction results, inline name review, and BEMIS submission button.
            *   **Settings & Model Tab:** AI model selection, School ID input, OpenRouter API key management, BEMIS session cookie management.
    *   `public/app.js`: Client-side JavaScript for:
        *   Landing page interactivity (smooth scrolling, fade-in animations via Intersection Observer).
        *   Handling app logic: tab switching, form submissions, image preview, camera capture, AI data extraction requests, BEMIS submission requests, and displaying results/messages.
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
*   **Session Cookie Service (`src/sessionCookieService.ts` - Implied, or part of `authUtils`):**
    *   Manages BEMIS session cookie stored in `session.txt`.
*   **Utility Modules:**
    *   `src/authUtils.ts`: Reads BEMIS session cookie from `session.txt` and extracts the XSRF token.
    *   `src/csrfUtils.ts`: Fetches the form-specific `__RequestVerificationToken` from BEMIS.
    *   `src/formDataUtils.ts`: Prepares the `URLSearchParams` payload for BEMIS submission.
*   **Configuration & Data Structures:**
    *   `src/constants.ts`: Defines URLs, paths, AI model names, and other constants.
    *   `src/interfaces.ts`: TypeScript interfaces for `StudentData` and API payloads.
    *   `session.txt` (managed by app via UI): Stores the user's BEMIS session cookie.
    *   `api_keys.json` (managed by app via UI): Stores OpenRouter API keys.
*   **Main API Server (`src/index.ts` - Hono on Bun.js):**
    *   Sets up the Hono application.
    *   Defines API endpoints:
        *   `/api/extract-form-data`: Handles `multipart/form-data` for image and AI model selection.
        *   `/api/submit-student`: Handles JSON payload for BEMIS submission.
        *   `/api/settings/apikeys/*`: Endpoints for API key management.
        *   `/api/settings/session-cookie`: Endpoint for BEMIS session cookie management.
    *   Serves static files from the `public` directory.

## 4. Workflow and Data Flow

```mermaid
graph TD
    A[User via Browser (Landing Page & Embedded App)] -- 1. Upload Image (triggers auto-extraction) --> B[Hono Backend API (/api/extract-form-data)];
    A -- "(Settings Tab: Manage API Keys, Session Cookie, School ID, AI Model)" --> B_Settings[Hono Backend API (/api/settings/*)];
    B -- 2. Image, API Key (from apiKeyService), Selected AI Model --> C_AI[AI Extraction Service (OpenRouter)];
    C_AI -- 3. Extracted Student JSON --> B;
    B -- 4. Extracted JSON --> A;
    A -- 5. User Reviews/Corrects Name (inline), Clicks Submit --> F[Hono Backend API (/api/submit-student)];
    F -- 6. Student Data & School ID (from Settings Tab) --> D_BEMIS[BEMIS Service];
    D_BEMIS -- 6a. Read Session Cookie (from sessionCookieService) --> G_SessionFile[session.txt];
    G_SessionFile -- 6b. Session Cookie --> D_BEMIS;
    D_BEMIS -- 6c. Fetch Form CSRF Token --> E_BEMIS_Portal[BEMIS Portal];
    E_BEMIS_Portal -- 6d. Form CSRF Token --> D_BEMIS;
    D_BEMIS -- 7. Submit Student Data (POST) --> E_BEMIS_Portal;
    E_BEMIS_Portal -- 8. Submission Response --> D_BEMIS;
    D_BEMIS -- 9. Parsed BEMIS Response --> F;
    F -- 10. Final Result (Success/Error JSON) --> A;

    subgraph Frontend (Single Page Application)
        A
    end

    subgraph Backend (Hono on Bun.js)
        B
        B_Settings
        F
        C_AI
        D_BEMIS
        G_SessionFile
        H[authUtils.ts]
        I[csrfUtils.ts]
        J[formDataUtils.ts]
        K[apiKeyService.ts]
        L[sessionCookieService.ts]
    end
    B --- K;
    F --- H;
    F --- I;
    D_BEMIS --- H;
    D_BEMIS --- I;
    D_BEMIS --- L;
    L --- G_SessionFile;


    subgraph External Services
        E_BEMIS_Portal
        C_OpenRouter[OpenRouter API]
    end
    C_AI --- C_OpenRouter;
```

### 4.1. User Interaction & AI Extraction
1.  The user interacts with the landing page (Hero, Features).
2.  User navigates/scrolls to the embedded application section.
3.  **Settings Management (Settings & Model Tab):**
    *   User manages OpenRouter API keys (interacting with `/api/settings/apikeys/*`).
    *   User manages BEMIS session cookie (interacting with `/api/settings/session-cookie`).
    *   User sets the School ID.
    *   User selects an AI model from the dropdown.
4.  **AI Extraction (AI Extract Tab):**
    *   User uploads an image file (drag & drop, browse, or camera). This automatically triggers data extraction.
    *   The frontend POSTs `multipart/form-data` (image, selected AI model from settings tab) to `/api/extract-form-data`.
5.  The Hono backend (`index.ts`):
    *   Retrieves an API key using `apiKeyService`.
    *   Passes the image and selected AI model to `aiExtractionService`.
6.  `aiExtractionService` communicates with OpenRouter and returns extracted JSON.
7.  The backend sends this JSON back to the frontend.
8.  The frontend displays key fields (like student's full name) for review in an inline control.

### 4.2. BEMIS Submission
1.  User reviews/corrects the student's full name in the inline input.
2.  On "Submit to BEMIS" click (icon button), the frontend POSTs JSON (full extracted data including reviewed name, school ID from settings tab) to `/api/submit-student`.
3.  The Hono backend (`index.ts`) calls `bemisService.processStudentSubmission()`.
4.  `bemisService` handles BEMIS authentication (using session cookie from `sessionCookieService`), CSRF token fetching, payload preparation, and submission.
5.  The BEMIS response is processed and sent back to the frontend.
6.  The frontend displays the final result in the BEMIS response area.

## 5. Key Technical Details

*   **API Endpoints**:
    *   `POST /api/extract-form-data`: `multipart/form-data` (image, aiModel).
    *   `POST /api/submit-student`: `application/json` (studentData, schoolId).
    *   `/api/settings/apikeys/*`: For API key CRUD operations.
    *   `POST /api/settings/session-cookie`: For saving BEMIS session cookie.
    *   `GET /api/settings/apikeys/count`: For fetching API key count.
*   **Static File Serving**: Hono's `serveStatic` for `./public`.
*   **AI Model Selection**: Frontend sends `aiModel` string (read from select in Settings tab); backend passes to `aiExtractionService`.
*   **UI Interactivity**: Smooth scrolling, Intersection Observer for fade-in animations, tabbed interface for app sections.

## 6. Error Handling

*   **Hono API Server**: Global `app.onError` and specific endpoint status codes.
*   **Service Level Errors**: Services propagate errors for consistent API responses.
*   **Frontend**: Displays user-friendly messages from the backend in designated alert areas.

## 7. Security Considerations

*   **BEMIS Session Cookie**: Stored in `session.txt`, managed via the UI. File should be gitignored.
*   **OpenRouter API Keys**: Stored in `api_keys.json`, managed via the UI. File should be gitignored.
*   **CSRF Protection**: System handles BEMIS's CSRF tokens for submissions.
*   Input validation on frontend and backend (basic).

## 8. Future Considerations

*   More robust API key rotation/selection if multiple keys are used actively.
*   Advanced input validation and sanitization.
*   User accounts if multiple users need to use the tool with separate settings.
*   More sophisticated background animations or artifact interactions.
