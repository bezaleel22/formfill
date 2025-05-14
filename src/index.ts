import { Hono } from "hono";
import { serveStatic } from "hono/bun"; // For serving static files with Bun
import { secureHeaders } from "hono/secure-headers"; // Optional: for security headers
import { logger } from "hono/logger"; // Optional: for logging
import fs from "fs/promises"; // For writing to session.txt

import type { StudentData } from "./interfaces";
import { processStudentSubmission } from "./bemisService";
import { extractStudentDataFromImage } from "./aiExtractionService";
import * as apiKeyService from "./apiKeyService";
import { DEFAULT_AI_MODEL } from "./constants"; // Import DEFAULT_AI_MODEL

const app = new Hono();
const port = parseInt(process.env.PORT || "3000", 10);

// Middleware
app.use("*", logger()); // Log all requests
app.use("*", secureHeaders()); // Apply security headers

// --- API Routes ---

// BEMIS Submission API
app.post("/api/submit-student", async (c) => {
  const body = await c.req.json();
  const { schoolId, studentData } = body;

  if (!schoolId || !studentData) {
    return c.json(
      { success: false, message: "School ID and student data are required." },
      400
    );
  }

  try {
    const bemisResponse = await processStudentSubmission(
      studentData as StudentData,
      schoolId
    );
    // Return the full response from bemisService, using its status
    return c.json(
      {
        success: bemisResponse.success,
        message: bemisResponse.message,
        status: bemisResponse.status, // BEMIS status
        data: bemisResponse.data, // BEMIS data (e.g. error details)
      },
      (bemisResponse.status || (bemisResponse.success ? 200 : 500)) as any // Use BEMIS status or default
    );
  } catch (error: any) {
    console.error("BEMIS Submission Endpoint Error:", error);
    return c.json(
      {
        success: false,
        message: `Server error during BEMIS submission: ${error.message}`,
      },
      500
    );
  }
});

// AI Form Data Extraction API
app.post("/api/extract-form-data", async (c) => {
  const formData = await c.req.formData();
  const formImageFile = formData.get("formImage");
  const aiModelFromForm = formData.get("aiModel") as string | null; // Explicitly type

  let selectedAiModel = DEFAULT_AI_MODEL; // Use default from constants
  if (
    aiModelFromForm &&
    typeof aiModelFromForm === "string" &&
    aiModelFromForm.trim() !== ""
  ) {
    selectedAiModel = aiModelFromForm.trim();
  }
  console.log(`AI Extraction: Using AI Model: ${selectedAiModel}`);

  if (!formImageFile || !(formImageFile instanceof File)) {
    return c.json(
      {
        success: false,
        message: "No image file uploaded or invalid file type.",
      },
      400
    );
  }

  const apiKey =
    process.env.OPENROUTER_API_KEY || (await apiKeyService.getNextApiKey());
  if (!apiKey) {
    return c.json(
      {
        success: false,
        message:
          "No API key configured for AI service. Please add one in Settings.",
      },
      500
    );
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(await formImageFile.arrayBuffer());
  } catch (bufferError: any) {
    console.error(
      "AI Extraction Endpoint: Error creating buffer from image file:",
      bufferError
    );
    return c.json(
      {
        success: false,
        message: `Error processing image file: ${bufferError.message}`,
      },
      500
    );
  }

  try {
    // Pass selectedAiModel to the extraction service
    const extractedData = await extractStudentDataFromImage(
      imageBuffer,
      apiKey,
      selectedAiModel
    );

    if (extractedData) {
      console.log(
        "AI Extracted Data (to be sent to client):",
        JSON.stringify(extractedData, null, 2)
      );
      return c.json(
        {
          success: true,
          message: "Data extracted successfully.",
          studentData: extractedData,
        },
        200
      );
    } else {
      // This case should ideally be covered by errors thrown from extractStudentDataFromImage
      return c.json(
        {
          success: false,
          message:
            "Could not extract data from image. AI service returned no data.",
        },
        400 // Or 500 if it's an unexpected server-side AI issue
      );
    }
  } catch (aiError: any) {
    console.error(
      `AI Extraction Service Error in Endpoint /api/extract-form-data (Model: ${selectedAiModel}):`,
      aiError
    );
    return c.json(
      {
        success: false,
        message:
          aiError.message ||
          `An error occurred during AI processing with model ${selectedAiModel}.`,
        errorDetails: aiError.cause, // Include cause if available (e.g., from OpenRouter API error)
      },
      500
    ); // Internal Server Error for AI failures
  }
});

// --- API Key Management Endpoints ---
// These paths (/api/settings/apikeys) are already as per the existing file and frontend expectations.
// No changes needed here based on the feedback.
app.post("/api/settings/apikeys", async (c) => {
  const body = await c.req.json();
  const { apiKey: apiKeyToAdd } = body;

  if (!apiKeyToAdd || typeof apiKeyToAdd !== "string") {
    // Ensure it's a string
    return c.json(
      { success: false, message: "API key is required and must be a string." },
      400
    );
  }
  try {
    const result = await apiKeyService.addApiKey(apiKeyToAdd);
    return c.json(
      result,
      result.success
        ? 201
        : result.message.includes("already exists")
        ? 409
        : 400
    );
  } catch (error: any) {
    console.error("Add API Key Endpoint Error:", error);
    return c.json(
      { success: false, message: `Server error: ${error.message}` },
      500
    );
  }
});

app.get("/api/settings/apikeys/count", async (c) => {
  try {
    const count = await apiKeyService.getApiKeysCount();
    return c.json({ success: true, count }, 200);
  } catch (error: any) {
    console.error("Get API Key Count Endpoint Error:", error);
    return c.json(
      { success: false, message: `Server error: ${error.message}` },
      500
    );
  }
});

// Endpoint for the frontend to fetch the current/next API key
app.get("/api/settings/apikeys/current", async (c) => {
  try {
    const apiKey = await apiKeyService.getNextApiKey(); // Or getFirstApiKey if that's more appropriate
    if (apiKey) {
      return c.json({ success: true, apiKey: apiKey });
    } else {
      return c.json({ success: false, message: "No API Key available." }, 404);
    }
  } catch (error: any) {
    console.error("Get Current API Key Endpoint Error:", error);
    return c.json(
      { success: false, message: `Server error: ${error.message}` },
      500
    );
  }
});

app.delete("/api/settings/apikeys", async (c) => {
  const body = await c.req.json();
  const { apiKey: apiKeyToRemove } = body;

  if (!apiKeyToRemove || typeof apiKeyToRemove !== "string") {
    // Ensure it's a string
    return c.json(
      {
        success: false,
        message: "API key to remove is required and must be a string.",
      },
      400
    );
  }
  try {
    const result = await apiKeyService.removeApiKey(apiKeyToRemove);
    return c.json(
      result,
      result.success ? 200 : result.message.includes("not found") ? 404 : 400
    );
  } catch (error: any) {
    console.error("Remove API Key Endpoint Error:", error);
    return c.json(
      { success: false, message: `Server error: ${error.message}` },
      500
    );
  }
});

// --- BEMIS Session Cookie Management Endpoint ---
app.post("/api/settings/session-cookie", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionCookie } = body;

    if (!sessionCookie || typeof sessionCookie !== 'string' || sessionCookie.trim() === '') {
      return c.json({ success: false, message: "Session cookie is required and must be a non-empty string." }, 400);
    }

    await fs.writeFile("session.txt", sessionCookie.trim());
    console.log("BEMIS session.txt updated successfully.");
    return c.json({ success: true, message: "BEMIS session cookie saved successfully." }, 200);

  } catch (error: any) {
    console.error("Save Session Cookie Endpoint Error:", error);
    // Check if it's a JSON parsing error
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return c.json({ success: false, message: "Invalid JSON payload." }, 400);
    }
    return c.json(
      { success: false, message: `Server error saving session cookie: ${error.message}` },
      500
    );
  }
});

// Static file serving for the frontend
app.use("/*", serveStatic({ root: "./public" }));
app.get("*", serveStatic({ path: "./public/index.html" }));

console.log(`Server running at http://localhost:${port}`);

apiKeyService
  .getApiKeys()
  .then((keys) => {
    if (keys.length === 0) {
      console.log(
        "api_keys.json is empty or does not exist. API keys can be added via the settings UI or API."
      );
    } else {
      console.log(`Loaded ${keys.length} API key(s).`);
    }
  })
  .catch((err) => {
    console.error("Failed to initialize API key service on startup:", err);
  });

export default {
  port: port,
  fetch: app.fetch,
};
