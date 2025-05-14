// Defines the structure for individual student data fields
// This is based on the form fields observed in the BEMIS portal.
export interface StudentData {
    id: string; // Usually "0" for new entries
    "student.SchoolId": string; // Must be an empty string for the form
    "student.Surname": string;
    "student.FirstName": string;
    "student.OtherName"?: string;
    "student.Email"?: string; // Optional student email address
    "student.Gender": string; // e.g., "0" for Female, "1" for Male (confirm exact BEMIS values)
    "student.DateOfBirth"?: string; // Format: "YYYY-MM-DD" e.g., "2010-08-22"
    "student.Religion": string;
    "student.Nationality": string; // e.g., "Nigerian"
    "student.OriginState": string; // State name, e.g., "Lagos"
    "student.OriginLGA": string; // LGA name, e.g., "Ikeja"
    "student.MotherTongue"?: string; 
    "student.DisabilityGroup"?: string; // e.g., "None" or specific disability
    "student.FathersName": string;
    "student.MotherName": string;
    "student.FathersOccupation": string;
    "student.MotherOccption"?: string; // Note: BEMIS typo "MotherOccption"
    "student.GuardianName": string;
    "student.GuardianOccupation": string;
    "student.GuardianRelationship"?: string;
    "student.GuardianPhoneNumber"?: string; 
    "student.MobileNumber"?: string; 
    "student.HomeAddress"?: string; 
    "student.Street": string; // Specific street, required
    "student.City": string; // Residential city, required
    "student.ResidenceState"?: string; 
    "student.Section": string; 
    "student.Class": string; 
    "student.House"?: string;
    "student.Sport"?: string;
    "student.Club"?: string;
    "student.AdmissionNumber"?: string; 
    "student.DateOfAdmission"?: string; // Format: YYYY (e.g., "2019") - BEMIS seems to expect only the year
    "student.PreviousSchoolAttended"?: string; 
    "student.PreviousClass"?: string;
    "student.Repeater": string; // "true" or "false"
    "student.SpecialNeed"?: string; 
    "student.MediumOfInstruction"?: string; 
    "student.BloodGroup"?: string;
    "student.Genotype"?: string;
    "student.Allergies"?: string; 
    "student.MedicalConditions"?: string;
    "student.Medications"?: string; 
    "student.EmergencyContactName"?: string;
    "student.EmergencyContactPhone"?: string;
    "student.EmergencyContactRelationship"?: string;
    "student.TransportMeans"?: string;
    "student.Notes"?: string;
  }
  
  // Defines the structure for the payload expected by the /api/submit-student endpoint
  export interface StudentSubmissionPayload {
    schoolId?: string; // Optional, will use DEFAULT_SCHOOL_ID if not provided
    studentData: StudentData;
  }
