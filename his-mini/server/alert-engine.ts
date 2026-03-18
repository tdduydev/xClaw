// ============================================================
// Clinical Alert Engine — Allergy ↔ Drug Substance Conflict Detection
// Supports direct match AND cross-reactivity groups
// ============================================================

import type { FHIRAllergyIntolerance, FHIRMedication, ClinicalAlert } from './fhir-types.js';
import crypto from 'node:crypto';

// ─── Cross-reactivity groups ────────────────────────────────
// Maps a substance (lowercase) → related substances that may cause cross-reaction

const CROSS_REACTIVITY: Record<string, string[]> = {
  'penicillin':          ['amoxicillin', 'ampicillin', 'penicillin', 'piperacillin', 'nafcillin', 'oxacillin'],
  'amoxicillin':         ['penicillin', 'ampicillin', 'piperacillin'],
  'ampicillin':          ['penicillin', 'amoxicillin', 'piperacillin'],
  'sulfonamide':         ['sulfamethoxazole', 'sulfasalazine', 'sulfadiazine'],
  'sulfamethoxazole':    ['sulfonamide', 'sulfasalazine'],
  'nsaid':               ['ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'acetylsalicylic acid', 'celecoxib', 'meloxicam', 'ketorolac'],
  'ibuprofen':           ['nsaid', 'diclofenac', 'naproxen', 'aspirin', 'acetylsalicylic acid'],
  'aspirin':             ['nsaid', 'ibuprofen', 'diclofenac', 'acetylsalicylic acid'],
  'acetylsalicylic acid': ['aspirin', 'nsaid', 'ibuprofen', 'diclofenac'],
  'diclofenac':          ['nsaid', 'ibuprofen', 'aspirin'],
  'cephalosporin':       ['cephalexin', 'cefazolin', 'ceftriaxone', 'cefuroxime'],
  'cephalexin':          ['cephalosporin'],
};

function normalise(s: string): string {
  return s.toLowerCase().trim();
}

/** Get all substances related to a given substance via cross-reactivity */
function getRelatedSubstances(substance: string): string[] {
  const key = normalise(substance);
  const related = new Set<string>([key]);

  // Direct lookup
  if (CROSS_REACTIVITY[key]) {
    for (const r of CROSS_REACTIVITY[key]) related.add(normalise(r));
  }
  // Reverse lookup: check if key appears in any group
  for (const [group, members] of Object.entries(CROSS_REACTIVITY)) {
    if (members.map(normalise).includes(key)) {
      related.add(normalise(group));
      for (const m of members) related.add(normalise(m));
    }
  }
  return [...related];
}

/**
 * Core check: for a patient's active medication allergies, detect if a medication
 * contains a matching or cross-reactive ingredient.
 * Returns ClinicalAlert[] — empty means safe.
 */
export function checkAllergyDrugConflicts(
  patientId: string,
  medication: FHIRMedication,
  patientAllergies: FHIRAllergyIntolerance[],
): ClinicalAlert[] {
  // Only check active medication allergies
  const activeAllergies = patientAllergies.filter(
    (a) =>
      a.category.includes('medication') &&
      a.clinicalStatus.coding[0]?.code === 'active',
  );

  const alerts: ClinicalAlert[] = [];

  for (const allergy of activeAllergies) {
    const allergySubstance = allergy.code.coding[0]?.display ?? '';
    const relatedSubstances = getRelatedSubstances(allergySubstance);

    for (const ingredient of medication.ingredient) {
      const ingredientName = normalise(ingredient.item.concept.coding[0]?.display ?? '');

      if (relatedSubstances.includes(ingredientName)) {
        const isDirect = normalise(allergySubstance) === ingredientName;
        alerts.push({
          id: crypto.randomUUID(),
          type: 'allergy-substance-conflict',
          severity: allergy.criticality === 'high'
            ? 'critical'
            : isDirect ? 'high' : 'moderate',
          title: isDirect
            ? `⛔ Dị ứng trực tiếp: ${allergySubstance}`
            : `⚠️ Phản ứng chéo: ${allergySubstance} ↔ ${ingredient.item.concept.coding[0]?.display}`,
          detail: isDirect
            ? `Bệnh nhân có tiền sử dị ứng với ${allergySubstance}. Thuốc ${medication.code.coding[0]?.display} chứa hoạt chất ${ingredientName} — KHÔNG ĐƯỢC KÊ ĐƠN.`
            : `Bệnh nhân dị ứng ${allergySubstance}. Thuốc ${medication.code.coding[0]?.display} chứa ${ingredient.item.concept.coding[0]?.display} có nguy cơ phản ứng chéo.`,
          allergyId: allergy.id,
          allergySubstance,
          medicationId: medication.id,
          medicationName: medication.code.coding[0]?.display ?? '',
          ingredient: ingredient.item.concept.coding[0]?.display ?? '',
          patientId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}
