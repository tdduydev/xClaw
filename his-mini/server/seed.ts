// ============================================================
// Seed Data — Demo patients, allergies, encounters, prescriptions
// Covering: đa bệnh lý, dị ứng chéo, nhiều lượt khám, đơn thuốc
// ============================================================

import type {
  FHIRPatient, FHIRAllergyIntolerance, FHIRMedicationRequest,
} from './fhir-types.js';

// ─── Helper ─────────────────────────────────────────────────
const snomed = (code: string, display: string) => ({
  system: 'http://snomed.info/sct' as const, code, display,
});

// ─── SOAP Encounter type (mirror of index.ts) ──────────────
export interface SOAPEncounter {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  status: 'in-progress' | 'completed';
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  prescriptionIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ════════════════════════════════════════════════════════════
// PATIENTS
// ════════════════════════════════════════════════════════════

export function seedPatients(): Map<string, FHIRPatient> {
  const map = new Map<string, FHIRPatient>();
  const now = new Date().toISOString();

  // ── 001: Nguyễn Văn An — Đái tháo đường type 2 + Tăng huyết áp, dị ứng Penicillin
  map.set('patient-001', {
    resourceType: 'Patient', id: 'patient-001',
    identifier: [{ system: 'urn:oid:1.2.840.113883.1.56', value: 'BN-2025-001' }],
    name: [{ family: 'Nguyễn', given: ['Văn', 'An'], text: 'Nguyễn Văn An' }],
    gender: 'male', birthDate: '1985-03-15',
    telecom: [{ system: 'phone', value: '0901234567' }, { system: 'email', value: 'an.nguyen@email.com' }],
    address: [{ text: '123 Nguyễn Huệ, Q.1, TP.HCM' }],
    meta: { lastUpdated: now },
  });

  // ── 002: Trần Thị Bình — Viêm khớp dạng thấp, dị ứng Aspirin + NSAID cross-reaction
  map.set('patient-002', {
    resourceType: 'Patient', id: 'patient-002',
    identifier: [{ system: 'urn:oid:1.2.840.113883.1.56', value: 'BN-2025-002' }],
    name: [{ family: 'Trần', given: ['Thị', 'Bình'], text: 'Trần Thị Bình' }],
    gender: 'female', birthDate: '1990-08-22',
    telecom: [{ system: 'phone', value: '0912345678' }],
    address: [{ text: '456 Lê Lợi, Q.3, TP.HCM' }],
    meta: { lastUpdated: now },
  });

  // ── 003: Lê Minh Châu — Nhiễm trùng đường tiết niệu tái phát, dị ứng Sulfonamide
  map.set('patient-003', {
    resourceType: 'Patient', id: 'patient-003',
    identifier: [{ system: 'urn:oid:1.2.840.113883.1.56', value: 'BN-2025-003' }],
    name: [{ family: 'Lê', given: ['Minh', 'Châu'], text: 'Lê Minh Châu' }],
    gender: 'male', birthDate: '1978-12-05',
    telecom: [{ system: 'phone', value: '0933456789' }],
    address: [{ text: '789 Hai Bà Trưng, Q.1, TP.HCM' }],
    meta: { lastUpdated: now },
  });

  // ── 004: Phạm Thị Dung — Thai phụ 28 tuần, thiếu máu thiếu sắt, dị ứng Cephalosporin
  map.set('patient-004', {
    resourceType: 'Patient', id: 'patient-004',
    identifier: [{ system: 'urn:oid:1.2.840.113883.1.56', value: 'BN-2025-004' }],
    name: [{ family: 'Phạm', given: ['Thị', 'Dung'], text: 'Phạm Thị Dung' }],
    gender: 'female', birthDate: '1995-05-10',
    telecom: [{ system: 'phone', value: '0944567890' }],
    address: [{ text: '12 Pasteur, Q.1, TP.HCM' }],
    meta: { lastUpdated: now },
  });

  // ── 005: Võ Hoàng Nam — Bệnh phổi tắc nghẽn mạn tính (COPD) + Hen suyễn, dị ứng Penicillin + Aspirin (đa dị ứng)
  map.set('patient-005', {
    resourceType: 'Patient', id: 'patient-005',
    identifier: [{ system: 'urn:oid:1.2.840.113883.1.56', value: 'BN-2025-005' }],
    name: [{ family: 'Võ', given: ['Hoàng', 'Nam'], text: 'Võ Hoàng Nam' }],
    gender: 'male', birthDate: '1960-11-28',
    telecom: [{ system: 'phone', value: '0955678901' }],
    address: [{ text: '34 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM' }],
    meta: { lastUpdated: now },
  });

  // ── 006: Đặng Minh Tú — Trẻ em 8 tuổi, viêm amidan tái phát, không dị ứng (clean case)
  map.set('patient-006', {
    resourceType: 'Patient', id: 'patient-006',
    identifier: [{ system: 'urn:oid:1.2.840.113883.1.56', value: 'BN-2025-006' }],
    name: [{ family: 'Đặng', given: ['Minh', 'Tú'], text: 'Đặng Minh Tú' }],
    gender: 'male', birthDate: '2018-02-14',
    telecom: [{ system: 'phone', value: '0966789012' }],
    address: [{ text: '56 Nguyễn Trãi, Q.5, TP.HCM' }],
    meta: { lastUpdated: now },
  });

  // ── 007: Huỳnh Thị Lan — Người cao tuổi, suy tim + suy thận mạn, đa thuốc (polypharmacy)
  map.set('patient-007', {
    resourceType: 'Patient', id: 'patient-007',
    identifier: [{ system: 'urn:oid:1.2.840.113883.1.56', value: 'BN-2025-007' }],
    name: [{ family: 'Huỳnh', given: ['Thị', 'Lan'], text: 'Huỳnh Thị Lan' }],
    gender: 'female', birthDate: '1948-09-03',
    telecom: [{ system: 'phone', value: '0977890123' }],
    address: [{ text: '78 Cách Mạng Tháng 8, Q.10, TP.HCM' }],
    meta: { lastUpdated: now },
  });

  return map;
}

// ════════════════════════════════════════════════════════════
// ALLERGIES
// ════════════════════════════════════════════════════════════

export function seedAllergies(): Map<string, FHIRAllergyIntolerance> {
  const map = new Map<string, FHIRAllergyIntolerance>();

  // --- Patient-001: Penicillin — phản vệ nặng
  map.set('allergy-001', {
    resourceType: 'AllergyIntolerance', id: 'allergy-001',
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
    type: 'allergy', category: ['medication'], criticality: 'high',
    code: { coding: [snomed('764146007', 'Penicillin')] },
    patient: { reference: 'Patient/patient-001' },
    recordedDate: '2020-06-01',
    reaction: [{
      manifestation: [{ coding: [snomed('39579001', 'Phản vệ (Anaphylaxis)')] }],
      severity: 'severe',
    }],
  });

  // --- Patient-002: Aspirin — mề đay
  map.set('allergy-002', {
    resourceType: 'AllergyIntolerance', id: 'allergy-002',
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
    type: 'allergy', category: ['medication'], criticality: 'high',
    code: { coding: [snomed('387458008', 'Aspirin')] },
    patient: { reference: 'Patient/patient-002' },
    recordedDate: '2019-11-10',
    reaction: [{
      manifestation: [{ coding: [snomed('126485001', 'Mề đay (Urticaria)')] }],
      severity: 'moderate',
    }],
  });

  // --- Patient-003: Sulfonamide — phát ban da
  map.set('allergy-003', {
    resourceType: 'AllergyIntolerance', id: 'allergy-003',
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
    type: 'allergy', category: ['medication'], criticality: 'high',
    code: { coding: [snomed('363528007', 'Sulfonamide')] },
    patient: { reference: 'Patient/patient-003' },
    recordedDate: '2022-03-20',
    reaction: [{
      manifestation: [{ coding: [snomed('271807003', 'Phát ban da (Skin rash)')] }],
      severity: 'moderate',
    }],
  });

  // --- Patient-004: Cephalexin (phản ứng chéo cephalosporin/penicillin)
  map.set('allergy-004', {
    resourceType: 'AllergyIntolerance', id: 'allergy-004',
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
    type: 'allergy', category: ['medication'], criticality: 'high',
    code: { coding: [snomed('372736001', 'Cephalexin')] },
    patient: { reference: 'Patient/patient-004' },
    recordedDate: '2023-01-15',
    reaction: [{
      manifestation: [{ coding: [snomed('271807003', 'Phát ban da (Skin rash)')] }],
      severity: 'moderate',
    }],
  });

  // --- Patient-004: Dị ứng thức ăn — Hải sản (case non-medication)
  map.set('allergy-005', {
    resourceType: 'AllergyIntolerance', id: 'allergy-005',
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
    type: 'allergy', category: ['food'], criticality: 'high',
    code: { coding: [snomed('227037002', 'Hải sản (Seafood)')] },
    patient: { reference: 'Patient/patient-004' },
    recordedDate: '2018-07-05',
    reaction: [{
      manifestation: [{ coding: [snomed('39579001', 'Phản vệ (Anaphylaxis)')] }],
      severity: 'severe',
    }],
  });

  // --- Patient-005: Penicillin — phù mạch (multi-allergy patient #1)
  map.set('allergy-006', {
    resourceType: 'AllergyIntolerance', id: 'allergy-006',
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
    type: 'allergy', category: ['medication'], criticality: 'high',
    code: { coding: [snomed('764146007', 'Penicillin')] },
    patient: { reference: 'Patient/patient-005' },
    recordedDate: '2015-04-12',
    reaction: [{
      manifestation: [{ coding: [snomed('41291007', 'Phù mạch (Angioedema)')] }],
      severity: 'severe',
    }],
  });

  // --- Patient-005: Aspirin — co thắt phế quản (multi-allergy patient #2)
  map.set('allergy-007', {
    resourceType: 'AllergyIntolerance', id: 'allergy-007',
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
    type: 'allergy', category: ['medication'], criticality: 'high',
    code: { coding: [snomed('387458008', 'Aspirin')] },
    patient: { reference: 'Patient/patient-005' },
    recordedDate: '2017-08-20',
    reaction: [{
      manifestation: [{ coding: [snomed('4386001', 'Co thắt phế quản (Bronchospasm)')] }],
      severity: 'severe',
    }],
  });

  // --- Patient-007: Dị ứng ACE inhibitor (Lisinopril) — ho khan kéo dài
  map.set('allergy-008', {
    resourceType: 'AllergyIntolerance', id: 'allergy-008',
    clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
    verificationStatus: { coding: [{ code: 'confirmed', display: 'Confirmed' }] },
    type: 'intolerance', category: ['medication'], criticality: 'low',
    code: { coding: [snomed('386873009', 'Lisinopril')] },
    patient: { reference: 'Patient/patient-007' },
    recordedDate: '2021-05-10',
    reaction: [{
      manifestation: [{ coding: [snomed('49727002', 'Ho khan kéo dài (Persistent cough)')] }],
      severity: 'mild',
    }],
  });

  // Patient-006: Không có dị ứng (clean case)

  return map;
}

// ════════════════════════════════════════════════════════════
// ENCOUNTERS  (Lượt khám SOAP)
// ════════════════════════════════════════════════════════════

export function seedEncounters(): Map<string, SOAPEncounter> {
  const map = new Map<string, SOAPEncounter>();

  // ── Patient-001: 3 lượt khám ──────────────────────────────

  map.set('enc-001a', {
    id: 'enc-001a', patientId: 'patient-001', patientName: 'Nguyễn Văn An',
    date: '2025-09-10', status: 'completed',
    subjective: 'Bệnh nhân đến khám vì khát nước nhiều, tiểu nhiều lần trong 2 tháng qua, sụt 4kg. Tiền sử gia đình: bố mẹ đều bị tiểu đường type 2.',
    objective: 'Mạch 78, HA 145/92 mmHg, BMI 27.3. Glucose đói: 11.2 mmol/L, HbA1c: 8.1%. Creatinine 88 μmol/L, eGFR 85. Lipid máu: Cholesterol 6.1, LDL 3.8, HDL 1.0, Triglyceride 2.4.',
    assessment: 'Đái tháo đường type 2 mới phát hiện (E11.9). Tăng huyết áp giai đoạn 1 (I10). Rối loạn lipid máu (E78.5). BMI thừa cân.',
    plan: 'Khởi trị Metformin 850mg x 2 lần/ngày. Lisinopril 10mg/ngày cho HA. Chế độ ăn kiêng, tập thể dục 30 phút/ngày. Tái khám sau 1 tháng kiểm tra HbA1c.',
    prescriptionIds: ['rx-001a', 'rx-001b'],
    createdAt: '2025-09-10T08:30:00.000Z', updatedAt: '2025-09-10T09:15:00.000Z',
  });

  map.set('enc-001b', {
    id: 'enc-001b', patientId: 'patient-001', patientName: 'Nguyễn Văn An',
    date: '2025-10-12', status: 'completed',
    subjective: 'Tái khám sau 1 tháng. Bệnh nhân cho biết đã giảm khát, tiểu ít hơn. Tuân thủ thuốc tốt. Đôi khi đau đầu nhẹ buổi sáng.',
    objective: 'HA 135/85 mmHg. Glucose đói: 8.4 mmol/L, HbA1c: 7.5% (giảm 0.6%). Creatinine 90 μmol/L. Cân nặng giảm 1.5kg.',
    assessment: 'ĐTĐ type 2 đang cải thiện dưới điều trị. HA kiểm soát chưa tối ưu. Tiếp tục theo dõi.',
    plan: 'Tiếp tục Metformin 850mg x 2. Tăng Lisinopril lên 20mg/ngày. Bổ sung Omeprazole 20mg/ngày (bệnh nhân kêu đau dạ dày do Metformin). Tái khám sau 2 tháng.',
    prescriptionIds: ['rx-001c'],
    createdAt: '2025-10-12T09:00:00.000Z', updatedAt: '2025-10-12T09:45:00.000Z',
  });

  map.set('enc-001c', {
    id: 'enc-001c', patientId: 'patient-001', patientName: 'Nguyễn Văn An',
    date: '2025-12-15', status: 'completed',
    subjective: 'Tái khám sau 2 tháng. Cảm thấy tốt hơn nhiều. Không còn khát nước. Tập thể dục đều đặn. Hết đau dạ dày.',
    objective: 'HA 128/82 mmHg. HbA1c: 6.8% (đạt mục tiêu). BMI 26.1 (giảm). Lipid máu cải thiện: LDL 2.9. Chức năng thận ổn định.',
    assessment: 'ĐTĐ type 2 kiểm soát tốt (HbA1c < 7%). HA kiểm soát tốt. Lipid cải thiện.',
    plan: 'Duy trì phác đồ hiện tại. Ngưng Omeprazole. Hẹn xét nghiệm HbA1c mỗi 3 tháng. Khám mắt, bàn chân hàng năm.',
    prescriptionIds: [],
    createdAt: '2025-12-15T10:00:00.000Z', updatedAt: '2025-12-15T10:30:00.000Z',
  });

  // ── Patient-002: 2 lượt khám ──────────────────────────────

  map.set('enc-002a', {
    id: 'enc-002a', patientId: 'patient-002', patientName: 'Trần Thị Bình',
    date: '2025-08-05', status: 'completed',
    subjective: 'Đau nhức, cứng các khớp ngón tay hai bên chi trên, khớp cổ tay, đầu gối, đối xứng, kéo dài > 6 tuần. Cứng khớp buổi sáng > 1 giờ. Mệt mỏi, sụt 2kg. Lưu ý: DỊ ỨNG ASPIRIN — CẤM NSAID NHÓM SALICYLATE.',
    objective: 'Sưng nóng khớp MCP 2,3 hai bên, khớp cổ tay hai bên. RF (+) 86 IU/mL, Anti-CCP (+) > 200 U/mL. CRP 42 mg/L, ESR 55 mm/h. X-quang tay: hẹp khe khớp MCP, bào mòn xương sớm.',
    assessment: 'Viêm khớp dạng thấp (M05.7) — giai đoạn hoạt động, DAS28 = 5.2 (hoạt động cao). Dị ứng Aspirin → không dùng NSAID nhóm salicylate.',
    plan: 'Prednisolone 10mg/ngày x 2 tuần, giảm dần. Methotrexate khởi đầu (chuyển chuyên khoa). Paracetamol 500mg khi đau (an toàn với dị ứng Aspirin). Chuyển Khoa Cơ Xương Khớp.',
    prescriptionIds: ['rx-002a', 'rx-002b'],
    createdAt: '2025-08-05T14:00:00.000Z', updatedAt: '2025-08-05T15:00:00.000Z',
  });

  map.set('enc-002b', {
    id: 'enc-002b', patientId: 'patient-002', patientName: 'Trần Thị Bình',
    date: '2025-11-20', status: 'completed',
    subjective: 'Tái khám sau 3 tháng điều trị. Đỡ đau khớp nhiều, cứng khớp buổi sáng giảm còn 20 phút. Không có tác dụng phụ thuốc.',
    objective: 'Khớp bớt sưng. CRP giảm còn 12 mg/L, ESR 28 mm/h. DAS28 = 3.1 (hoạt động thấp). Chức năng gan thận bình thường.',
    assessment: 'Viêm khớp dạng thấp — đáp ứng tốt với điều trị (DAS28 giảm từ 5.2 → 3.1).',
    plan: 'Giảm Prednisolone xuống 5mg/ngày. Tiếp tục Methotrexate. Bổ sung Calcium + Vitamin D (phòng loãng xương do corticoid). Tái khám mỗi 3 tháng.',
    prescriptionIds: ['rx-002c'],
    createdAt: '2025-11-20T10:00:00.000Z', updatedAt: '2025-11-20T10:45:00.000Z',
  });

  // ── Patient-003: 2 lượt khám ──────────────────────────────

  map.set('enc-003a', {
    id: 'enc-003a', patientId: 'patient-003', patientName: 'Lê Minh Châu',
    date: '2025-07-18', status: 'completed',
    subjective: 'Tiểu buốt, tiểu rát, tiểu gấp, nước tiểu đục 3 ngày. Sốt nhẹ 37.8°C. Tiền sử NTĐTN 2 lần trong năm gần nhất. DỊ ỨNG SULFONAMIDE — không dùng Bactrim/Cotrim.',
    objective: 'Nhiệt độ 37.9°C, mạch 82. Đau chạm góc sườn-cột sống phải (-). Tổng phân tích nước tiểu: Bạch cầu +++, Nitrit (+), Hồng cầu +. Cấy nước tiểu: E.coli > 10⁵ CFU/mL, nhạy Ciprofloxacin, Amoxicillin.',
    assessment: 'Nhiễm trùng đường tiết niệu dưới do E.coli (N39.0). Tái phát lần 3. Dị ứng Sulfonamide → không dùng TMP-SMX.',
    plan: 'Ciprofloxacin 500mg x 2 lần/ngày x 7 ngày. Uống nhiều nước > 2L/ngày. Tái khám sau 7 ngày + cấy nước tiểu kiểm tra.',
    prescriptionIds: ['rx-003a'],
    createdAt: '2025-07-18T11:00:00.000Z', updatedAt: '2025-07-18T11:30:00.000Z',
  });

  map.set('enc-003b', {
    id: 'enc-003b', patientId: 'patient-003', patientName: 'Lê Minh Châu',
    date: '2025-07-25', status: 'completed',
    subjective: 'Tái khám sau 7 ngày. Hết tiểu buốt, hết sốt, nước tiểu trong. Uống thuốc đủ liều.',
    objective: 'Nhiệt độ 36.5°C. Cấy nước tiểu: Âm tính. Tổng phân tích: Bạch cầu (-), Nitrit (-).',
    assessment: 'NTĐTN đã điều trị khỏi. Cần theo dõi phòng tái phát.',
    plan: 'Ngưng kháng sinh. Duy trì uống nước đủ. Vệ sinh đúng cách. Tái khám nếu tái phát. Xem xét siêu âm thận nếu tái phát lần 4.',
    prescriptionIds: [],
    createdAt: '2025-07-25T09:00:00.000Z', updatedAt: '2025-07-25T09:20:00.000Z',
  });

  // ── Patient-004: 1 lượt khám (thai phụ) ───────────────────

  map.set('enc-004a', {
    id: 'enc-004a', patientId: 'patient-004', patientName: 'Phạm Thị Dung',
    date: '2026-01-08', status: 'completed',
    subjective: 'Khám thai định kỳ tuần 28. Mệt mỏi nhiều, hoa mắt khi đứng dậy nhanh, da xanh. Không ra máu âm đạo. Thai máy tốt. DỊ ỨNG CEPHALEXIN + DỊ ỨNG HẢI SẢN.',
    objective: 'HA 110/70 mmHg, mạch 88. Thai 28 tuần, tim thai 142 lần/phút. Hb 9.2 g/dL (thiếu máu), MCV 72 fL (hồng cầu nhỏ), Ferritin 8 ng/mL (thiếu sắt). Đường huyết đói bình thường. Nước tiểu: protein (-).',
    assessment: 'Thai 28 tuần, ngôi đầu. Thiếu máu thiếu sắt thai kỳ (O99.0, D50.9). Dị ứng Cephalexin → chú ý phản ứng chéo Penicillin.',
    plan: 'Sắt Fumarate 200mg x 2 lần/ngày, uống xa bữa ăn + Vitamin C. Acid Folic 5mg/ngày. Tái khám 2 tuần sau kiểm tra Hb. Hẹn xét nghiệm dung nạp glucose (nếu chưa làm).',
    prescriptionIds: [],
    createdAt: '2026-01-08T08:00:00.000Z', updatedAt: '2026-01-08T08:45:00.000Z',
  });

  // ── Patient-005: 2 lượt khám (COPD + hen suyễn, đa dị ứng) ──

  map.set('enc-005a', {
    id: 'enc-005a', patientId: 'patient-005', patientName: 'Võ Hoàng Nam',
    date: '2025-06-15', status: 'completed',
    subjective: 'Ho kéo dài > 3 tháng, khạc đàm trắng buổi sáng, khó thở khi gắng sức. Hút thuốc 30 gói-năm. Tiền sử hen từ nhỏ. ĐA DỊ ỨNG: Penicillin (phù mạch), Aspirin (co thắt phế quản).',
    objective: 'SpO2 93% khí trời, nhịp thở 22. PFT: FEV1 52% dự đoán, FEV1/FVC 0.58 (tắc nghẽn trung bình). X-quang ngực: phổi căng giãn, vòm hoành hạ thấp. Bạch cầu không tăng.',
    assessment: 'Bệnh phổi tắc nghẽn mạn tính GOLD giai đoạn II (J44.1). Hen suyễn phối hợp (J45.9). Đa dị ứng thuốc → hạn chế lựa chọn kháng sinh và giảm đau.',
    plan: 'Tiotropium DPI 18mcg/ngày + Salbutamol MDI khi cần. Prednisolone 30mg/ngày x 5 ngày (đợt cấp nhẹ). Cai thuốc lá (tư vấn). Paracetamol cho giảm đau (tránh NSAID). Tái khám 2 tuần.',
    prescriptionIds: ['rx-005a', 'rx-005b'],
    createdAt: '2025-06-15T14:30:00.000Z', updatedAt: '2025-06-15T15:20:00.000Z',
  });

  map.set('enc-005b', {
    id: 'enc-005b', patientId: 'patient-005', patientName: 'Võ Hoàng Nam',
    date: '2025-10-22', status: 'completed',
    subjective: 'Đợt cấp COPD: khó thở tăng 3 ngày, đàm vàng-xanh, sốt 38.2°C. Chưa cai được thuốc lá (giảm còn 10 điếu/ngày). Cần kháng sinh nhưng DỊ ỨNG PENICILLIN → không dùng Amoxicillin.',
    objective: 'SpO2 88% khí trời, nhịp thở 28, sử dụng cơ hô hấp phụ. Nghe phổi: ran rít, ran ngáy 2 bên. CRP 68 mg/L. Bạch cầu 14.2 x10⁹/L. PFT không thực hiện được (khó thở).',
    assessment: 'Đợt cấp COPD nhiễm trùng (J44.0). Cần kháng sinh phổ rộng. Dị ứng Penicillin → chọn Azithromycin thay Amoxicillin.',
    plan: 'Azithromycin 500mg ngày 1, rồi 250mg x 4 ngày. Prednisolone 40mg/ngày x 5 ngày. Salbutamol phun khí dung 2.5mg x 4 lần/ngày. Thở oxy nếu SpO2 < 90%. Tái khám sau 5 ngày.',
    prescriptionIds: ['rx-005c', 'rx-005d'],
    createdAt: '2025-10-22T16:00:00.000Z', updatedAt: '2025-10-22T16:45:00.000Z',
  });

  // ── Patient-006: 2 lượt khám (trẻ em, không dị ứng) ──────

  map.set('enc-006a', {
    id: 'enc-006a', patientId: 'patient-006', patientName: 'Đặng Minh Tú',
    date: '2025-11-05', status: 'completed',
    subjective: 'Bé 7 tuổi, sốt 39°C 2 ngày, đau họng, nuốt khó, bỏ ăn. Viêm amidan 3 lần trong năm. Không dị ứng thuốc.',
    objective: 'Nhiệt độ 38.8°C, cân nặng 24kg. Amidan sưng to độ III, có mủ trắng. Hạch cổ 2 bên. Xét nghiệm nhanh Strep A: (+). Bạch cầu 15.8 x10⁹/L.',
    assessment: 'Viêm amidan cấp mủ do Streptococcus nhóm A (J03.0). Tái phát lần 3 trong năm → xem xét cắt amidan.',
    plan: 'Amoxicillin 250mg x 3 lần/ngày x 10 ngày (25mg/kg/ngày). Paracetamol 250mg khi sốt (10mg/kg). Súc miệng nước muối. Hẹn khám TMH đánh giá chỉ định cắt amidan.',
    prescriptionIds: ['rx-006a', 'rx-006b'],
    createdAt: '2025-11-05T10:00:00.000Z', updatedAt: '2025-11-05T10:30:00.000Z',
  });

  map.set('enc-006b', {
    id: 'enc-006b', patientId: 'patient-006', patientName: 'Đặng Minh Tú',
    date: '2026-02-10', status: 'completed',
    subjective: 'Tái phát viêm amidan lần 4, sốt 38.5°C, đau họng. Mẹ xin chuyển khám TMH để cắt amidan.',
    objective: 'Amidan sưng to độ III, mủ trắng. CRP 38 mg/L.',
    assessment: 'Viêm amidan mạn tái phát (J35.0). Đủ chỉ định phẫu thuật cắt amidan (≥ 4 lần/năm).',
    plan: 'Điều trị đợt cấp: Amoxicillin 250mg x 3/ngày x 10 ngày. Chuyển Khoa TMH lên lịch cắt amidan.',
    prescriptionIds: ['rx-006c'],
    createdAt: '2026-02-10T11:00:00.000Z', updatedAt: '2026-02-10T11:30:00.000Z',
  });

  // ── Patient-007: 1 lượt khám (đa bệnh, đa thuốc) ────────

  map.set('enc-007a', {
    id: 'enc-007a', patientId: 'patient-007', patientName: 'Huỳnh Thị Lan',
    date: '2026-03-01', status: 'completed',
    subjective: 'Bà 77 tuổi, khó thở khi nằm, phù hai chân tăng 1 tuần. Tiểu ít. Tiền sử: suy tim EF 35%, suy thận mạn giai đoạn 3b, ĐTĐ type 2 (10 năm), tăng HA. Không dung nạp Lisinopril (ho khan). Đang dùng 6 loại thuốc.',
    objective: 'HA 155/90 mmHg, mạch 92 (không đều), SpO2 91%. Phù mắt cá chân 2 bên. Nghe phổi: ran ẩm đáy 2 bên. BNP 1280 pg/mL (tăng cao). Creatinine 185 μmol/L, eGFR 28 mL/min (giai đoạn 3b). K+ 5.3 mmol/L (tăng nhẹ). HbA1c 7.8%.',
    assessment: 'Suy tim sung huyết đợt cấp (I50.0). Suy thận mạn giai đoạn 3b (N18.4). ĐTĐ type 2 chưa kiểm soát tốt. Tăng HA. Tăng Kali máu nhẹ. Không dung nạp ACE inhibitor → dùng ARB. Polypharmacy — cần rà soát thuốc.',
    plan: 'Tăng Furosemide 40mg x 2/ngày (tạm thời). Giảm liều Metformin (eGFR < 30 → ngưng nếu eGFR giảm thêm). Đổi sang Losartan 50mg thay Lisinopril. Hạn chế muối < 2g/ngày. Theo dõi cân nặng hàng ngày. Tái khám 1 tuần kiểm tra Creatinine + K+.',
    prescriptionIds: ['rx-007a', 'rx-007b', 'rx-007c', 'rx-007d'],
    createdAt: '2026-03-01T09:00:00.000Z', updatedAt: '2026-03-01T10:00:00.000Z',
  });

  return map;
}

// ════════════════════════════════════════════════════════════
// PRESCRIPTIONS (Đơn thuốc)
// ════════════════════════════════════════════════════════════

export function seedPrescriptions(): Map<string, FHIRMedicationRequest> {
  const map = new Map<string, FHIRMedicationRequest>();

  // ── Patient-001 Prescriptions ─────────────────────────────

  map.set('rx-001a', {
    resourceType: 'MedicationRequest', id: 'rx-001a',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-metformin', display: 'Metformin' },
    subject: { reference: 'Patient/patient-001', display: 'Nguyễn Văn An' },
    authoredOn: '2025-09-10T08:45:00.000Z',
    dosageInstruction: [{
      text: '1 viên 850mg, 2 lần/ngày, sau bữa ăn',
      timing: { code: { text: '2 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 850, unit: 'mg' } }],
    }],
    note: [{ text: 'Uống sau bữa ăn để giảm kích ứng dạ dày' }],
  });

  map.set('rx-001b', {
    resourceType: 'MedicationRequest', id: 'rx-001b',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-lisinopril', display: 'Lisinopril' },
    subject: { reference: 'Patient/patient-001', display: 'Nguyễn Văn An' },
    authoredOn: '2025-09-10T08:50:00.000Z',
    dosageInstruction: [{
      text: '1 viên 10mg, 1 lần/ngày, buổi sáng',
      timing: { code: { text: '1 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 10, unit: 'mg' } }],
    }],
  });

  map.set('rx-001c', {
    resourceType: 'MedicationRequest', id: 'rx-001c',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-omeprazole', display: 'Omeprazole' },
    subject: { reference: 'Patient/patient-001', display: 'Nguyễn Văn An' },
    authoredOn: '2025-10-12T09:15:00.000Z',
    dosageInstruction: [{
      text: '1 viên 20mg, 1 lần/ngày, trước bữa ăn sáng 30 phút',
      timing: { code: { text: '1 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 20, unit: 'mg' } }],
    }],
    note: [{ text: 'Bảo vệ dạ dày do dùng Metformin gây khó chịu' }],
  });

  // ── Patient-002 Prescriptions ─────────────────────────────

  map.set('rx-002a', {
    resourceType: 'MedicationRequest', id: 'rx-002a',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-prednisolone', display: 'Prednisolone' },
    subject: { reference: 'Patient/patient-002', display: 'Trần Thị Bình' },
    authoredOn: '2025-08-05T14:30:00.000Z',
    dosageInstruction: [{
      text: '2 viên 5mg (=10mg), 1 lần/ngày, sau bữa ăn sáng x 2 tuần rồi giảm dần',
      timing: { code: { text: '1 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 10, unit: 'mg' } }],
    }],
    note: [{ text: 'Giảm dần 2.5mg mỗi tuần. Uống kèm Omeprazole bảo vệ dạ dày.' }],
  });

  map.set('rx-002b', {
    resourceType: 'MedicationRequest', id: 'rx-002b',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-paracetamol', display: 'Paracetamol' },
    subject: { reference: 'Patient/patient-002', display: 'Trần Thị Bình' },
    authoredOn: '2025-08-05T14:35:00.000Z',
    dosageInstruction: [{
      text: '1 viên 500mg, mỗi 6-8 giờ khi đau, tối đa 4 viên/ngày',
      timing: { code: { text: 'Mỗi 6-8 giờ khi cần' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 500, unit: 'mg' } }],
    }],
    note: [{ text: 'An toàn cho bệnh nhân dị ứng Aspirin (không phải NSAID)' }],
  });

  map.set('rx-002c', {
    resourceType: 'MedicationRequest', id: 'rx-002c',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-prednisolone', display: 'Prednisolone' },
    subject: { reference: 'Patient/patient-002', display: 'Trần Thị Bình' },
    authoredOn: '2025-11-20T10:15:00.000Z',
    dosageInstruction: [{
      text: '1 viên 5mg, 1 lần/ngày, sau bữa ăn',
      timing: { code: { text: '1 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 5, unit: 'mg' } }],
    }],
    note: [{ text: 'Giảm liều từ 10mg. Bổ sung Calcium + Vit D phòng loãng xương.' }],
  });

  // ── Patient-003 Prescriptions ─────────────────────────────

  map.set('rx-003a', {
    resourceType: 'MedicationRequest', id: 'rx-003a',
    status: 'completed', intent: 'order',
    medication: { reference: 'Medication/med-ciprofloxacin', display: 'Ciprofloxacin' },
    subject: { reference: 'Patient/patient-003', display: 'Lê Minh Châu' },
    authoredOn: '2025-07-18T11:15:00.000Z',
    dosageInstruction: [{
      text: '1 viên 500mg, 2 lần/ngày x 7 ngày',
      timing: { code: { text: '2 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 500, unit: 'mg' } }],
    }],
    note: [{ text: 'Dị ứng Sulfonamide → dùng Ciprofloxacin thay TMP-SMX. Uống xa bữa ăn 2 giờ.' }],
  });

  // ── Patient-005 Prescriptions ─────────────────────────────

  map.set('rx-005a', {
    resourceType: 'MedicationRequest', id: 'rx-005a',
    status: 'completed', intent: 'order',
    medication: { reference: 'Medication/med-prednisolone', display: 'Prednisolone' },
    subject: { reference: 'Patient/patient-005', display: 'Võ Hoàng Nam' },
    authoredOn: '2025-06-15T15:00:00.000Z',
    dosageInstruction: [{
      text: '6 viên 5mg (=30mg), 1 lần/ngày, buổi sáng x 5 ngày',
      timing: { code: { text: '1 lần/ngày x 5 ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 30, unit: 'mg' } }],
    }],
  });

  map.set('rx-005b', {
    resourceType: 'MedicationRequest', id: 'rx-005b',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-paracetamol', display: 'Paracetamol' },
    subject: { reference: 'Patient/patient-005', display: 'Võ Hoàng Nam' },
    authoredOn: '2025-06-15T15:05:00.000Z',
    dosageInstruction: [{
      text: '1 viên 500mg, mỗi 6 giờ khi đau, tối đa 4g/ngày',
      timing: { code: { text: 'Mỗi 6 giờ khi cần' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 500, unit: 'mg' } }],
    }],
    note: [{ text: 'Dị ứng Aspirin → Paracetamol là giảm đau an toàn duy nhất cho BN này' }],
  });

  map.set('rx-005c', {
    resourceType: 'MedicationRequest', id: 'rx-005c',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-azithromycin', display: 'Azithromycin' },
    subject: { reference: 'Patient/patient-005', display: 'Võ Hoàng Nam' },
    authoredOn: '2025-10-22T16:15:00.000Z',
    dosageInstruction: [{
      text: '2 viên 250mg (=500mg) ngày 1, rồi 1 viên 250mg/ngày x 4 ngày',
      timing: { code: { text: 'Xem hướng dẫn' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 250, unit: 'mg' } }],
    }],
    note: [{ text: 'Dị ứng Penicillin → dùng Azithromycin thay Amoxicillin cho đợt cấp COPD' }],
  });

  map.set('rx-005d', {
    resourceType: 'MedicationRequest', id: 'rx-005d',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-prednisolone', display: 'Prednisolone' },
    subject: { reference: 'Patient/patient-005', display: 'Võ Hoàng Nam' },
    authoredOn: '2025-10-22T16:20:00.000Z',
    dosageInstruction: [{
      text: '8 viên 5mg (=40mg), 1 lần/ngày, buổi sáng x 5 ngày',
      timing: { code: { text: '1 lần/ngày x 5 ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 40, unit: 'mg' } }],
    }],
  });

  // ── Patient-006 Prescriptions (trẻ em) ────────────────────

  map.set('rx-006a', {
    resourceType: 'MedicationRequest', id: 'rx-006a',
    status: 'completed', intent: 'order',
    medication: { reference: 'Medication/med-amoxicillin', display: 'Amoxicillin' },
    subject: { reference: 'Patient/patient-006', display: 'Đặng Minh Tú' },
    authoredOn: '2025-11-05T10:15:00.000Z',
    dosageInstruction: [{
      text: '1 viên 250mg (hoặc 5mL siro), 3 lần/ngày x 10 ngày',
      timing: { code: { text: '3 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 250, unit: 'mg' } }],
    }],
    note: [{ text: 'Liều trẻ em 25mg/kg/ngày. Cân nặng 24kg → 600mg/ngày chia 3 lần.' }],
  });

  map.set('rx-006b', {
    resourceType: 'MedicationRequest', id: 'rx-006b',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-paracetamol', display: 'Paracetamol' },
    subject: { reference: 'Patient/patient-006', display: 'Đặng Minh Tú' },
    authoredOn: '2025-11-05T10:20:00.000Z',
    dosageInstruction: [{
      text: '1 viên 250mg, mỗi 6 giờ khi sốt > 38.5°C',
      timing: { code: { text: 'Mỗi 6 giờ khi sốt' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 250, unit: 'mg' } }],
    }],
    note: [{ text: 'Liều trẻ em 10-15mg/kg/lần. Tối đa 4 lần/ngày.' }],
  });

  map.set('rx-006c', {
    resourceType: 'MedicationRequest', id: 'rx-006c',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-amoxicillin', display: 'Amoxicillin' },
    subject: { reference: 'Patient/patient-006', display: 'Đặng Minh Tú' },
    authoredOn: '2026-02-10T11:15:00.000Z',
    dosageInstruction: [{
      text: '1 viên 250mg, 3 lần/ngày x 10 ngày',
      timing: { code: { text: '3 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 250, unit: 'mg' } }],
    }],
    note: [{ text: 'Viêm amidan lần 4 → chuyển TMH cắt amidan sau khi hết đợt cấp.' }],
  });

  // ── Patient-007 Prescriptions (polypharmacy) ──────────────

  map.set('rx-007a', {
    resourceType: 'MedicationRequest', id: 'rx-007a',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-metformin', display: 'Metformin' },
    subject: { reference: 'Patient/patient-007', display: 'Huỳnh Thị Lan' },
    authoredOn: '2026-03-01T09:30:00.000Z',
    dosageInstruction: [{
      text: '1 viên 500mg (giảm liều), 2 lần/ngày, sau bữa ăn',
      timing: { code: { text: '2 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 500, unit: 'mg' } }],
    }],
    note: [{ text: 'Giảm liều do eGFR 28. Ngưng nếu eGFR < 15.' }],
  });

  map.set('rx-007b', {
    resourceType: 'MedicationRequest', id: 'rx-007b',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-omeprazole', display: 'Omeprazole' },
    subject: { reference: 'Patient/patient-007', display: 'Huỳnh Thị Lan' },
    authoredOn: '2026-03-01T09:35:00.000Z',
    dosageInstruction: [{
      text: '1 viên 20mg, 1 lần/ngày, trước ăn sáng',
      timing: { code: { text: '1 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 20, unit: 'mg' } }],
    }],
  });

  map.set('rx-007c', {
    resourceType: 'MedicationRequest', id: 'rx-007c',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-paracetamol', display: 'Paracetamol' },
    subject: { reference: 'Patient/patient-007', display: 'Huỳnh Thị Lan' },
    authoredOn: '2026-03-01T09:40:00.000Z',
    dosageInstruction: [{
      text: '1 viên 500mg, mỗi 8 giờ khi đau',
      timing: { code: { text: 'Mỗi 8 giờ khi cần' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 500, unit: 'mg' } }],
    }],
    note: [{ text: 'Giảm đau an toàn cho người suy thận. Không dùng NSAID.' }],
  });

  map.set('rx-007d', {
    resourceType: 'MedicationRequest', id: 'rx-007d',
    status: 'active', intent: 'order',
    medication: { reference: 'Medication/med-cetirizine', display: 'Cetirizine' },
    subject: { reference: 'Patient/patient-007', display: 'Huỳnh Thị Lan' },
    authoredOn: '2026-03-01T09:45:00.000Z',
    dosageInstruction: [{
      text: '1 viên 10mg, 1 lần/ngày, buổi tối',
      timing: { code: { text: '1 lần/ngày' } },
      route: { coding: [snomed('26643006', 'Đường uống')] },
      doseAndRate: [{ doseQuantity: { value: 10, unit: 'mg' } }],
    }],
    note: [{ text: 'Mề đay mạn tính. Không cần chỉnh liều cho suy thận.' }],
  });

  return map;
}
