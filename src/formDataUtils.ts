import type { StudentData } from './interfaces';
import { CSRF_FORM_FIELD_NAME } from './constants';

/**
 * Defines all possible keys that BEMIS expects for student data submission,
 * matching the StudentData interface.
 */
const ALL_STUDENT_DATA_KEYS: Array<keyof StudentData> = [
    "id",
    "student.SchoolId",
    "student.Surname",
    "student.FirstName",
    "student.OtherName",
    "student.Email",
    "student.Gender",
    "student.DateOfBirth",
    "student.Religion",
    "student.Nationality",
    "student.OriginState",
    "student.OriginLGA",
    "student.MotherTongue",
    "student.DisabilityGroup",
    "student.FathersName",
    "student.MotherName",
    "student.FathersOccupation",
    "student.MotherOccption", // BEMIS typo
    "student.GuardianName",
    "student.GuardianOccupation",
    "student.GuardianRelationship",
    "student.GuardianPhoneNumber",
    "student.MobileNumber",
    "student.HomeAddress",
    "student.Street",
    "student.City",
    "student.ResidenceState",
    "student.Section",
    "student.Class",
    "student.House",
    "student.Sport",
    "student.Club",
    "student.AdmissionNumber",
    "student.DateOfAdmission", // Renamed from AdmissionDate
    "student.PreviousSchoolAttended", // Renamed from PreviousSchool
    "student.PreviousClass",
    "student.Repeater",
    "student.SpecialNeed",
    "student.MediumOfInstruction",
    "student.BloodGroup",
    "student.Genotype",
    "student.Allergies", // Renamed from KnownAllergies
    "student.MedicalConditions",
    "student.Medications",
    "student.EmergencyContactName",
    "student.EmergencyContactPhone",
    "student.EmergencyContactRelationship",
    "student.TransportMeans",
    "student.Notes"
];


/**
 * Prepares the URLSearchParams payload for the student creation POST request.
 * Ensures all expected BEMIS fields are present in the payload, even if empty.
 * @param {StudentData} studentDetails The student's information.
 * @param {string} schoolId The ID of the school.
 * @param {string} formFieldCsrfToken The value of the __RequestVerificationToken from the form.
 * @returns {URLSearchParams} The prepared form data.
 */
export function prepareStudentDataPayload(
  studentDetails: StudentData,
  schoolId: string,
  formFieldCsrfToken: string,
): URLSearchParams {
  const payload = new URLSearchParams();

  // Append static and CSRF fields first
  payload.append('id', studentDetails.id || "0");
  payload.append('schoolid', schoolId);
  payload.append(CSRF_FORM_FIELD_NAME, formFieldCsrfToken);

  // Iterate over all defined StudentData keys to ensure they are all in the payload
  for (const key of ALL_STUDENT_DATA_KEYS) {
    if (key === 'id') continue;

    const value = studentDetails[key];
    
    if (key === "student.SchoolId") {
        payload.append(key, typeof value === 'string' ? value : ""); 
    } else if (value !== undefined && value !== null) {
        payload.append(key, String(value));
    } else {
        // If the field is optional or can be empty, send an empty string.
        // BEMIS expects the key to be present.
        payload.append(key, ""); 
    }
  }
  
  // Define required fields based on the updated interface and BEMIS expectations.
  // This list should align with fields that MUST have a value sent to BEMIS,
  // even if it's an empty string (which the loop above handles if AI omits a key).
  // The primary purpose of this safeguard loop is less critical now that the AI prompt
  // and the main loop are more robust, but it's a good check.
  const requiredFieldsFromInterface: Array<keyof StudentData> = [
    "student.Surname", "student.FirstName", "student.Gender", "student.DateOfBirth", 
    "student.Religion", "student.Nationality", "student.OriginState", "student.OriginLGA", 
    "student.FathersName", "student.MotherName", "student.FathersOccupation", 
    "student.GuardianName", "student.GuardianOccupation", "student.Street", "student.City", 
    "student.Section", "student.Class", "student.Repeater"
    // Note: student.MotherOccption is optional in the interface due to its nature,
    // but if BEMIS *requires* the key, the main loop handles it.
    // This list reflects fields marked as non-optional in our StudentData interface.
  ];

  for (const reqKey of requiredFieldsFromInterface) {
    if (!payload.has(reqKey)) {
        // This case should ideally not be hit if ALL_STUDENT_DATA_KEYS is comprehensive
        // and studentDetails (from AI) has the key (even if value is empty/null/Nil).
        // The main loop above adds keys with "" if value is undefined/null.
        // The AI prompt also instructs to include required keys.
        console.warn(`formDataUtils: Required field ${reqKey} was not in payload after main loop. Ensuring it's added as empty.`);
        payload.append(reqKey, (studentDetails[reqKey] as string) || ""); 
    }
  }

  return payload;
}