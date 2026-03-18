// ============================================================
// Medication Catalog — FHIR R5 Medication resources
// SNOMED CT coded medication and ingredient data
// ============================================================

import type { FHIRMedication } from './fhir-types.js';

interface MedSeed {
  id: string; name: string; code: string;
  form: string; formCode: string;
  ingredients: Array<{ name: string; code: string; active: boolean; strength?: string }>;
}

const MEDICATION_SEEDS: MedSeed[] = [
  {
    id: 'med-amoxicillin', name: 'Amoxicillin 500mg', code: '27658006',
    form: 'Viên nang', formCode: '385049006',
    ingredients: [{ name: 'Amoxicillin', code: '372687004', active: true, strength: '500mg' }],
  },
  {
    id: 'med-ampicillin', name: 'Ampicillin 250mg', code: '387170002',
    form: 'Viên nang', formCode: '385049006',
    ingredients: [{ name: 'Ampicillin', code: '387170002', active: true, strength: '250mg' }],
  },
  {
    id: 'med-penicillin-v', name: 'Penicillin V 500mg', code: '372726002',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Penicillin', code: '764146007', active: true, strength: '500mg' }],
  },
  {
    id: 'med-cephalexin', name: 'Cephalexin 500mg (Keflex)', code: '372736001',
    form: 'Viên nang', formCode: '385049006',
    ingredients: [
      { name: 'Cephalexin', code: '372736001', active: true, strength: '500mg' },
      { name: 'Penicillin', code: '764146007', active: false }, // cross-reactivity marker
    ],
  },
  {
    id: 'med-aspirin', name: 'Aspirin 100mg', code: '387458008',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Acetylsalicylic acid', code: '387458008', active: true, strength: '100mg' }],
  },
  {
    id: 'med-ibuprofen', name: 'Ibuprofen 400mg', code: '387207008',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Ibuprofen', code: '387207008', active: true, strength: '400mg' }],
  },
  {
    id: 'med-diclofenac', name: 'Diclofenac 50mg', code: '7034005',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Diclofenac', code: '7034005', active: true, strength: '50mg' }],
  },
  {
    id: 'med-metformin', name: 'Metformin 850mg', code: '372567009',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Metformin', code: '372567009', active: true, strength: '850mg' }],
  },
  {
    id: 'med-lisinopril', name: 'Lisinopril 10mg', code: '386873009',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Lisinopril', code: '386873009', active: true, strength: '10mg' }],
  },
  {
    id: 'med-omeprazole', name: 'Omeprazole 20mg', code: '372603003',
    form: 'Viên nang', formCode: '385049006',
    ingredients: [{ name: 'Omeprazole', code: '372603003', active: true, strength: '20mg' }],
  },
  {
    id: 'med-sulfa-tmp', name: 'Sulfamethoxazole/Trimethoprim 800/160mg', code: '363528007',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [
      { name: 'Sulfamethoxazole', code: '363528007', active: true, strength: '800mg' },
      { name: 'Trimethoprim', code: '373179005', active: true, strength: '160mg' },
    ],
  },
  {
    id: 'med-cetirizine', name: 'Cetirizine 10mg', code: '372523007',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Cetirizine', code: '372523007', active: true, strength: '10mg' }],
  },
  {
    id: 'med-paracetamol', name: 'Paracetamol 500mg', code: '387517004',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Paracetamol', code: '387517004', active: true, strength: '500mg' }],
  },
  {
    id: 'med-ciprofloxacin', name: 'Ciprofloxacin 500mg', code: '372840008',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Ciprofloxacin', code: '372840008', active: true, strength: '500mg' }],
  },
  {
    id: 'med-azithromycin', name: 'Azithromycin 250mg (Zithromax)', code: '372832002',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Azithromycin', code: '372832002', active: true, strength: '250mg' }],
  },
  {
    id: 'med-prednisolone', name: 'Prednisolone 5mg', code: '116601002',
    form: 'Viên nén', formCode: '385055001',
    ingredients: [{ name: 'Prednisolone', code: '116601002', active: true, strength: '5mg' }],
  },
];

export function buildMedicationCatalog(): Map<string, FHIRMedication> {
  const map = new Map<string, FHIRMedication>();

  for (const m of MEDICATION_SEEDS) {
    map.set(m.id, {
      resourceType: 'Medication',
      id: m.id,
      code: { coding: [{ system: 'http://snomed.info/sct', code: m.code, display: m.name }] },
      form: { coding: [{ system: 'http://snomed.info/sct', code: m.formCode, display: m.form }] },
      ingredient: m.ingredients.map((ing) => ({
        item: { concept: { coding: [{ system: 'http://snomed.info/sct', code: ing.code, display: ing.name }] } },
        isActive: ing.active,
        strengthRatio: ing.strength
          ? { numerator: { value: parseInt(ing.strength), unit: 'mg' }, denominator: { value: 1, unit: 'dose' } }
          : undefined,
      })),
    });
  }

  return map;
}
