"use client";

import { type FormEvent, useMemo, useState } from "react";

import { ActivityNav } from "./activity-nav";
import { AppBrand } from "./app-brand";
import { ChartReviewTabs } from "./chart-review-tabs";
import { SectionCard } from "./section-card";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { formatDateTime } from "../lib/chart";

type NoteItem = {
  id: string;
  type: string;
  title: string;
  author: string;
  content: string;
  signed: boolean;
  createdAt: string;
};

type OrderItem = {
  id: string;
  name: string;
  category: string;
  parameters: Record<string, string>;
  status: string;
  rationale: string;
  createdAt: string;
};

type ReferralItem = {
  id: string;
  referredDepartment: string;
  referredProvider: string;
  reason: string;
  createdAt: string;
};

type ProblemItem = {
  id: string;
  name: string;
  createdAt: string;
};

type DiagnosisItem = {
  id: string;
  code: string;
  category: string;
  name: string;
  createdAt: string;
};

type EncounterItem = {
  id: string;
  type: string;
  reasonForVisit: string;
  provider: string;
  startedAt: string;
  status: string;
  labs: Array<{
    id: string;
    name: string;
    loinc: string | null;
    value: string;
    unit: string;
    referenceRange: string;
    abnormal: boolean;
    collectedAt: string;
  }>;
  notes: NoteItem[];
  orders: OrderItem[];
  referrals: ReferralItem[];
};

type ScenarioItem = {
  id: string;
  encounterId: string;
  title: string;
  objective: string;
  rubric: string[];
  requiredOrders: string[];
  requiredNoteElements: string[];
};

export type PatientWorkspaceData = {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  sex: string;
  allergies: string[];
  problemList: string[];
  diagnoses: DiagnosisItem[];
  summary: string;
  encounters: EncounterItem[];
  scenarios: ScenarioItem[];
};

type WorkflowResponse =
  | { note: NoteItem }
  | { order: OrderItem }
  | { referral: ReferralItem }
  | { problem: ProblemItem }
  | { diagnosis: DiagnosisItem }
  | { encounter: { id: string; status: string } }
  | { ok: true };

type OrderCatalogEntry = {
  orderName: string;
  cat1: string;
  cat2: string;
  cat3: string;
};

type PatientWorkspaceProps = {
  initialPatient: PatientWorkspaceData;
  orderCatalog: OrderCatalogEntry[];
  providerCatalog: ProviderCatalogEntry[];
  problemCatalog: ProblemCatalogEntry[];
  diagnosisCatalog: DiagnosisCatalogEntry[];
};

type ProviderCatalogEntry = {
  firstName: string;
  lastName: string;
  department: string;
};

type ProblemCatalogEntry = {
  name: string;
};

type DiagnosisCatalogEntry = {
  code: string;
  category: string;
  name: string;
};

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    uniqueValues.push(value);
  }

  return uniqueValues;
}

function buildInitialOrderSelection(orderCatalog: OrderCatalogEntry[]) {
  const category = uniqueInOrder(orderCatalog.map((entry) => entry.cat1))[0] ?? "";
  const higherGroup = uniqueInOrder(orderCatalog.filter((entry) => entry.cat1 === category).map((entry) => entry.cat2))[0] ?? "";
  const lowerGroup =
    uniqueInOrder(orderCatalog.filter((entry) => entry.cat1 === category && entry.cat2 === higherGroup).map((entry) => entry.cat3))[0] ?? "";
  const orderName =
    uniqueInOrder(
      orderCatalog
        .filter((entry) => entry.cat1 === category && entry.cat2 === higherGroup && entry.cat3 === lowerGroup)
        .map((entry) => entry.orderName)
    )[0] ?? "";

  return { category, higherGroup, lowerGroup, orderName };
}

function normalizeCatalogValue(value: string) {
  return value.trim().toLowerCase();
}

function formatDiagnosisCatalogValue(entry: DiagnosisCatalogEntry) {
  return `${entry.code} - ${entry.name}`;
}

export function PatientWorkspace({ initialPatient, orderCatalog, providerCatalog, problemCatalog, diagnosisCatalog }: PatientWorkspaceProps) {
  const [patient, setPatient] = useState(initialPatient);
  const [notePending, setNotePending] = useState(false);
  const [orderPending, setOrderPending] = useState(false);
  const [referralPending, setReferralPending] = useState(false);
  const [problemPending, setProblemPending] = useState(false);
  const [diagnosisPending, setDiagnosisPending] = useState(false);
  const [signingOrderId, setSigningOrderId] = useState<string | null>(null);
  const [signingEncounter, setSigningEncounter] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [problemSearch, setProblemSearch] = useState("");
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [newVisitProblems, setNewVisitProblems] = useState<string[]>([]);
  const [newVisitDiagnoses, setNewVisitDiagnoses] = useState<string[]>([]);
  const initialOrderSelection = useMemo(() => buildInitialOrderSelection(orderCatalog), [orderCatalog]);
  const [selectedCategory, setSelectedCategory] = useState(initialOrderSelection.category);
  const [selectedHigherGroup, setSelectedHigherGroup] = useState(initialOrderSelection.higherGroup);
  const [selectedLowerGroup, setSelectedLowerGroup] = useState(initialOrderSelection.lowerGroup);
  const [selectedOrderName, setSelectedOrderName] = useState(initialOrderSelection.orderName);
  const departmentOptions = useMemo(() => uniqueInOrder(providerCatalog.map((entry) => entry.department)), [providerCatalog]);
  const [selectedReferralDepartment, setSelectedReferralDepartment] = useState(departmentOptions[0] ?? "");
  const providerOptions = useMemo(
    () => providerCatalog.filter((entry) => entry.department === selectedReferralDepartment).map((entry) => `${entry.firstName} ${entry.lastName}`),
    [providerCatalog, selectedReferralDepartment]
  );
  const [selectedReferralProvider, setSelectedReferralProvider] = useState<string>("N/A");

  const activeEncounter = patient.encounters[0];
  const scenario =
    patient.scenarios.find((candidate) => candidate.encounterId === activeEncounter?.id) ?? patient.scenarios[0];

  const requiredOrders = scenario?.requiredOrders ?? [];
  const requiredNoteElements = scenario?.requiredNoteElements ?? [];
  const rubric = scenario?.rubric ?? [];
  const problemList = useMemo(() => uniqueInOrder(patient.problemList || []), [patient.problemList]);
  const diagnosisList = useMemo(
    () => uniqueInOrder(patient.diagnoses.map((diagnosis) => `${diagnosis.code} - ${diagnosis.name}`)),
    [patient.diagnoses]
  );
  const filteredProblemCatalog = useMemo(() => {
    const query = normalizeCatalogValue(problemSearch);
    const matches = query
      ? problemCatalog.filter((entry) => normalizeCatalogValue(entry.name).includes(query))
      : problemCatalog;

    return matches.slice(0, 20);
  }, [problemCatalog, problemSearch]);
  const filteredDiagnosisCatalog = useMemo(() => {
    const query = normalizeCatalogValue(diagnosisSearch);
    const matches = query
      ? diagnosisCatalog.filter((entry) => {
          const searchableText = normalizeCatalogValue(
            `${entry.code} ${entry.name} ${entry.category} ${formatDiagnosisCatalogValue(entry)}`
          );
          return searchableText.includes(query);
        })
      : diagnosisCatalog;

    return [...matches]
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" }))
      .slice(0, 20);
  }, [diagnosisCatalog, diagnosisSearch]);
  const normalizedNewVisitProblems = useMemo(
    () => new Set(newVisitProblems.map((problem) => normalizeCatalogValue(problem))),
    [newVisitProblems]
  );
  const normalizedNewVisitDiagnoses = useMemo(
    () => new Set(newVisitDiagnoses.map((diagnosis) => normalizeCatalogValue(diagnosis))),
    [newVisitDiagnoses]
  );
  const getHigherGroupOptions = (category: string) =>
    uniqueInOrder(orderCatalog.filter((entry) => entry.cat1 === category).map((entry) => entry.cat2));
  const getLowerGroupOptions = (category: string, higherGroup: string) =>
    uniqueInOrder(orderCatalog.filter((entry) => entry.cat1 === category && entry.cat2 === higherGroup).map((entry) => entry.cat3));
  const getOrderNameOptions = (category: string, higherGroup: string, lowerGroup: string) =>
    uniqueInOrder(
      orderCatalog
        .filter((entry) => entry.cat1 === category && entry.cat2 === higherGroup && entry.cat3 === lowerGroup)
        .map((entry) => entry.orderName)
    );

  const categoryOptions = useMemo(() => uniqueInOrder(orderCatalog.map((entry) => entry.cat1)), [orderCatalog]);
  const higherGroupOptions = useMemo(() => getHigherGroupOptions(selectedCategory), [orderCatalog, selectedCategory]);
  const lowerGroupOptions = useMemo(() => getLowerGroupOptions(selectedCategory, selectedHigherGroup), [orderCatalog, selectedCategory, selectedHigherGroup]);
  const orderNameOptions = useMemo(
    () => getOrderNameOptions(selectedCategory, selectedHigherGroup, selectedLowerGroup),
    [orderCatalog, selectedCategory, selectedHigherGroup, selectedLowerGroup]
  );

  const globalNavItems = [
    { label: "Chart Review", href: "#chart-review" },
    { label: "Synopsis", href: "#summary" },
    { label: "Orders", href: "#orders" },
    { label: "Referrals", href: "#referrals" },
    { label: "Notes", href: "#notes" },
    { label: "Plan", href: "#summary" },
    { label: "Wrap-Up", href: "#encounter" }
  ];
  const activityNavItems = [
    { label: "Summary", href: "#summary", testId: "activity-summary" },
    { label: "Chart Review", href: "#chart-review", testId: "activity-chart-review" },
    { label: "Notes", href: "#notes", testId: "activity-notes" },
    { label: "Orders", href: "#orders", testId: "activity-orders" },
    { label: "Referrals", href: "#referrals", testId: "activity-referrals" },
    { label: "Wrap-Up", href: "#encounter", testId: "activity-encounter" }
  ];
  const sidebarNavItems = [
    { label: "Summary", href: "#summary" },
    { label: "Labs & encounters", href: "#chart-review" },
    { label: "Documentation", href: "#notes" },
    { label: "Order Entry", href: "#orders" },
    { label: "Referrals", href: "#referrals" },
    { label: "Sign / close", href: "#encounter" }
  ];

  const noteText = activeEncounter?.notes.map((note) => note.content).join("\n") ?? "";
  const ordersComplete = requiredOrders.length === 0 || requiredOrders.every((ro) => activeEncounter?.orders.some((o) => o.name === ro && o.status === "SIGNED"));
  const notesComplete = requiredNoteElements.length === 0 || requiredNoteElements.every((el) => noteText.toLowerCase().includes(el.toLowerCase()));
  const encounterSigned = activeEncounter?.status === "SIGNED";
  const hasLabs = (activeEncounter?.labs.length ?? 0) > 0;

  // Map each rubric item to a completion check based on its keywords
  const completedRubric = new Set<string>();
  for (const item of rubric) {
    const lower = item.toLowerCase();
    if (lower.includes("sign") && lower.includes("encounter")) {
      if (encounterSigned) completedRubric.add(item);
    } else if (lower.includes("order") || lower.includes("place")) {
      if (ordersComplete) completedRubric.add(item);
    } else if (lower.includes("document") || lower.includes("note") || lower.includes("write")) {
      if (notesComplete) completedRubric.add(item);
    } else if (lower.includes("review") || lower.includes("identify") || lower.includes("assess")) {
      if (hasLabs) completedRubric.add(item);
    }
  }

  if (!activeEncounter) {
    return null;
  }

  async function postWorkflow(payload: Record<string, unknown>) {
    const response = await fetch(`/api/patients/${patient.id}/workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Request failed");
    }

    return (await response.json()) as WorkflowResponse;
  }

  function updateEncounter(update: (encounter: EncounterItem) => EncounterItem) {
    setPatient((current) => ({
      ...current,
      encounters: current.encounters.map((encounter) => (encounter.id === activeEncounter.id ? update(encounter) : encounter))
    }));
  }

  async function handleCreateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setNotePending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await postWorkflow({
        type: "create_note",
        encounterId: activeEncounter.id,
        author: formData.get("author"),
        title: formData.get("title"),
        content: formData.get("content")
      });

      if ("note" in result) {
        updateEncounter((encounter) => ({
          ...encounter,
          notes: [result.note, ...encounter.notes]
        }));
      }
      form.reset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save note");
    } finally {
      setNotePending(false);
    }
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setOrderPending(true);

    if (!selectedCategory || !selectedOrderName) {
      setErrorMessage("Please choose a valid order path before submitting.");
      setOrderPending(false);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await postWorkflow({
        type: "create_order",
        encounterId: activeEncounter.id,
        name: selectedOrderName,
        category: selectedCategory,
        parameters: formData.get("parameters"),
        rationale: formData.get("rationale"),
        submitForSignature: formData.get("submitForSignature") === "on"
      });

      if ("order" in result) {
        updateEncounter((encounter) => ({
          ...encounter,
          orders: [result.order, ...encounter.orders]
        }));
      }
      form.reset();
      const nextCategory = categoryOptions[0] ?? "";
      const nextHigherGroup = getHigherGroupOptions(nextCategory)[0] ?? "";
      const nextLowerGroup = getLowerGroupOptions(nextCategory, nextHigherGroup)[0] ?? "";
      const nextOrderName = getOrderNameOptions(nextCategory, nextHigherGroup, nextLowerGroup)[0] ?? "";
      setSelectedCategory(nextCategory);
      setSelectedHigherGroup(nextHigherGroup);
      setSelectedLowerGroup(nextLowerGroup);
      setSelectedOrderName(nextOrderName);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save order");
    } finally {
      setOrderPending(false);
    }
  }

  async function handleSignOrder(orderId: string) {
    setErrorMessage(null);
    setSigningOrderId(orderId);

    try {
      const result = await postWorkflow({
        type: "sign_order",
        orderId
      });

      if ("order" in result) {
        updateEncounter((encounter) => ({
          ...encounter,
          orders: encounter.orders.map((order) => (order.id === orderId ? result.order : order))
        }));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign order");
    } finally {
      setSigningOrderId(null);
    }
  }

  async function handleCreateReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setReferralPending(true);

    if (!selectedReferralDepartment || !selectedReferralProvider) {
      setErrorMessage("Please choose a department and provider option.");
      setReferralPending(false);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await postWorkflow({
        type: "create_referral",
        encounterId: activeEncounter.id,
        department: selectedReferralDepartment,
        provider: selectedReferralProvider,
        reason: formData.get("reason")
      });

      if ("referral" in result) {
        updateEncounter((encounter) => ({
          ...encounter,
          referrals: [result.referral, ...encounter.referrals]
        }));
      }

      form.reset();
      setSelectedReferralProvider("N/A");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to place referral");
    } finally {
      setReferralPending(false);
    }
  }

  async function handleAddProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const matchedProblem = problemCatalog.find((entry) => normalizeCatalogValue(entry.name) === normalizeCatalogValue(problemSearch));

    if (!matchedProblem) {
      setErrorMessage("Choose a problem from the catalog before adding it to the chart.");
      return;
    }

    setProblemPending(true);

    try {
      const result = await postWorkflow({
        type: "create_problem",
        encounterId: activeEncounter.id,
        name: matchedProblem.name
      });

      if ("problem" in result) {
        const alreadyPresent = patient.problemList.includes(result.problem.name);
        setPatient((current) => ({
          ...current,
          problemList: current.problemList.includes(result.problem.name) ? current.problemList : [result.problem.name, ...current.problemList]
        }));

        if (!alreadyPresent) {
          setNewVisitProblems((current) => (current.includes(result.problem.name) ? current : [result.problem.name, ...current]));
        }
      }

      setProblemSearch("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add problem");
    } finally {
      setProblemPending(false);
    }
  }

  async function handleAddDiagnosis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedQuery = normalizeCatalogValue(diagnosisSearch);
    const matchedDiagnosis = diagnosisCatalog.find((entry) => {
      return (
        normalizeCatalogValue(formatDiagnosisCatalogValue(entry)) === normalizedQuery ||
        normalizeCatalogValue(entry.code) === normalizedQuery ||
        normalizeCatalogValue(entry.name) === normalizedQuery
      );
    });

    if (!matchedDiagnosis) {
      setErrorMessage("Choose a diagnosis from the catalog before adding it to the chart.");
      return;
    }

    setDiagnosisPending(true);

    try {
      const result = await postWorkflow({
        type: "create_diagnosis",
        encounterId: activeEncounter.id,
        code: matchedDiagnosis.code,
        category: matchedDiagnosis.category,
        name: matchedDiagnosis.name
      });

      if ("diagnosis" in result) {
        const diagnosisLabel = `${result.diagnosis.code} - ${result.diagnosis.name}`;
        const alreadyPresent = patient.diagnoses.some(
          (diagnosis) => diagnosis.code === result.diagnosis.code && diagnosis.name === result.diagnosis.name
        );
        setPatient((current) => ({
          ...current,
          diagnoses: current.diagnoses.some((diagnosis) => diagnosis.code === result.diagnosis.code && diagnosis.name === result.diagnosis.name)
            ? current.diagnoses
            : [...current.diagnoses, result.diagnosis]
        }));

        if (!alreadyPresent) {
          setNewVisitDiagnoses((current) => (current.includes(diagnosisLabel) ? current : [diagnosisLabel, ...current]));
        }
      }

      setDiagnosisSearch("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add diagnosis");
    } finally {
      setDiagnosisPending(false);
    }
  }

  async function handleSignEncounter() {
    setErrorMessage(null);
    setSigningEncounter(true);

    try {
      await postWorkflow({
        type: "sign_encounter",
        encounterId: activeEncounter.id
      });

      updateEncounter((encounter) => ({
        ...encounter,
        status: "SIGNED",
        notes: encounter.notes.map((note) => ({ ...note, signed: true })),
        orders: encounter.orders.map((order) => ({ ...order, status: "SIGNED" }))
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign encounter");
    } finally {
      setSigningEncounter(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <WorkspaceSidebar
        brand={<AppBrand title="EHRGym" subtitle="Chart workspace" href="/" />}
        sections={[
          {
            title: "Navigation",
            items: [
              { label: "Dashboard", icon: "dashboard", href: "/" },
              { label: "Chart", icon: "chart", href: "#summary" }
            ]
          },
          {
            title: "Sections",
            items: [
              { label: "Summary", icon: "summary", href: "#summary" },
              { label: "Review", icon: "review", href: "#chart-review" },
              { label: "Orders", icon: "orders", href: "#orders" },
              { label: "Notes", icon: "notes", href: "#notes" }
            ]
          }
        ]}
        footerTitle="Active Visit"
        footerText={`${activeEncounter.reasonForVisit} · Patrick Sullivan, MD`}
        footerAction="Return to Worklist"
        footerHref="/"
      />

      <div className="dashboard-main">
        <header className="workspace-header workspace-header--chart">
          <div className="workspace-header__breadcrumbs">
            <a href="/" className="workspace-backlink">
              ← All patients
            </a>
            <ActivityNav items={globalNavItems} className="workspace-pills" ariaLabel="Chart navigation" defaultHref="#chart-review" />
          </div>
          <div className="workspace-header__actions">
            <div className="workspace-profile workspace-profile--compact">
              <div className="workspace-profile__avatar">PS</div>
              <div>
                <strong>Patrick Sullivan, MD</strong>
                <p>Attending Physician</p>
              </div>
            </div>
          </div>
        </header>

        <section className="patient-hero" data-testid="patient-banner">
          <div className="patient-hero__identity">
            <div>
              <p className="patient-hero__eyebrow">Active Chart · MRN {patient.mrn}</p>
              <h1 className="patient-hero__title">{patient.fullName}</h1>
              <p className="patient-hero__lede">
                {patient.age} y/o {patient.sex} · {activeEncounter.reasonForVisit}
              </p>
            </div>
          </div>
          <div className="patient-hero__meta">
            <div className="patient-hero__panel" data-testid="allergies-card">
              <strong>Allergies</strong>
              <span>{patient.allergies.join(", ")}</span>
            </div>
            <div className="patient-hero__panel" data-testid="flags-card">
              <strong>Problem list</strong>
              <span>{patient.problemList.join(" · ")}</span>
            </div>
            <div className="patient-hero__panel" data-testid="encounter-card">
              <strong>Visit focus</strong>
              <span>{scenario?.title ?? activeEncounter.type}</span>
            </div>
            <div className="patient-hero__panel">
              <strong>Admitting</strong>
              <span>{activeEncounter.provider}</span>
            </div>
            <div className="patient-hero__panel patient-hero__panel--status">
              <strong>Visit Status</strong>
              <span className="status-pill" data-status={activeEncounter.status}>
                {activeEncounter.status === "SIGNED" ? "Signed" : activeEncounter.status === "OPEN" ? "In Progress" : activeEncounter.status}
              </span>
            </div>
          </div>
        </section>

        <ActivityNav items={activityNavItems} className="chart-activity-bar workspace-pills workspace-pills--wide" ariaLabel="Activity navigation" defaultHref="#summary" />

        <div className="content-grid content-grid--chart">
          <div className="content-stack">
            <SectionCard title="Patient summary" testId="summary-panel" className="section-card--summary">
              <div id="summary" data-testid="patient-summary" style={{ whiteSpace: "pre-wrap" }}>
                {patient.summary}
              </div>
            </SectionCard>
            <SectionCard title="Chart Review" subtitle="Encounter timeline and laboratory review" testId="chart-review-panel" className="section-card--chart">
              <div id="chart-review">
                <ChartReviewTabs encounters={patient.encounters} labs={activeEncounter.labs} notes={activeEncounter.notes} />
              </div>
            </SectionCard>

            <SectionCard title="Notes" subtitle="Progress and clinical documentation" testId="notes-panel" className="section-card--notes">
              <div id="notes">
                <div className="grid grid--2">
                  <form onSubmit={handleCreateNote} className="list-row" data-testid="note-form">
                    <div className="form-grid">
                      <label className="field">
                        <span className="muted">Author</span>
                        <input aria-label="Note author" name="author" defaultValue="Attending Physician" required />
                      </label>
                      <label className="field">
                        <span className="muted">Title</span>
                        <input aria-label="Note title" name="title" defaultValue="Progress Note" required />
                      </label>
                      <label className="field">
                        <span className="muted">Progress note</span>
                        <textarea
                          aria-label="Progress note content"
                          name="content"
                          defaultValue={`S:\nO:\nA:\nP:`}
                          required
                        />
                      </label>
                      <div className="form-actions">
                        <button className="primary-button" type="submit" data-testid="save-note-button" disabled={notePending}>
                          {notePending ? "Saving note..." : "File progress note"}
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="note-list">
                    {activeEncounter.notes.map((note) => (
                      <article key={note.id} className="note-row" data-testid={`note-row-${note.id}`}>
                        <header>
                          <div>
                            <h3>{note.title}</h3>
                            <p className="muted">
                              {note.type} · {note.author} · {formatDateTime(new Date(note.createdAt))}
                            </p>
                          </div>
                          <span className="status-pill" data-status={note.signed ? "SIGNED" : "OPEN"}>
                            {note.signed ? "SIGNED" : "DRAFT"}
                          </span>
                        </header>
                        <p style={{ whiteSpace: "pre-wrap" }}>{note.content}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Problems and Diagnoses" subtitle="Search and add patient issues from catalogs" testId="problems-diagnoses-panel" className="section-card--problems-diagnoses">
              <div id="problems-diagnoses" className="content-stack">
                <form onSubmit={handleAddProblem} className="list-row list-row--compact" data-testid="problem-form">
                  <div className="form-grid">
                    <label className="field">
                      <span className="muted">Problem list search</span>
                      <input
                        aria-label="Problem list search"
                        list="problem-catalog-options"
                        value={problemSearch}
                        onChange={(event) => setProblemSearch(event.currentTarget.value)}
                        placeholder="Search active problem catalog"
                        required
                      />
                    </label>
                    <p className="muted">{filteredProblemCatalog.length} catalog matches available in the search list.</p>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" data-testid="add-problem-button" disabled={problemPending}>
                        {problemPending ? "Adding problem..." : "Add problem"}
                      </button>
                    </div>
                  </div>
                </form>

                <form onSubmit={handleAddDiagnosis} className="list-row list-row--compact" data-testid="diagnosis-form">
                  <div className="form-grid">
                    <label className="field">
                      <span className="muted">Diagnosis search</span>
                      <input
                        aria-label="Diagnosis search"
                        list="diagnosis-catalog-options"
                        value={diagnosisSearch}
                        onChange={(event) => setDiagnosisSearch(event.currentTarget.value)}
                        placeholder="Search ICD-10 code or diagnosis name"
                        required
                      />
                    </label>
                    <p className="muted">{filteredDiagnosisCatalog.length} diagnosis matches available in the search list.</p>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" data-testid="add-diagnosis-button" disabled={diagnosisPending}>
                        {diagnosisPending ? "Adding diagnosis..." : "Add diagnosis"}
                      </button>
                    </div>
                  </div>
                </form>

                <datalist id="problem-catalog-options">
                  {filteredProblemCatalog.map((entry) => (
                    <option key={entry.name} value={entry.name} />
                  ))}
                </datalist>

                <datalist id="diagnosis-catalog-options">
                  {filteredDiagnosisCatalog.map((entry) => (
                    <option key={`${entry.code}-${entry.name}`} value={formatDiagnosisCatalogValue(entry)} label={entry.category} />
                  ))}
                </datalist>
              </div>
            </SectionCard>

            <SectionCard title="Orders" subtitle="Medication, lab, and imaging entry" testId="orders-panel" className="section-card--orders">
              <div id="orders" className="grid grid--2">
                <form onSubmit={handleCreateOrder} className="list-row" data-testid="order-form">
                  <div className="form-grid">
                    <label className="field">
                      <span className="muted">Category</span>
                      <select
                        aria-label="Order category"
                        name="category"
                        required
                        value={selectedCategory}
                        onChange={(event) => {
                          const nextCategory = event.currentTarget.value;
                          const nextHigherGroup = getHigherGroupOptions(nextCategory)[0] ?? "";
                          const nextLowerGroup = getLowerGroupOptions(nextCategory, nextHigherGroup)[0] ?? "";
                          const nextOrderName = getOrderNameOptions(nextCategory, nextHigherGroup, nextLowerGroup)[0] ?? "";

                          setSelectedCategory(nextCategory);
                          setSelectedHigherGroup(nextHigherGroup);
                          setSelectedLowerGroup(nextLowerGroup);
                          setSelectedOrderName(nextOrderName);
                        }}
                      >
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="muted">Higher group</span>
                      <select
                        aria-label="Order higher group"
                        name="higherGroup"
                        required
                        value={selectedHigherGroup}
                        onChange={(event) => {
                          const nextHigherGroup = event.currentTarget.value;
                          const nextLowerGroup = getLowerGroupOptions(selectedCategory, nextHigherGroup)[0] ?? "";
                          const nextOrderName = getOrderNameOptions(selectedCategory, nextHigherGroup, nextLowerGroup)[0] ?? "";

                          setSelectedHigherGroup(nextHigherGroup);
                          setSelectedLowerGroup(nextLowerGroup);
                          setSelectedOrderName(nextOrderName);
                        }}
                        disabled={!selectedCategory || higherGroupOptions.length === 0}
                      >
                        {higherGroupOptions.map((higherGroup) => (
                          <option key={higherGroup} value={higherGroup}>
                            {higherGroup}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="muted">lower group</span>
                      <select
                        aria-label="Order lower group"
                        name="lowerGroup"
                        required
                        value={selectedLowerGroup}
                        onChange={(event) => {
                          const nextLowerGroup = event.currentTarget.value;
                          const nextOrderName = getOrderNameOptions(selectedCategory, selectedHigherGroup, nextLowerGroup)[0] ?? "";

                          setSelectedLowerGroup(nextLowerGroup);
                          setSelectedOrderName(nextOrderName);
                        }}
                        disabled={!selectedHigherGroup || lowerGroupOptions.length === 0}
                      >
                        {lowerGroupOptions.map((lowerGroup) => (
                          <option key={lowerGroup} value={lowerGroup}>
                            {lowerGroup}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="muted">Order search</span>
                      <select
                        aria-label="Order search"
                        name="name"
                        required
                        value={selectedOrderName}
                        onChange={(event) => setSelectedOrderName(event.currentTarget.value)}
                        disabled={!selectedLowerGroup || orderNameOptions.length === 0}
                      >
                        {orderNameOptions.map((orderName) => (
                          <option key={orderName} value={orderName}>
                            {orderName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="muted">Parameters</span>
                      <input aria-label="Order parameters" name="parameters" placeholder="1 L IV once" required />
                    </label>
                    <label className="field">
                      <span className="muted">Rationale</span>
                      <textarea aria-label="Order rationale" name="rationale" placeholder="Why is this order needed?" required />
                    </label>
                    <label className="checkbox-field">
                      <input className="checkbox-field__control" aria-label="Sign order immediately" name="submitForSignature" type="checkbox" defaultChecked />
                      <span>Sign immediately</span>
                    </label>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" data-testid="save-order-button" disabled={orderPending}>
                        {orderPending ? "Placing order..." : "Place order"}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="order-list">
                  {activeEncounter.orders.map((order) => (
                    <article key={order.id} className="order-row" data-testid={`order-row-${order.id}`}>
                      <header>
                        <div>
                          <h3>{order.name}</h3>
                          <p className="muted">
                            {order.category} · {formatDateTime(new Date(order.createdAt))}
                          </p>
                        </div>
                        <span className="status-pill" data-status={order.status}>
                          {order.status}
                        </span>
                      </header>
                      <p>
                        <strong>Parameters:</strong> {Object.values(order.parameters).join(", ")}
                      </p>
                      <p>
                        <strong>Rationale:</strong> {order.rationale}
                      </p>
                      {order.status !== "SIGNED" ? (
                        <div className="form-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            data-testid={`sign-order-${order.id}`}
                            disabled={signingOrderId === order.id}
                            onClick={() => handleSignOrder(order.id)}
                          >
                            {signingOrderId === order.id ? "Signing..." : "Sign order"}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Referrals" subtitle="Department and provider referrals" testId="referrals-panel" className="section-card--orders">
              <div id="referrals" className="grid grid--2">
                <form onSubmit={handleCreateReferral} className="list-row" data-testid="referral-form">
                  <div className="form-grid">
                    <label className="field">
                      <span className="muted">Department</span>
                      <select
                        aria-label="Referral department"
                        name="department"
                        required
                        value={selectedReferralDepartment}
                        onChange={(event) => {
                          setSelectedReferralDepartment(event.currentTarget.value);
                          setSelectedReferralProvider("N/A");
                        }}
                      >
                        {departmentOptions.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="muted">Provider</span>
                      <select
                        aria-label="Referral provider"
                        name="provider"
                        required
                        value={selectedReferralProvider}
                        onChange={(event) => setSelectedReferralProvider(event.currentTarget.value)}
                      >
                        <option value="N/A">N/A (department only)</option>
                        {providerOptions.map((providerName) => (
                          <option key={providerName} value={providerName}>
                            {providerName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="muted">Reason</span>
                      <textarea aria-label="Referral reason" name="reason" placeholder="Reason for referral (optional)" />
                    </label>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" data-testid="save-referral-button" disabled={referralPending}>
                        {referralPending ? "Submitting referral..." : "Place referral"}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="order-list">
                  {activeEncounter.referrals.map((referral) => (
                    <article key={referral.id} className="order-row" data-testid={`referral-row-${referral.id}`}>
                      <header>
                        <div>
                          <h3>{referral.referredDepartment}</h3>
                          <p className="muted">
                            {referral.referredProvider} · {formatDateTime(new Date(referral.createdAt))}
                          </p>
                        </div>
                        <span className="status-pill" data-status="SIGNED">
                          SENT
                        </span>
                      </header>
                      {referral.reason ? (
                        <p>
                          <strong>Reason:</strong> {referral.reason}
                        </p>
                      ) : (
                        <p className="muted">No reason specified.</p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Wrap-Up" subtitle="Finalize documentation and orders" testId="encounter-panel" className="section-card--wrapup">
              <div id="encounter" className="list-row list-row--split">
                <p>Signing this visit finalizes notes and promotes all remaining draft or pending orders to signed.</p>
                <div className="form-actions">
                  <button className="primary-button" type="button" data-testid="sign-encounter-button" disabled={signingEncounter} onClick={handleSignEncounter}>
                    {signingEncounter ? "Signing visit..." : "Sign visit"}
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="content-stack">
            <SectionCard title="Review Status" subtitle="Visit workflow" className="section-card--summary">
              <div className="rail-list">
                {rubric.map((item) => {
                  const completed = completedRubric.has(item);
                  return (
                    <div key={item} className="rail-list__item">
                      <strong>{item}</strong>
                      <span>{completed ? "Completed" : "Pending review"}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Chart Navigation" subtitle="Common activities" className="section-card--summary">
              <ActivityNav items={sidebarNavItems} className="sidebar-nav" ariaLabel="Chart sections" defaultHref="#summary" />
            </SectionCard>

            <SectionCard title="Problem List" subtitle="Active charted issues" className="section-card--problem-list">
              <div className="problem-list">
                {problemList.map((problem) => (
                  <div key={problem} className="problem-list__item">
                    <span>{problem}</span>
                    <span className="problem-list__status">{normalizedNewVisitProblems.has(normalizeCatalogValue(problem)) ? "New" : "Active"}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Diagnoses" subtitle="Documented on chart" className="section-card--diagnosis-list">
              <div className="problem-list">
                {diagnosisList.map((diagnosis) => (
                  <div key={diagnosis} className="problem-list__item">
                    <span>{diagnosis}</span>
                    <span className="problem-list__status problem-list__status--muted">
                      {normalizedNewVisitDiagnoses.has(normalizeCatalogValue(diagnosis)) ? "New" : "Dx"}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {errorMessage ? (
              <SectionCard title="Workflow Error" subtitle="Most recent action" className="section-card--summary">
                <p>{errorMessage}</p>
              </SectionCard>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}