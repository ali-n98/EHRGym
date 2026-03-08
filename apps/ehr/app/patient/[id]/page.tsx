import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityNav } from "../../../components/activity-nav";
import { AppBrand } from "../../../components/app-brand";
import { ChartReviewTabs } from "../../../components/chart-review-tabs";
import { SectionCard } from "../../../components/section-card";
import { WorkspaceSidebar } from "../../../components/workspace-sidebar";
import { formatDateTime, parseJsonValue } from "../../../lib/chart";
import { prisma } from "../../../lib/db";
import {
  createOrderAction,
  createProgressNoteAction,
  signEncounterAction,
  signOrderAction
} from "./actions";

type PatientPageData = {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  sex: string;
  allergiesJson: string;
  bannerFlagsJson: string;
  summary: string;
  encounters: Array<{
    id: string;
    type: string;
    reasonForVisit: string;
    provider: string;
    startedAt: Date;
    status: string;
    labs: Array<{
      id: string;
      name: string;
      loinc: string | null;
      value: string;
      unit: string;
      referenceRange: string;
      abnormal: boolean;
      collectedAt: Date;
    }>;
    notes: Array<{
      id: string;
      type: string;
      title: string;
      author: string;
      content: string;
      signed: boolean;
      createdAt: Date;
    }>;
    orders: Array<{
      id: string;
      name: string;
      category: string;
      parametersJson: string;
      status: string;
      rationale: string;
      createdAt: Date;
    }>;
  }>;
  scenarios: Array<{
    id: string;
    encounterId: string;
    title: string;
    objective: string;
    rubricJson: string;
    requiredOrdersJson: string;
    requiredNoteElementsJson: string;
  }>;
};

type PatientPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientPage({ params }: PatientPageProps) {
  const { id } = await params;

  const patient: PatientPageData | null = await prisma.patient.findUnique({
    where: { id },
    include: {
      encounters: {
        orderBy: { startedAt: "desc" },
        include: {
          labs: {
            orderBy: { collectedAt: "desc" }
          },
          notes: {
            orderBy: { createdAt: "desc" }
          },
          orders: {
            orderBy: { createdAt: "desc" }
          }
        }
      },
      scenarios: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!patient) {
    notFound();
  }

  const activeEncounter = patient.encounters[0];
  const scenario =
    patient.scenarios.find((candidate: PatientPageData["scenarios"][number]) => candidate.encounterId === activeEncounter?.id) ??
    patient.scenarios[0];

  if (!activeEncounter) {
    notFound();
  }

  const allergies = parseJsonValue<string[]>(patient.allergiesJson);
  const flags = parseJsonValue<string[]>(patient.bannerFlagsJson);
  const rubric = scenario ? parseJsonValue<string[]>(scenario.rubricJson) : [];
  const requiredOrders = scenario ? parseJsonValue<string[]>(scenario.requiredOrdersJson) : [];
  const requiredNoteElements = scenario ? parseJsonValue<string[]>(scenario.requiredNoteElementsJson) : [];
  const problemList = Array.from(new Set([activeEncounter.reasonForVisit, ...flags]));
  const visitDiagnoses = Array.from(new Set([scenario?.title ?? activeEncounter.reasonForVisit, activeEncounter.type, patient.summary]));
  const globalNavItems = [
    { label: "Chart Review", href: "#chart-review" },
    { label: "Synopsis", href: "#summary" },
    { label: "Orders", href: "#orders" },
    { label: "Notes", href: "#notes" },
    { label: "Plan", href: "#summary" },
    { label: "Wrap-Up", href: "#encounter" }
  ];
  const activityNavItems = [
    { label: "Summary", href: "#summary", testId: "activity-summary" },
    { label: "Chart Review", href: "#chart-review", testId: "activity-chart-review" },
    { label: "Notes", href: "#notes", testId: "activity-notes" },
    { label: "Orders", href: "#orders", testId: "activity-orders" },
    { label: "Wrap-Up", href: "#encounter", testId: "activity-encounter" }
  ];
  const sidebarNavItems = [
    { label: "Summary", href: "#summary" },
    { label: "Labs & encounters", href: "#chart-review" },
    { label: "Documentation", href: "#notes" },
    { label: "Order Entry", href: "#orders" },
    { label: "Sign / close", href: "#encounter" }
  ];

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
        footerText={`${activeEncounter.reasonForVisit} · ${activeEncounter.provider}`}
        footerAction="Return to Worklist"
        footerHref="/"
      />

      <div className="dashboard-main">
        <header className="workspace-header workspace-header--chart">
          <div className="workspace-header__breadcrumbs">
            <Link href="/" className="workspace-backlink">
              ← All patients
            </Link>
            <ActivityNav items={globalNavItems} className="workspace-pills" ariaLabel="Chart navigation" defaultHref="#chart-review" />
          </div>
          <div className="workspace-header__actions">
            <a href="#encounter" className="workspace-toggle">
              {activeEncounter.status}
            </a>
            <div className="workspace-profile workspace-profile--compact">
              <div className="workspace-profile__avatar">{patient.fullName.slice(0, 1)}</div>
              <div>
                <strong>{activeEncounter.provider}</strong>
                <p>{formatDateTime(activeEncounter.startedAt)}</p>
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
              <span>{allergies.join(", ")}</span>
            </div>
            <div className="patient-hero__panel" data-testid="flags-card">
              <strong>Chart flags</strong>
              <span>{flags.join(" · ")}</span>
            </div>
            <div className="patient-hero__panel" data-testid="encounter-card">
              <strong>Visit focus</strong>
              <span>{scenario?.title ?? activeEncounter.type}</span>
            </div>
            <div className="patient-hero__panel patient-hero__panel--status">
              <strong>Status</strong>
              <span className="status-pill" data-status={activeEncounter.status}>
                {activeEncounter.status}
              </span>
            </div>
          </div>
        </section>

        <ActivityNav items={activityNavItems} className="chart-activity-bar workspace-pills workspace-pills--wide" ariaLabel="Activity navigation" defaultHref="#summary" />

        <section className="metric-grid metric-grid--chart">
          <SectionCard title="Visit Goal" subtitle="Immediate objective" testId="scenario-brief" className="metric-card metric-card--wide">
            <div id="summary" className="metric-card__stack">
              <strong>{scenario?.objective ?? "Continue chart review and complete documentation."}</strong>
              <p>{patient.summary}</p>
            </div>
          </SectionCard>
          <SectionCard title="Pending Orders" subtitle="Expected for this visit" className="metric-card">
            <div className="metric-card__value">{requiredOrders.length}</div>
            <p>{requiredOrders.slice(0, 2).join(" · ") || "No required orders"}</p>
          </SectionCard>
          <SectionCard title="Documentation" subtitle="Expected note elements" className="metric-card">
            <div className="metric-card__value">{requiredNoteElements.length}</div>
            <p>{requiredNoteElements[0] ?? "Note ready for completion"}</p>
          </SectionCard>
        </section>

        <div className="content-grid content-grid--chart">
          <div className="content-stack">
            <SectionCard title="Chart Review" subtitle="Encounter timeline and laboratory review" testId="chart-review-panel" className="section-card--chart">
              <div id="chart-review">
                <ChartReviewTabs encounters={patient.encounters} labs={activeEncounter.labs} notes={activeEncounter.notes} />
              </div>
            </SectionCard>

            <SectionCard title="Notes" subtitle="Progress and clinical documentation" testId="notes-panel" className="section-card--notes">
              <div id="notes" className="grid grid--2">
                <form action={createProgressNoteAction} className="list-row" data-testid="note-form">
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="encounterId" value={activeEncounter.id} />
                  <div className="form-grid">
                    <label className="field">
                      <span className="muted">Author</span>
                      <input aria-label="Note author" name="author" defaultValue="Resident Physician" required />
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
                        defaultValue={`S: \nO: Reviewed interval history and latest results.\nA: ${scenario?.title ?? activeEncounter.reasonForVisit}.\nP: `}
                        required
                      />
                    </label>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" data-testid="save-note-button">
                        File progress note
                      </button>
                    </div>
                  </div>
                </form>

                <div className="note-list">
                  {activeEncounter.notes.map((note: PatientPageData["encounters"][number]["notes"][number]) => (
                    <article key={note.id} className="note-row" data-testid={`note-row-${note.id}`}>
                      <header>
                        <div>
                          <h3>{note.title}</h3>
                          <p className="muted">
                            {note.type} · {note.author} · {formatDateTime(note.createdAt)}
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
            </SectionCard>

            <SectionCard title="Orders" subtitle="Medication, lab, and imaging entry" testId="orders-panel" className="section-card--orders">
              <div id="orders" className="grid grid--2">
                <form action={createOrderAction} className="list-row" data-testid="order-form">
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="encounterId" value={activeEncounter.id} />
                  <div className="form-grid">
                    <label className="field">
                      <span className="muted">Order name</span>
                      <input aria-label="Order name" name="name" placeholder="Normal saline bolus" required />
                    </label>
                    <label className="field">
                      <span className="muted">Category</span>
                      <select aria-label="Order category" name="category" defaultValue="LAB">
                        <option value="LAB">Lab</option>
                        <option value="MED">Medication</option>
                        <option value="IMAGING">Imaging</option>
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
                      <input className="checkbox-field__control" aria-label="Submit order for signature" name="submitForSignature" type="checkbox" />
                      <span>Send directly for signature</span>
                    </label>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" data-testid="save-order-button">
                        Accept order
                      </button>
                    </div>
                  </div>
                </form>

                <div className="order-list">
                  {activeEncounter.orders.map((order: PatientPageData["encounters"][number]["orders"][number]) => {
                    const parameters = parseJsonValue<Record<string, string>>(order.parametersJson);

                    return (
                      <article key={order.id} className="order-row" data-testid={`order-row-${order.id}`}>
                        <header>
                          <div>
                            <h3>{order.name}</h3>
                            <p className="muted">
                              {order.category} · {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <span className="status-pill" data-status={order.status}>
                            {order.status}
                          </span>
                        </header>
                        <p>
                          <strong>Parameters:</strong> {Object.values(parameters).join(", ")}
                        </p>
                        <p>
                          <strong>Rationale:</strong> {order.rationale}
                        </p>
                        {order.status !== "SIGNED" ? (
                          <form action={signOrderAction} className="form-actions">
                            <input type="hidden" name="patientId" value={patient.id} />
                            <input type="hidden" name="orderId" value={order.id} />
                            <button className="secondary-button" type="submit" data-testid={`sign-order-${order.id}`}>
                              Sign order
                            </button>
                          </form>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Wrap-Up" subtitle="Finalize documentation and orders" testId="encounter-panel" className="section-card--wrapup">
              <div id="encounter" className="list-row list-row--split">
                <p>Signing this visit finalizes notes and promotes all remaining draft or pending orders to signed.</p>
                <form action={signEncounterAction}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="encounterId" value={activeEncounter.id} />
                  <div className="form-actions">
                    <button className="primary-button" type="submit" data-testid="sign-encounter-button">
                      Sign visit
                    </button>
                  </div>
                </form>
              </div>
            </SectionCard>
          </div>

          <aside className="content-stack">
            <SectionCard title="Review Status" subtitle="Visit workflow" className="section-card--summary">
              <div className="rail-list">
                {rubric.map((item) => (
                  <div key={item} className="rail-list__item">
                    <strong>{item}</strong>
                    <span>Pending review</span>
                  </div>
                ))}
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
                    <span className="problem-list__status">Active</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Visit Diagnoses" subtitle="Current encounter associations" className="section-card--diagnosis-list">
              <div className="problem-list">
                {visitDiagnoses.map((diagnosis) => (
                  <div key={diagnosis} className="problem-list__item">
                    <span>{diagnosis}</span>
                    <span className="problem-list__status problem-list__status--muted">Visit</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Orders to Review" subtitle="Expected for this visit" className="section-card--summary">
              <div className="summary-flags">
                {requiredOrders.map((item) => (
                  <span key={item} className="summary-flag summary-flag--accent">
                    {item}
                  </span>
                ))}
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}
