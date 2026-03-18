// ============================================================
// FHIR R5 Type Definitions for HIS Mini
// Based on HL7 FHIR R5 (5.0.0) — simplified for demo
// ============================================================

/** FHIR R5 Patient */
export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  name: Array<{ family: string; given: string[]; text: string }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  telecom?: Array<{ system: string; value: string }>;
  address?: Array<{ text: string }>;
  meta: { lastUpdated: string };
}

/** FHIR R5 AllergyIntolerance */
export interface FHIRAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  clinicalStatus: { coding: Array<{ code: string; display: string }> };
  verificationStatus: { coding: Array<{ code: string; display: string }> };
  type: 'allergy' | 'intolerance';
  category: Array<'food' | 'medication' | 'environment' | 'biologic'>;
  criticality: 'low' | 'high' | 'unable-to-assess';
  code: { coding: Array<{ system: string; code: string; display: string }> };
  patient: { reference: string };
  onsetDateTime?: string;
  recordedDate: string;
  reaction?: Array<{
    substance?: { coding: Array<{ system: string; code: string; display: string }> };
    manifestation: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
    severity: 'mild' | 'moderate' | 'severe';
  }>;
}

/** FHIR R5 Medication */
export interface FHIRMedication {
  resourceType: 'Medication';
  id: string;
  code: { coding: Array<{ system: string; code: string; display: string }> };
  form?: { coding: Array<{ system: string; code: string; display: string }> };
  ingredient: Array<{
    item: { concept: { coding: Array<{ system: string; code: string; display: string }> } };
    isActive: boolean;
    strengthRatio?: {
      numerator: { value: number; unit: string };
      denominator: { value: number; unit: string };
    };
  }>;
}

/** FHIR R5 MedicationRequest */
export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  status: 'active' | 'on-hold' | 'ended' | 'stopped' | 'completed' | 'cancelled' | 'entered-in-error' | 'draft';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  medication: { reference: string; display: string };
  subject: { reference: string; display: string };
  authoredOn: string;
  dosageInstruction?: Array<{
    text: string;
    timing?: { code?: { text: string } };
    route?: { coding: Array<{ system: string; code: string; display: string }> };
    doseAndRate?: Array<{ doseQuantity: { value: number; unit: string } }>;
  }>;
  note?: Array<{ text: string }>;
}

/** Clinical alert from the alert engine */
export interface ClinicalAlert {
  id: string;
  type: 'allergy-substance-conflict';
  severity: 'critical' | 'high' | 'moderate' | 'low';
  title: string;
  detail: string;
  allergyId: string;
  allergySubstance: string;
  medicationId: string;
  medicationName: string;
  ingredient: string;
  patientId: string;
  timestamp: string;
}
