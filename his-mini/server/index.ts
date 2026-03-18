// ============================================================
// HIS Mini — Backend Server (Hono on Node.js)
// Port 4000 • FHIR R5 data model • Clinical Alert Engine
// ============================================================

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import crypto from 'node:crypto';
import type {
  FHIRPatient, FHIRAllergyIntolerance, FHIRMedicationRequest, FHIRMedication, ClinicalAlert,
} from './fhir-types.js';
import { buildMedicationCatalog } from './medications.js';
import { seedPatients, seedAllergies, seedEncounters, seedPrescriptions } from './seed.js';
import type { SOAPEncounter } from './seed.js';
import { checkAllergyDrugConflicts } from './alert-engine.js';

// ─── In-Memory Data Stores ──────────────────────────────────

const patients = seedPatients();
const allergies = seedAllergies();
const medications = buildMedicationCatalog();
const prescriptions = seedPrescriptions();
const alertHistory: ClinicalAlert[] = [];

// ─── SOAP Encounters ───
const encounters = seedEncounters();

// ─── Helpers ────────────────────────────────────────────────

function getPatientAllergies(patientId: string): FHIRAllergyIntolerance[] {
  return [...allergies.values()].filter(
    (a) => a.patient.reference === `Patient/${patientId}`,
  );
}

// ─── App ────────────────────────────────────────────────────

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: '*' }));

// ── Health ──
app.get('/', (c) => c.json({ name: 'HIS Mini', version: '1.0.0', fhir: 'R5', status: 'ok' }));

// ============================================================
// /api/his/stats
// ============================================================
app.get('/api/his/stats', (c) => {
  return c.json({
    patients: patients.size,
    allergies: allergies.size,
    medications: medications.size,
    prescriptions: prescriptions.size,
    alerts: alertHistory.length,
    criticalAlerts: alertHistory.filter((a) => a.severity === 'critical').length,
  });
});

// ============================================================
// Patients
// ============================================================

app.get('/api/his/patients', (c) => {
  const q = c.req.query('q')?.toLowerCase();
  let list = [...patients.values()];
  if (q) {
    list = list.filter((p) =>
      p.name[0]?.text?.toLowerCase().includes(q) ||
      p.identifier[0]?.value?.toLowerCase().includes(q),
    );
  }
  return c.json({ patients: list, total: list.length });
});

app.get('/api/his/patients/:id', (c) => {
  const patient = patients.get(c.req.param('id'));
  if (!patient) return c.json({ error: 'Patient not found' }, 404);
  const patientAllergies = getPatientAllergies(patient.id);
  const patientPrescriptions = [...prescriptions.values()].filter(
    (p) => p.subject.reference === `Patient/${patient.id}`,
  );
  return c.json({ patient, allergies: patientAllergies, prescriptions: patientPrescriptions });
});

app.post('/api/his/patients', async (c) => {
  const body = await c.req.json();
  const id = `patient-${crypto.randomUUID().slice(0, 8)}`;
  const patient: FHIRPatient = {
    resourceType: 'Patient', id,
    identifier: [{ system: 'urn:oid:1.2.840.113883.1.56', value: body.code || `BN-${Date.now()}` }],
    name: [{
      family: body.family || '',
      given: body.given || [],
      text: body.name || `${body.family || ''} ${(body.given || []).join(' ')}`.trim(),
    }],
    gender: body.gender || 'unknown',
    birthDate: body.birthDate || '',
    telecom: body.phone ? [{ system: 'phone', value: body.phone }] : [],
    address: body.address ? [{ text: body.address }] : [],
    meta: { lastUpdated: new Date().toISOString() },
  };
  patients.set(id, patient);
  return c.json({ patient }, 201);
});

// ============================================================
// Allergies
// ============================================================

app.get('/api/his/patients/:id/allergies', (c) => {
  const patientId = c.req.param('id');
  if (!patients.has(patientId)) return c.json({ error: 'Patient not found' }, 404);
  return c.json({ allergies: getPatientAllergies(patientId) });
});

app.post('/api/his/patients/:id/allergies', async (c) => {
  const patientId = c.req.param('id');
  if (!patients.has(patientId)) return c.json({ error: 'Patient not found' }, 404);
  const body = await c.req.json();
  const id = `allergy-${crypto.randomUUID().slice(0, 8)}`;
  const allergy: FHIRAllergyIntolerance = {
    resourceType: 'AllergyIntolerance', id,
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: body.verified ? 'confirmed' : 'unconfirmed', display: body.verified ? 'Confirmed' : 'Unconfirmed' }] },
    type: 'allergy', category: ['medication'],
    criticality: body.criticality || 'high',
    code: { coding: [{ system: 'http://snomed.info/sct', code: body.substanceCode || 'unknown', display: body.substance || '' }] },
    patient: { reference: `Patient/${patientId}` },
    recordedDate: new Date().toISOString().split('T')[0],
    reaction: body.reaction ? [{
      manifestation: [{ coding: [{ system: 'http://snomed.info/sct', code: 'unknown', display: body.reaction }] }],
      severity: body.reactionSeverity || 'moderate',
    }] : undefined,
  };
  allergies.set(id, allergy);
  return c.json({ allergy }, 201);
});

app.delete('/api/his/patients/:id/allergies/:aid', (c) => {
  const allergyId = c.req.param('aid');
  if (!allergies.has(allergyId)) return c.json({ error: 'Allergy not found' }, 404);
  allergies.delete(allergyId);
  return c.json({ success: true });
});

// ============================================================
// Medications Catalog
// ============================================================

app.get('/api/his/medications', (c) => {
  const q = c.req.query('q')?.toLowerCase();
  let list = [...medications.values()];
  if (q) {
    list = list.filter((m) =>
      m.code.coding[0]?.display?.toLowerCase().includes(q) ||
      m.ingredient.some((i) => i.item.concept.coding[0]?.display?.toLowerCase().includes(q)),
    );
  }
  return c.json({ medications: list, total: list.length });
});

// ============================================================
// Prescriptions — with Clinical Alert Validation
// ============================================================

app.get('/api/his/prescriptions', (c) => {
  const patientId = c.req.query('patientId');
  let list = [...prescriptions.values()];
  if (patientId) {
    list = list.filter((p) => p.subject.reference === `Patient/${patientId}`);
  }
  list.sort((a, b) => new Date(b.authoredOn).getTime() - new Date(a.authoredOn).getTime());
  return c.json({ prescriptions: list, total: list.length });
});

app.get('/api/his/prescriptions/:id', (c) => {
  const rx = prescriptions.get(c.req.param('id'));
  if (!rx) return c.json({ error: 'Prescription not found' }, 404);
  return c.json({ prescription: rx });
});

/**
 * POST /api/his/prescriptions
 * Body: { patientId, medicationId, dosage, route, frequency, note, forceOverride? }
 *
 * If allergy conflict → 409 + alerts[]. Doctor re-sends with forceOverride=true to acknowledge.
 */
app.post('/api/his/prescriptions', async (c) => {
  const body = await c.req.json();
  const { patientId, medicationId, dosage, route, frequency, note, forceOverride } = body;

  if (!patientId || !medicationId) {
    return c.json({ error: 'patientId và medicationId là bắt buộc' }, 400);
  }
  const patient = patients.get(patientId);
  if (!patient) return c.json({ error: 'Không tìm thấy bệnh nhân' }, 404);
  const med = medications.get(medicationId);
  if (!med) return c.json({ error: 'Không tìm thấy thuốc' }, 404);

  // ─── Clinical Alert Check ───
  const patientAllergies = getPatientAllergies(patientId);
  const alerts = checkAllergyDrugConflicts(patientId, med, patientAllergies);

  // Always record alerts in history when detected
  if (alerts.length > 0) {
    alertHistory.push(...alerts);
  }

  if (alerts.length > 0 && !forceOverride) {
    return c.json({
      blocked: true,
      alerts,
      message: `⚠️ Phát hiện ${alerts.length} cảnh báo lâm sàng! Đơn thuốc CHƯA được lưu. Bác sĩ cần xác nhận để tiếp tục.`,
    }, 409);
  }

  // ─── Create MedicationRequest ───
  const id = `rx-${crypto.randomUUID().slice(0, 8)}`;
  const prescription: FHIRMedicationRequest = {
    resourceType: 'MedicationRequest', id,
    status: 'active', intent: 'order',
    medication: { reference: `Medication/${medicationId}`, display: med.code.coding[0]?.display ?? '' },
    subject: { reference: `Patient/${patientId}`, display: patient.name[0]?.text ?? '' },
    authoredOn: new Date().toISOString(),
    dosageInstruction: [{
      text: `${dosage || '1 viên'}, ${frequency || '3 lần/ngày'}, ${route || 'Đường uống'}`,
      timing: frequency ? { code: { text: frequency } } : undefined,
      route: route ? { coding: [{ system: 'http://snomed.info/sct', code: '26643006', display: route }] } : undefined,
      doseAndRate: dosage ? [{ doseQuantity: { value: parseFloat(dosage) || 1, unit: 'viên' } }] : undefined,
    }],
    note: note ? [{ text: note }] : undefined,
  };

  if (alerts.length > 0 && forceOverride) {
    prescription.note = [
      ...(prescription.note || []),
      { text: `⚠️ Bác sĩ đã xác nhận bỏ qua ${alerts.length} cảnh báo dị ứng: ${alerts.map((a) => a.title).join('; ')}` },
    ];
  }

  prescriptions.set(id, prescription);
  return c.json({
    prescription,
    alerts: alerts.length > 0 ? alerts : undefined,
    overridden: alerts.length > 0 && forceOverride,
  }, 201);
});

// ============================================================
// Manual Clinical Alert Check
// ============================================================

app.post('/api/his/clinical-alert/check', async (c) => {
  const { patientId, medicationId } = await c.req.json();
  if (!patientId || !medicationId) {
    return c.json({ error: 'patientId and medicationId required' }, 400);
  }
  const med = medications.get(medicationId);
  if (!med) return c.json({ error: 'Medication not found' }, 404);

  const patientAllergies = getPatientAllergies(patientId);
  const alerts = checkAllergyDrugConflicts(patientId, med, patientAllergies);
  return c.json({ safe: alerts.length === 0, alerts, checkedAt: new Date().toISOString() });
});

// ============================================================
// SOAP Encounters
// ============================================================

app.get('/api/his/encounters', (c) => {
  const patientId = c.req.query('patientId');
  let list = [...encounters.values()];
  if (patientId) list = list.filter((e) => e.patientId === patientId);
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return c.json({ encounters: list, total: list.length });
});

app.get('/api/his/encounters/:id', (c) => {
  const enc = encounters.get(c.req.param('id'));
  if (!enc) return c.json({ error: 'Encounter not found' }, 404);
  return c.json({ encounter: enc });
});

app.post('/api/his/encounters', async (c) => {
  const body = await c.req.json();
  const { patientId } = body;
  if (!patientId) return c.json({ error: 'patientId required' }, 400);
  const patient = patients.get(patientId);
  if (!patient) return c.json({ error: 'Patient not found' }, 404);

  const id = `enc-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const enc: SOAPEncounter = {
    id, patientId,
    patientName: patient.name[0]?.text ?? '',
    date: now.split('T')[0],
    status: 'in-progress',
    subjective: body.subjective || '',
    objective: body.objective || '',
    assessment: body.assessment || '',
    plan: body.plan || '',
    prescriptionIds: [],
    createdAt: now, updatedAt: now,
  };
  encounters.set(id, enc);
  return c.json({ encounter: enc }, 201);
});

app.put('/api/his/encounters/:id', async (c) => {
  const enc = encounters.get(c.req.param('id'));
  if (!enc) return c.json({ error: 'Encounter not found' }, 404);
  const body = await c.req.json();
  if (body.subjective !== undefined) enc.subjective = body.subjective;
  if (body.objective !== undefined) enc.objective = body.objective;
  if (body.assessment !== undefined) enc.assessment = body.assessment;
  if (body.plan !== undefined) enc.plan = body.plan;
  if (body.status !== undefined) enc.status = body.status;
  enc.updatedAt = new Date().toISOString();
  return c.json({ encounter: enc });
});

// ============================================================
// Alert History
// ============================================================

app.get('/api/his/alerts', (c) => {
  const patientId = c.req.query('patientId');
  let list = [...alertHistory];
  if (patientId) {
    list = list.filter((a) => a.patientId === patientId);
  }
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return c.json({ alerts: list, total: list.length });
});

// ============================================================
// Start
// ============================================================

const PORT = Number(process.env.HIS_PORT) || 4000;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n🏥 HIS Mini Server running at http://localhost:${PORT}`);
  console.log(`   FHIR R5 • Clinical Alert Engine • ${patients.size} patients • ${medications.size} medications\n`);
});
