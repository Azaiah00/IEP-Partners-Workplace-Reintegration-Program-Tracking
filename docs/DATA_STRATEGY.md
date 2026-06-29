# IEP Partners — Data Strategy & Monetization Brief

*Prepared by DataIsData (Tony Wood & Azaiah Wood) for IEP Partners leadership — Dr. Rhonda Clanton-Davis (Founder) & Michelle Pettaway (CEO).*

> **The one idea that frames everything below:** your defensible, multi-million-dollar asset is **not "data to sell" — it is rigorously measured outcomes.** Outcomes win grants, justify outcomes-based contracts, power a SaaS product other programs will pay for, and — only when aggregated and de-identified — support analytics and research revenue. Selling individual-level data on a vulnerable, justice-involved population is the one path that can destroy the organization. Every recommendation here is built around that distinction.

---

## 1. The data the hub should collect (the catalog)

Capture data in lifecycle stages. For **every** field the system records four things: the value, the **timestamp**, the **source** (self-report, staff assessment, employer, verified record), and a **consent flag** controlling each downstream use (consent fields are in §5).

**A. Intake & consented demographics** — internal non-PII participant ID (never SSN as a key), age, race/ethnicity, gender, language, veteran & disability status (self-disclosed), caregiver status, ZIP; justice context (facility, broad offense category, sentence length, time served, release/anticipated release date, supervision status) treated as the *most* sensitive tier; education history and baseline literacy/numeracy; public-benefits status (for cost-offset modeling).

**B. Whole-person barriers (the "five domains")** — the CSG Justice Center frames reentry success across five domains beyond recidivism: justice-contact progression, employment & financial stability, housing security, health & wellbeing, and social reintegration. Track: housing status & risk, transportation/ID/license, childcare/dependents, substance-use screening (high-sensitivity health tier), mental/behavioral-health flags (high-sensitivity), financial/debt/restitution, and digital-literacy baseline.

**C. Workforce readiness & career interest** — standardized work-readiness score (baseline + repeats), RIASEC/Holland career-interest codes, target occupation & wage goal, skills inventory, work history.

**D. Attendance & engagement (your richest predictive layer)** — session-level attendance, platform login/time-on-task, assignment timeliness, communication responsiveness, case-management touchpoints. High-frequency event data is what makes early-warning prediction possible.

**E. Course, quiz & skill mastery** — enrollment, completion %, quiz scores per attempt, per-competency proficiency (baseline → current) including **trade skills** with a verification flag, **credential attainment** (tracked exactly as WIOA defines it), and **Measurable Skill Gains (MSG)** — WIOA's in-progress skill-gain indicator.

**F. Behavioral & emotional readiness (differentiated, high-value, ethically delicate)** — emotional-intelligence assessment (baseline + repeats), stress-response/resilience measures, self-efficacy, grit, conflict-resolution and soft-skill ratings (self + staff observation). *Gate behind explicit consent; never include at individual grain in any external product.*

**G. Work-based learning & paid work experience** — placements (internship/apprenticeship/OJT), hours, employer, supervisor rating; paid experience (subsidized vs. unsubsidized, wage, evaluations); soft-skill demonstration in real work settings.

**H. Employment placement & wages** — placement event (employer, SOC occupation, NAICS industry, start date), wage and hours, benefits, full/part-time, subsidized vs. unsubsidized, and job-quality attributes (not just "a job").

**I. Retention & advancement (the money metrics)** — employment at WIOA's standard 2nd- and 4th-quarter-after-exit checkpoints; program-specific 30/60/90/180-day retention with wages at each; **retention with the same employer** (now WIOA's "Effectiveness in Serving Employers" indicator); wage progression, promotions, benefits gained.

**J. Reentry / recidivism-relevant outcomes** — rearrest/reconviction/reincarceration where lawfully obtainable, but measured as **"recidivism progression"** (reduction/slowing of justice contact), plus housing stability, treatment continuity, and social reintegration over time. *Design claims around what the data can defend: employment programs reliably move employment more than recidivism.*

---

## 2. Out-of-the-box, high-value derived metrics

These are computed from §1 and are where the real value concentrates — they are predictive, comparative, or directly monetizable.

| Metric | How it's computed | Why it's unusually valuable |
|---|---|---|
| **Time-to-employment** | Days from entry → first unsubsidized placement | Cleanest efficiency KPI; the headline number for funders and outcomes contracts |
| **Skill-acquisition velocity** | Competencies mastered per unit time | Flags fast/slow learners early; proves which curricula teach efficiently (a SaaS differentiator) |
| **Engagement / dropout prediction** | Risk model over attendance, login cadence, response time, missed touchpoints | Flags at-risk participants 60–90 days early so staff can intervene — directly improves the outcomes you get paid for |
| **Soft-skill growth curves** | Repeated EI/resilience/soft-skill scores over time | Almost no program can quantify "soft" gains; doing so is rare, credible, and grant-winning |
| **Employer-match fit signal** | Similarity of participant skill/interest vector to role requirements & past successful-retention profiles | Powers a talent-marketplace product; improves placement & retention |
| **Cohort benchmarking** | Outcome distributions by site/cohort/demographic vs. baselines | Core of a de-identified benchmarking product and internal quality improvement |
| **Program-component effectiveness** | Outcome lift attributable to each module | Lets you cut low-value content and *prove* what works — the heart of evidence for contracts and SaaS marketing |
| **ROI per participant** | (Lifetime earnings gain + public-cost offsets) ÷ program cost | The number legislators and funders understand instantly |
| **Social Return on Investment (SROI)** | Monetized social value ÷ investment (NPV-discounted) | Workforce programs commonly show 4:1–10:1; a credible ratio is a powerful fundraising/policy asset (note candidly: SROI shows value, not causation) |
| **Predicted success score** | Composite intake-stage model of placement/retention probability | Enables triage and risk-pricing for outcomes contracts — but must be governed to avoid "creaming" and discrimination |

---

## 3. The monetization menu (ranked: safest & largest first)

**3.1 SaaS licensing of the platform — likely the biggest and safest revenue.** License this purpose-built reentry + workforce case-management/curriculum/outcomes platform to other nonprofits, workforce boards, community colleges, and facility programs. Real competitive category (Bonterra Apricot, ETO, Salesforce Nonprofit, LiveImpact). A vertical product with WIOA/Second Chance Act reporting built in commands premium pricing — realistically **$5k–$50k+/org/year**. You sell *software and reporting, not participant data.* Your domain credibility is the moat.

**3.2 Outcome & impact reporting to win and renew funding — highest near-term ROI on the data itself.** Use rigorous, WIOA-aligned outcome data to win and renew grants (Second Chance Act, DOL reentry/PROWD, state workforce boards). The data already exists, so this is the cheapest "monetization," and it can be the difference between losing and winning six- and seven-figure grants.

**3.3 Pay-for-Success / Social Impact Bonds / outcomes-based contracts.** Government pays on verified outcomes; investors front the capital and are repaid on success. BJA funds Pay-for-Success for reentry specifically. Large multi-year deals, but requires very strong, independently verifiable data and governance — pursue *after* §3.1–3.2 prove your measurement.

**3.4 De-identified aggregated analytics & benchmarking.** Sell aggregated, de-identified cohort benchmarks and program-effectiveness insights (never individual records). Best bundled as a SaaS feature, not a standalone data-broker business.

**3.5 Research data partnerships (universities, think tanks).** Provide de-identified datasets under IRB oversight and data-use agreements; co-author evaluations. Modest cash, high strategic value — independent evaluation is exactly what funders and Pay-for-Success deals require.

**3.6 Employer-matching marketplace / talent pipeline.** Match job-ready participants to employers; charge employers for screened-pipeline access (plus WOTC tax-credit value). Recurring revenue that scales *with* mission success. Guardrail: participants opt in and control their profile; matching must never enable discrimination.

**3.7 Government/agency dashboards & reporting subscriptions.** Subscription dashboards for workforce boards, corrections agencies, and counties. Steady public-sector revenue; slow procurement; CJIS/state rules apply.

**3.8 Anonymized labor-market insight products.** Aggregate trends (which skills/credentials lead to placement/retention by region/industry). Only credible at scale — revisit once data volume is large.

---

## 4. Legal & ethical guardrails — the line between safe and harmful

**Applicable frameworks:** FERPA (if you create education records — PII generally can't be disclosed without written consent; use the DOL/ED Joint Guidance pathway for lawful wage-record matching); HIPAA-grade handling for any health/substance-use/mental-health data (SUD records may carry extra 42 CFR Part 2 protection); CJIS and state corrections rules for any criminal-history/recidivism data (obtain only via proper agreements; never commercialize); and biometric laws (BIPA in IL, CUBI in TX, WA) **— recommendation: avoid biometrics entirely, or if used, get explicit written consent and never sell/share them.**

**De-identification standard:** use HIPAA's two methods as your benchmark — **Safe Harbor** (strip all 18 identifiers; year-only dates; 3-digit ZIP only where population >20,000; age 90+ bucketed) or **Expert Determination** (a statistician certifies re-identification risk is "very small"). For a small, geographically clustered, justice-involved population, **apply minimum cell-size suppression (suppress any aggregate cell < 11)** and prefer Expert Determination for external releases.

**Safe (do this):** aggregated · de-identified · explicitly + granularly consented for the specific use · value returned to participants · research under IRB/DUA · sell software and reporting, not people's records · fully transparent to participants.

**Harmful (never do this):** sell or share **individual/record-level** participant data to brokers, marketers, background screeners, insurers, or lenders · commercialize **criminal-history, health, substance-use, mental-health, or biometric** data in any form · use a predicted-success score to deny services (creaming) or in any discriminatory way · bundle "consent to data sale" into enrollment (coerced consent on a captive population) · release small-cell aggregates that enable re-identification.

The mere *appearance* of "selling participant data" can be fatal to a mission-driven reentry org's funding and community trust. Build the trust moat deliberately.

---

## 5. Recommendations & what we're architecting now

**Build first (foundation):** an outcomes-grade schema with WIOA primary indicators native (MSG, credential attainment, Q2/Q4 employment, retention-with-same-employer, plus 30/60/90/180-day retention and wage progression); the consent & de-identification architecture below (designed in now, not bolted on); lawful wage/retention matching; and whole-person barrier tracking across the five domains with sensitive tiers walled off from any external use.

**Consent & de-identification fields the schema captures** (added at the participant level): consent version/date/method; and separate, explicit, revocable, time-stamped flags for **program participation, outcome follow-up, wage-record match, de-identified research, aggregate reporting, employer matching**, and the sensitive tiers **health, justice, biometric**; plus `data_retention_until` and `deletion_requested_at`. At the record level: `data_source`, `sensitivity_tier`, and aggregation rules (`min_cell_size`, geo-generalization).

**The three monetization paths most worth pursuing:** (1) **SaaS licensing** of the platform; (2) **outcome/impact reporting** to win funder and outcomes-based dollars (leading into Pay-for-Success); (3) **employer-matching marketplace**. Treat de-identified analytics, research partnerships, and labor-market insights as *strategic by-products* that strengthen those three — only ever aggregated, de-identified, IRB/DUA-governed, and consented. Explicitly rule out individual-level data sale and any commercialization of justice, health, or biometric data.

**Bottom line:** architect for *outcomes measurement* and *granular, revocable consent* from day one. The saleable assets are the software, the provable outcomes, and (strictly aggregated/de-identified) the insights. The fastest, safest money is SaaS licensing plus grant/outcomes wins driven by WIOA-grade reporting; employer matching is the natural third leg.

*(Full source citations for every claim above are in the research appendix that accompanies this brief.)*
