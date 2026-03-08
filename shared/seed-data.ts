export type SeedLab = {
  id: string;
  name: string;
  loinc?: string;
  value: string;
  unit: string;
  referenceRange: string;
  abnormal: boolean;
  collectedAt: string;
};

export type SeedNote = {
  id: string;
  type: "PROGRESS" | "CONSULT" | "DISCHARGE";
  title: string;
  author: string;
  content: string;
  signed: boolean;
  createdAt: string;
};

export type SeedOrder = {
  id: string;
  name: string;
  category: "LAB" | "MED" | "IMAGING";
  parameters: Record<string, string>;
  status: "DRAFT" | "PENDING_SIGNATURE" | "SIGNED";
  rationale: string;
  createdAt: string;
};

export type SeedEncounter = {
  id: string;
  type: string;
  reasonForVisit: string;
  provider: string;
  startedAt: string;
  status: "OPEN" | "SIGNED" | "CLOSED";
  labs: SeedLab[];
  notes: SeedNote[];
  orders: SeedOrder[];
};

export type SeedScenario = {
  id: string;
  title: string;
  objective: string;
  rubric: string[];
  requiredOrders: string[];
  requiredNoteElements: string[];
};

export type SeedPatient = {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  sex: string;
  allergies: string[];
  bannerFlags: string[];
  summary: string;
  encounters: SeedEncounter[];
  scenarios: SeedScenario[];
};

export const seedPatients: SeedPatient[] = [
  {
    id: "pat-1001",
    mrn: "SYN-1001",
    fullName: "Mary Johnson",
    age: 68,
    sex: "F",
    allergies: ["Penicillin"],
    bannerFlags: ["Fall risk", "CKD stage 3"],
    summary: "Admitted with weakness and oliguria after several days of poor oral intake.",
    encounters: [
      {
        id: "enc-1001",
        type: "Inpatient",
        reasonForVisit: "Acute kidney injury evaluation",
        provider: "Dr. Ada Carter",
        startedAt: "2026-03-05T14:15:00.000Z",
        status: "OPEN",
        labs: [
          {
            id: "lab-1001",
            name: "Creatinine",
            loinc: "2160-0",
            value: "2.3",
            unit: "mg/dL",
            referenceRange: "0.6-1.2",
            abnormal: true,
            collectedAt: "2026-03-06T08:12:00.000Z"
          },
          {
            id: "lab-1002",
            name: "Creatinine",
            loinc: "2160-0",
            value: "1.8",
            unit: "mg/dL",
            referenceRange: "0.6-1.2",
            abnormal: true,
            collectedAt: "2026-03-05T09:02:00.000Z"
          },
          {
            id: "lab-1003",
            name: "Hemoglobin",
            loinc: "718-7",
            value: "10.4",
            unit: "g/dL",
            referenceRange: "12.0-16.0",
            abnormal: true,
            collectedAt: "2026-03-06T08:12:00.000Z"
          }
        ],
        notes: [
          {
            id: "note-1001",
            type: "CONSULT",
            title: "Nephrology consult",
            author: "Dr. J. Morales",
            content: "Assessment: pre-renal AKI suspected. Recommend isotonic fluids, medication review, and repeat BMP in 6 hours.",
            signed: true,
            createdAt: "2026-03-05T16:40:00.000Z"
          }
        ],
        orders: [
          {
            id: "ord-1001",
            name: "Basic metabolic panel",
            category: "LAB",
            parameters: {
              frequency: "q6h"
            },
            status: "SIGNED",
            rationale: "Trend renal function.",
            createdAt: "2026-03-05T16:55:00.000Z"
          }
        ]
      }
    ],
    scenarios: [
      {
        id: "scn-1001",
        title: "AKI chart review",
        objective: "Review labs, place fluid and repeat BMP orders, then write a grounded SOAP progress note.",
        rubric: [
          "Identify most recent creatinine",
          "Order isotonic fluids or repeat BMP",
          "Document likely pre-renal AKI in assessment",
          "Sign the encounter"
        ],
        requiredOrders: ["Basic metabolic panel", "Normal saline bolus"],
        requiredNoteElements: ["Creatinine trend", "Volume assessment", "Plan for repeat labs"]
      }
    ]
  },
  {
    id: "pat-1002",
    mrn: "SYN-1002",
    fullName: "Robert Chen",
    age: 52,
    sex: "M",
    allergies: ["None known"],
    bannerFlags: ["Droplet precautions"],
    summary: "Seen for fever, productive cough, and exertional dyspnea.",
    encounters: [
      {
        id: "enc-1002",
        type: "Observation",
        reasonForVisit: "Community-acquired pneumonia",
        provider: "Dr. Nina Brooks",
        startedAt: "2026-03-04T11:05:00.000Z",
        status: "OPEN",
        labs: [
          {
            id: "lab-2001",
            name: "WBC",
            loinc: "6690-2",
            value: "14.8",
            unit: "K/uL",
            referenceRange: "4.0-10.5",
            abnormal: true,
            collectedAt: "2026-03-04T11:40:00.000Z"
          },
          {
            id: "lab-2002",
            name: "Procalcitonin",
            loinc: "33959-8",
            value: "1.8",
            unit: "ng/mL",
            referenceRange: "<0.5",
            abnormal: true,
            collectedAt: "2026-03-04T11:40:00.000Z"
          }
        ],
        notes: [
          {
            id: "note-2001",
            type: "DISCHARGE",
            title: "Prior urgent care note",
            author: "Dr. A. Singh",
            content: "Started doxycycline yesterday; advised chest imaging if symptoms worsen.",
            signed: true,
            createdAt: "2026-03-03T18:20:00.000Z"
          }
        ],
        orders: [
          {
            id: "ord-2001",
            name: "Chest X-ray",
            category: "IMAGING",
            parameters: {
              priority: "Routine"
            },
            status: "PENDING_SIGNATURE",
            rationale: "Evaluate infiltrate.",
            createdAt: "2026-03-04T11:50:00.000Z"
          }
        ]
      }
    ],
    scenarios: [
      {
        id: "scn-1002",
        title: "Pneumonia follow-up",
        objective: "Review infectious workup, document prior antibiotic exposure, and sign a chest X-ray order.",
        rubric: [
          "Find prior antibiotic exposure",
          "Place or sign chest imaging order",
          "Write a concise progress note"
        ],
        requiredOrders: ["Chest X-ray"],
        requiredNoteElements: ["Antibiotic exposure", "Respiratory symptoms", "Follow-up plan"]
      }
    ]
  }
];
