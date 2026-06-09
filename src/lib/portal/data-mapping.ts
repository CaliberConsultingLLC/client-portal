import type { PortalDashboardFamily } from "@/types/portal";

export interface DashboardDataMappingFieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}

export interface DashboardDataMappingPreset {
  schemaId: string;
  label: string;
  description: string;
  fields: DashboardDataMappingFieldDefinition[];
}

export const DASHBOARD_DATA_MAPPING_PRESETS: Record<
  PortalDashboardFamily,
  DashboardDataMappingPreset
> = {
  collaboration: {
    schemaId: "collaboration_v1",
    label: "Collaboration Mapping",
    description:
      "Map the source fields needed for relationship scoring, CI detail, and department-to-department analysis.",
    fields: [
      { key: "sourceDepartment", label: "Source Department", required: true, placeholder: "Department" },
      { key: "targetDepartment", label: "Target Department", required: true, placeholder: "Related Department" },
      { key: "incomingCdrs", label: "Incoming CDRS", required: true, placeholder: "Incoming CDRS" },
      { key: "outgoingCdrs", label: "Outgoing CDRS", required: true, placeholder: "Outgoing CDRS" },
      { key: "collaborationIndex", label: "Collaboration Index", placeholder: "CI" },
      { key: "questionId", label: "CI Question ID", placeholder: "Question ID" },
      { key: "questionScore", label: "CI Question Score", placeholder: "Question Score" },
      { key: "comment", label: "Comment", placeholder: "Comment Text" },
    ],
  },
  integration: {
    schemaId: "integration_v1",
    label: "Integration Mapping",
    description:
      "Map the current source columns into the standard fields used across integration perspectives and reports.",
    fields: [
      { key: "respondentId", label: "Respondent ID", placeholder: "Employee ID" },
      { key: "campaign", label: "Campaign", required: true, placeholder: "Campaign" },
      { key: "brand", label: "Brand", required: true, placeholder: "Brand Name" },
      { key: "department", label: "Department", required: true, placeholder: "Function" },
      { key: "statementId", label: "Statement ID", required: true, placeholder: "Question Number" },
      { key: "score", label: "Score", required: true, placeholder: "Average Score" },
      { key: "comment", label: "Comment", placeholder: "Open Text" },
    ],
  },
  employee_experience: {
    schemaId: "employee_experience_v1",
    label: "Employee Experience Mapping",
    description:
      "Map the core demographic, campaign, statement, and comment columns needed for employee-experience review and reports.",
    fields: [
      { key: "respondentId", label: "Respondent ID", placeholder: "ID" },
      { key: "campaign", label: "Campaign", required: true, placeholder: "Campaign" },
      { key: "department", label: "Department", required: true, placeholder: "Department" },
      { key: "location", label: "Brand", required: true, placeholder: "Company" },
      { key: "supervisor", label: "Supervisor", required: true, placeholder: "Supervisor" },
      { key: "division", label: "Division", placeholder: "Division" },
      { key: "jobTitle", label: "Job Title", placeholder: "Job Title" },
      { key: "fieldCategory", label: "Field Category", placeholder: "Field Category" },
      { key: "leadership", label: "Leadership", placeholder: "Leadership" },
      { key: "generation", label: "Generation", placeholder: "Generation" },
      { key: "rateType", label: "Rate Type", placeholder: "Rate Type" },
      { key: "tenure", label: "Tenure", placeholder: "Tenure" },
      { key: "rating", label: "Rating", placeholder: "Rating" },
      { key: "statementId", label: "Statement ID", required: true, placeholder: "Item ID" },
      { key: "score", label: "Score", required: true, placeholder: "Score" },
      { key: "strengthComment", label: "Strength Comment", placeholder: "Strengths Comment" },
      { key: "improvementComment", label: "Improvement Comment", placeholder: "Improvement Comment" },
      { key: "supervisorComment", label: "Supervisor Comment", placeholder: "Supervisor Comment" },
      { key: "acquisitionComment", label: "Acquisition Comment", placeholder: "Acquisition Comment" },
    ],
  },
};

export function getDashboardDataMappingPreset(family: PortalDashboardFamily) {
  return DASHBOARD_DATA_MAPPING_PRESETS[family];
}

export function getRequiredDashboardMappingFields(family: PortalDashboardFamily) {
  return getDashboardDataMappingPreset(family).fields.filter((field) => field.required);
}

export function validateDashboardFieldMappings(
  family: PortalDashboardFamily,
  fieldMappings: Record<string, string>
) {
  const preset = getDashboardDataMappingPreset(family);
  const missingRequiredFields = preset.fields
    .filter((field) => field.required && !(fieldMappings[field.key] ?? "").trim())
    .map((field) => field.label);
  const mappedCount = preset.fields.filter((field) => (fieldMappings[field.key] ?? "").trim()).length;
  const warnings: string[] = [];

  if (mappedCount === 0) {
    warnings.push("No source fields have been mapped yet.");
  }

  if (mappedCount > 0 && missingRequiredFields.length > 0) {
    warnings.push("Required fields are still missing, so this mapping should remain in draft.");
  }

  return {
    missingRequiredFields,
    warnings,
  };
}

export function buildEmptyDashboardFieldMappings(family: PortalDashboardFamily) {
  return Object.fromEntries(
    getDashboardDataMappingPreset(family).fields.map((field) => [field.key, ""])
  ) as Record<string, string>;
}
