import type { StudentData } from "./interfaces";
import { DEFAULT_AI_MODEL } from "./constants";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function bufferToDataURI(
  buffer: Buffer,
  mimeType: string = "image/png"
): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

const moreSimplifiedPromptText = `
Analyze the provided image of a handwritten student registration form.

Extract all fields and return them as a JSON object that conforms to this TypeScript interface.
Ensure all field names in the JSON output *exactly* match the field names in the interface, including capitalization and any typos like "MotherOccption".

interface StudentData {
    id: string; // Default: "0"
    "student.SchoolId": string; // Default: ""
    "student.Surname": string; // Convert to UPPERCASE
    "student.FirstName": string; // Convert to UPPERCASE
    "student.OtherName"?: string; // Convert to UPPERCASE
    "student.Email"?: string;
    "student.Gender": string; // Use "0" for Female, "1" for Male. If unsure, use "0".
    "student.DateOfBirth"?: string; // Format: YYYY-MM-DD
    "student.Religion": string;
    "student.Nationality": string; // Default: "Nigerian"
    "student.OriginState": string;
    "student.OriginLGA": string;
    "student.MotherTongue"?: string;
    "student.DisabilityGroup"?: string; // e.g., "None" or specific disability
    "student.FathersName": string; // Convert to UPPERCASE
    "student.MotherName": string; // Convert to UPPERCASE
    "student.FathersOccupation": string;
    "student.MotherOccption"?: string; // IMPORTANT: Note the typo "MotherOccption"
    "student.GuardianName": string; // Convert to UPPERCASE
    "student.GuardianOccupation": string;
    "student.GuardianRelationship"?: string;
    "student.GuardianPhoneNumber"?: string;
    "student.MobileNumber"?: string;
    "student.HomeAddress"?: string; 
    "student.Street": string; 
    "student.City": string; 
    "student.ResidenceState"?: string;
    "student.Section": string; 
    "student.Class": string; 
    "student.House"?: string;
    "student.Sport"?: string;
    "student.Club"?: string;
    "student.AdmissionNumber"?: string;
    "student.DateOfAdmission"?: string; // Format: YYYY (e.g., "2019") - Extract ONLY THE YEAR.
    "student.PreviousSchoolAttended"?: string;
    "student.PreviousClass"?: string;
    "student.Repeater": string; // "true" or "false". Required.
    "student.SpecialNeed"?: string; 
    "student.MediumOfInstruction"?: string;
    "student.BloodGroup"?: string; // e.g., "A", "B", "O", "AB". Avoid suffixes like "+" or "-".
    "student.Genotype"?: string;
    "student.Allergies"?: string;
    "student.MedicalConditions"?: string;
    "student.Medications"?: string;
    "student.EmergencyContactName"?: string; // Convert to UPPERCASE
    "student.EmergencyContactPhone"?: string;
    "student.EmergencyContactRelationship"?: string;
    "student.TransportMeans"?: string;
    "student.Notes"?: string; 
}

Guidelines:

1. Field Name Exactness: Pay EXTREME attention to matching the field names EXACTLY as in the interface, especially "student.MotherOccption".

2. Name Field Uppercasing:
   - Convert the values for the following fields to ALL UPPERCASE:
     - "student.Surname"
     - "student.FirstName"
     - "student.OtherName" (if present)
     - "student.FathersName"
     - "student.MotherName"
     - "student.GuardianName"
     - "student.EmergencyContactName" (if present)
   - For example, if "John Doe" is extracted for "student.FirstName", it should be output as "JOHN DOE".

3. Email Handling:
   - For "student.Email": If multiple email addresses are written (e.g., separated by "/", ",", "and", or on separate lines), extract ONLY THE FIRST one listed for the "student.Email" field.
   - If additional email addresses are present after the first, append them to the "student.Notes" field, prefixed with "Additional emails: ".
   - If only one email is present, use that for "student.Email".
   - If no email is found, omit "student.Email" or use "Nil".

4. Phone Number Handling (student.GuardianPhoneNumber, student.MobileNumber, student.EmergencyContactPhone):
   - If multiple phone numbers are written for any single phone number field, extract ONLY THE FIRST one listed for that specific field.
   - If additional phone numbers are present for that specific field, append them to "student.Notes" field, prefixed with a description like "Additional Guardian Phone: ...".

5. Date Handling:
   - "student.DateOfBirth": Extract in "YYYY-MM-DD" format.
   - "student.DateOfAdmission": Extract ONLY THE YEAR (YYYY format, e.g., "2019"). If a full date is written, just take the year part. If illegible or not present, omit or use "Nil".

6. State Names:
   - For "student.OriginState" and "student.ResidenceState": If the extracted state name includes " State" at the end (e.g., "Imo State"), remove the " State" suffix to leave just the name (e.g., "Imo").

7. Guardian Info:
   - If no guardian info is given or marked "same as father", use father's name and occupation for guardian.
   - Otherwise, use written guardian details.

8. Class & Section Mapping:
   Use only the handwritten class value (case-insensitive) to determine both Section and Class. Ensure the output casing for Section matches BEMIS examples (e.g., "lower Basic", "middle Basic").
   - PRE-NURSERY / CRECHE → Class: "PRE-NURSERY", Section: "lower Basic"
   - NURSERY / KINDERGARTEN / PREPARATORY / GRADE K → Class: "Kindergarten", Section: "lower Basic"
   - GRADE 1 / BASIC 1 / 1 → Class: "Basic 1", Section: "lower Basic"
   - GRADE 2 / BASIC 2 / 2 → Class: "Basic 2", Section: "lower Basic"
   - GRADE 3 / BASIC 3 / 3 → Class: "Basic 3", Section: "lower Basic"
   - GRADE 4 / BASIC 4 / 4 → Class: "Basic 4", Section: "middle Basic"
   - GRADE 5 / BASIC 5 / 5 → Class: "Basic 5", Section: "middle Basic"
   - GRADE 6 / BASIC 6 / 6 → Class: "Basic 6", Section: "middle Basic"

9. PreviousClass Mapping:
   - If Previous Class is present, apply the same mapping rules used for Class.

10. Address Handling:
    - "student.Street" and "student.City" are required. If blank on form, use an empty string "".

11. Blood Group:
    - For "student.BloodGroup", extract only the letter part (A, B, O, AB). Do not include "+" or "-" signs or "positive"/"negative".

12. General Rules:
    - For missing/optional fields (those with '?' in the interface), omit them from the JSON or use "Nil" if not specified.
    - Required fields (student.Surname, student.FirstName, student.Gender, student.DateOfBirth, student.Religion, student.Nationality, student.OriginState, student.OriginLGA, student.FathersName, student.MotherName, student.FathersOccupation, student.GuardianName, student.GuardianOccupation, student.Street, student.City, student.Section, student.Class, student.Repeater) MUST have a value. If the handwritten value for a required field is blank or illegible, use "Nil" or an empty string "" as appropriate for that field, but the key MUST be present in the JSON.
    - Gender ("student.Gender") must be "0" for Female and "1" for Male. If unsure or not specified, default to "0".
    - The output MUST be a single valid JSON object. Do not include any explanatory text before or after the JSON.
`;

export async function extractStudentDataFromImage(
  imageBuffer: Buffer,
  apiKey: string,
  selectedAiModel: string
): Promise<StudentData | null> {
  console.log(
    "AI Extraction Service: Called. API Key starts with:",
    apiKey.substring(0, 5)
  );
  const imageDataURI = bufferToDataURI(imageBuffer);

  const payload = {
    model: selectedAiModel ?? DEFAULT_AI_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: moreSimplifiedPromptText,
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataURI,
            },
          },
        ],
      },
    ],
    max_tokens: 4000,
  };

  try {
    console.log(
      "AI Extraction Service: Sending request to OpenRouter (refined prompt v6 - UPPERCASE names)..."
    ); // Corrected log message
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `AI Extraction Service: OpenRouter API error! Status: ${response.status}`,
        errorBody
      );
      throw new Error(
        `OpenRouter API request failed with status ${
          response.status
        }: ${errorBody.substring(0, 200)}`
      );
    }

    const result = await response.json();
    console.log("AI Extraction Service: Received response from OpenRouter.");

    if (
      result.choices &&
      result.choices.length > 0 &&
      result.choices[0].message &&
      result.choices[0].message.content
    ) {
      const messageContent = result.choices[0].message.content;
      console.log("AI Extraction Service: Model output:", messageContent);

      let extractedJsonString = messageContent;
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        extractedJsonString = jsonMatch[1];
      }

      try {
        const extractedData = JSON.parse(extractedJsonString);

        if (typeof extractedData === "object" && extractedData !== null) {
          if (!extractedData.hasOwnProperty("id")) {
            extractedData.id = "0";
          }
          if (!extractedData.hasOwnProperty("student.SchoolId")) {
            extractedData["student.SchoolId"] = "";
          }

          const requiredInterfaceKeys: Array<keyof StudentData> = [
            "student.Surname",
            "student.FirstName",
            "student.Gender",
            "student.DateOfBirth",
            "student.Religion",
            "student.Nationality",
            "student.OriginState",
            "student.OriginLGA",
            "student.FathersName",
            "student.MotherName",
            "student.FathersOccupation",
            "student.GuardianName",
            "student.GuardianOccupation",
            "student.Street",
            "student.City",
            "student.Section",
            "student.Class",
            "student.Repeater",
          ];
          for (const reqKey of requiredInterfaceKeys) {
            if (!extractedData.hasOwnProperty(reqKey)) {
              console.warn(
                `AI Extraction Service: AI output missing required key "${reqKey}". Defaulting to empty string.`
              );
              extractedData[reqKey] = "";
            }
          }

          console.log(
            "AI Extraction Service: Successfully parsed student data (refined prompt v6)."
          ); // Corrected log message
          return extractedData as StudentData;
        } else {
          console.warn(
            "AI Extraction Service: Parsed data is not an object:",
            extractedData
          );
          return null;
        }
      } catch (parseError) {
        console.error(
          "AI Extraction Service: Failed to parse JSON from model response:",
          parseError,
          "\nRaw content:",
          messageContent
        );
        return null;
      }
    } else {
      console.warn(
        "AI Extraction Service: No valid content in OpenRouter response choices.",
        result
      );
      return null;
    }
  } catch (error) {
    console.error(
      "AI Extraction Service: Error during API call or processing:",
      error
    );
    return null;
  }
}
