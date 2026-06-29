---
type: plan
status: review
created: 2026-06-28
owner: BjorVik
tags: [agency-os, plan, langdock, paperclip, architecture, roadmap]
---

# Agency OS — Masterplan (Plan-Modus, zur Freigabe)

> **Status:** Reiner Plan. Kein Produktionscode, keine App-Struktur. Ergebnis dieser Session
> ist dieses Dokument. Bauen erst nach deiner Freigabe.
>
> **Zweck:** Best-of-Kombination aus **Langdock** (Plattform-, Governance-, RAG-, API-Tiefe)
> und **Paperclip** (Firmen-/Org-Struktur, Personalwirtschaft, Agenten-Orchestrierung) zu einer
> selbst-hostbaren Web-App, die eine komplette KI-Agentur führt. **USP:** eigene/externe Agenten
> (deine Aigency-Engine, Claude-Agents, MCP, HTTP, lokale CLIs) sind *erste Klasse*, nicht Add-on.

---

## 0. Management-Summary — die 4 wichtigsten Erkenntnisse vorab

1. **Paperclip macht bereits ~70 % des Charters** (Org-Chart, Akte-Bausteine, Skills, Budgets, Routines/Heartbeats, Approvals, Audit, Secrets, Multi-Company, Export/Import) — und ist **MIT-lizenziert, self-hostbar, plugin-erweiterbar**. Es ist die natürliche Basis für die Säulen 1, 2, 4, 6, 7, 8.
2. **🔴 Entscheidender Befund für den Tech-Stack:** Das öffentliche Paperclip-Repo enthält **nur `cli/` + `doc/`** — `server/`, `ui/` und `packages/db/` (das echte Drizzle-Schema) sind **NICHT öffentlich**. Ein klassischer „Fork als Fundament" für Server/UI ist damit **nicht möglich**. Erweiterbar ist Paperclip ausschließlich über sein **Plugin-System** und **Adapter** — nicht durch Patchen des Kerns. Das verschiebt die Tech-Entscheidung deutlich Richtung **eigener Control-Plane (Greenfield), die Paperclips dokumentierte Konzepte + Adapter-Protokoll übernimmt**.
3. **🟢 Möglicher Unblock deines aktuellen Blockers:** Deine Engine-ROADMAP (Stand 22.06.) führt „Engine andocken" als **upstream-blockiert** (HTTP-/Process-Adapter „coming soon", Issue #3989). Die Quellcode-Recherche (Juni 2026) zeigt jedoch `http`- und `process`-Adapter **registriert und ausgeliefert** (`cli/src/adapters/registry.ts`, `cli/src/adapters/http/index.ts`). **→ Hands-on verifizieren** (siehe Offene Frage Q1); falls bestätigt, ist die Engine-Anbindung sofort machbar.
4. **Langdock liefert die Governance-/RAG-/API-Tiefe, die Paperclip fehlt** (granulares RBAC, SSO/SAML/SCIM, Knowledge-Folders/Vektor-RAG, MCP-Client *und* -Server, A2A, Branding/White-Label, Prompt-Library, Audit-Log-API). Diese Schicht bauen wir selbst nach Langdock-Vorbild — Langdock ist **closed-source SaaS**, also nur Konzept-, nicht Code-Quelle.

**Architektur-Entscheidung (festgelegt 28.06.2026):** **Option C — Neubau („Greenfield") Control-Plane** (eigene Web-App) auf demselben Stack-Idiom wie Paperclip (Node/TS + Postgres + React), die (a) Paperclips bewährtes **Daten- und Adapter-Modell** übernimmt, (b) Langdock-Governance/RAG nativ ergänzt und (c) Paperclip *optional* als eine von vielen anbindbaren Engines behandelt. „Greenfield" = schlicht „Neubau auf der grünen Wiese"; das *Compat*-Element (C statt B) sichert Import/Export- und Adapter-Kompatibilität zu Paperclip. Optionen samt Begründung in Phase 6.

> **Festgelegte Entscheidungen dieser Session (BjorVik, 28.06.2026):**
> **D1** Fundament = **Option C** (Neubau, Paperclip-kompatibel). · **D2** MVP-Umfang = **inkl. volle Governance (bis M6)**. · **D3** **Zuerst** Paperclips `http`/`process`-Adapter hands-on gegen `aigency-engine /wake` verifizieren (klärt den alten Blocker #3989), DANN bauen. · **D4** DB = **self-hosted PostgreSQL + pgvector auf eigenem VPS** (Docker), **kein Supabase** — 0 € extra, volle DSGVO-/Datenhoheit, charter-treu (keine Vendor-Bindung); Backups per `pg_dump`-Cron. · **D5** **Frontend-Visual via Higgsfield**: die Optik („Firmenstruktur der Zukunft", High-End) wird mit Higgsfield-generierten UI-Konzepten als **Visual Language** festgelegt und anschließend in **React** umgesetzt (Higgsfield liefert Bild-Assets/Key-Art, nicht den Code). **Gewählte Richtung: A — Dark Command Center** (charcoal, Glassmorphism, elektrisch-blau/violett, cinematic). · **D6** Backend = **NestJS** (mit **Fastify-Adapter** unter der Haube) — Begründung „beste Langzeit-Qualität": Modul-Struktur + DI + **Guards/Interceptors/Pipes** bilden RBAC, Audit und Skill-`input_schema`-Validierung als saubere Querschnitts-Schichten ab. · **D7** Auth = **OIDC-Fundament ab Tag 1**; MVP mit lokalem/eingebautem Provider, Enterprise-SSO/SAML/SCIM (Entra/Google/Okta) später **einsteckbar statt nachgerüstet** (kein Rip-and-Replace). · **D8** **Agenten-Motive = kuratierte Motiv-Bibliothek**: Line-Art-Emblem je Rolle, beim Onboarding auswählbar, **Foto-Override** möglich. Finale Produktion des kohärenten Sets in **Google Stitch** (ein Schema, Vektor); Prototyp nutzt Platzhalter (Tabler), Austausch 1:1 über das `icon`-Feld. Brief: `agency-os/design/icon_set_brief.md`. · **D9** **Lizenz (Q8) = Open Source, empfohlen**: Kern unter permissiver Lizenz (**Apache-2.0**), optional **Open-Core** für spätere Enterprise-Add-ons (SSO/SCIM, erweiterte Governance). USP-Positionierung: **echtes, schlüsselloses Self-Hosting ohne Phone-Home** — bewusste Abgrenzung zu LangGraphs Elastic-2.0-Server (Lizenzschlüssel + Beacon-Egress). Begründung/Analyse in Anhang C. Q6 (Repo) & Q7 (input_schema optional) per „passt" bestätigt.

---

# PHASE 1 — Tiefenrecherche (verifiziert, mit Quellen)

Jede Funktionsaussage ist quellengestützt. Quellen-URLs gesammelt am Ende (§Quellen). Inline stehen Kurzbelege.

## 1.1 Langdock (closed-source SaaS, EU-gehostet)

**Chat.** Modell-agnostischer Multi-Provider-Selector (OpenAI, Anthropic, Google, Mistral, Meta u. a.); „Auto"-Routing nach Komplexität; Modellwechsel mitten im Chat; Reasoning-Toggle; Web-Suche mit Quellen-Inspektion + `open_url`; Vision, Bildgenerierung, Data-Analyst (Python), Canvas, Memory, Deep Research, Mermaid; Datei-Upload (pdf, docx, csv, xlsx, ppt, md, txt); Projects, Prompt-Library mit Variablen, Cmd+K. *(docs.langdock.com — chat/functionalities, models, web-search; langdock.com/pricing)*

**Agents/Assistants.** „Agents are specialized chatbots you can configure for specific use cases" — Instructions bis 40.000 Zeichen, Input als Prompt oder **Form**, Temperatur-Slider, Conversation-Starters. Agent-Tools: Built-ins (Web Search, Image Gen, Data Analysis, Canvas), **Integration-Actions** (z. B. Slack posten, CRM updaten), Folders, und **Subagents/Delegation** („Attach other agents… build complex multi-agent workflows"). Versionierung mit Draft→Publish. Kanäle: Plattform, **Slack**, **Teams**, **externe Agenten via API**. Admin: Monats-Limits, disable/archive, „verify trusted agents". *(docs — agents/introduction, configuration, subagents)*

**Knowledge-Folders / RAG.** Embedding/Vektor-Suche über bis zu **1.000 Dateien** (~8 Mio. Zeichen); „@mention a Knowledge Folder… embedding search to find the most relevant sections"; Upload per UI oder **Async-API**; **Folder-Sync aus SharePoint/Google Drive**; externe Vektor-DBs (Pinecone, Qdrant, Milvus, Azure AI Search, Vertex) als Agent-Action. XLSX/CSV nicht in Folders. *(docs — knowledge-folders, folder-sync, vector-databases)*

**Integrationen.** ~**55 native** Konnektoren (OAuth/API-Key): Google Workspace, Microsoft 365, Salesforce, HubSpot, Jira/Confluence, Linear, Asana, Notion, Slack, Stripe, Personio, GitHub, Snowflake, BigQuery u. v. m. **Company Knowledge** = paralleler Suchindex über verbundene Apps mit **Permission-Mirroring**. **Custom-Integration-Builder** (visuell + JavaScript). „Bring Your Own OAuth Client". *(docs — integration-directory, company-knowledge)*

**MCP — ja, Client UND Server.** Als **Client**: STREAMABLE_HTTP + SSE, Auth None/API-Key/OAuth2-DCR; kuratiertes **MCP-Server-Directory (59 offizielle Server)**. Als **Server**: eigener Endpoint `https://api.langdock.com/mcp` (Tools `find_agent`, `ask_agent`, `ask_custom_agent`) → externe Clients (Claude Desktop, Cursor) rufen deine Langdock-Agenten. Zusätzlich **A2A-Protokoll** (Agent-to-Agent, AgentCards unter `/.well-known/agent-card.json`). *(docs — mcp, mcp-directory, langdock-agent-mcp-server, a2a-protocol)*

**Workflows.** End-to-end-Automatisierung; Node-Typen: Trigger (Manual/Form/Scheduled/Webhook/Integration), Agent, Action, Code (JS/Python), Condition, Loop, Delay, File Search, Guardrails, HTTP Request, Image Gen, Notification, Output; **Human-in-the-Loop-Pause**; konversationeller Builder; Admin-Aktivierung + Spend-Limits; Code/HTTP-Nodes per Security-Control abschaltbar. *(docs — workflows/introduction, human-in-the-loop)*

**API.** Basis `api.langdock.com`, Bearer-Auth, **Browser-Origin blockiert** (backend-only), 500 RPM / 60k TPM. **Completion-API** (OpenAI-/Anthropic-/Google-/Mistral-kompatibel), **Embedding-API**, **Agent-API** (`POST /agent/v1/chat/completions`, Vercel-AI-SDK-Format, Streaming, structured output, `maxSteps` 1–20), **Knowledge-Folder-API** (`POST /knowledge/search`, semantisch + LLM-Reranking), **Integrations-API**, **Usage-Export-API**, **User-Management-API**, **Audit-Logs-API** (`GET /audit-logs/{workspace_id}`, 90 Tage, SIEM-fähig). *(docs — developer/overview, agents-api, knowledge-folder-api, audit-logs-api)*

**Governance.** RBAC-Rollen **Admin/Editor/Member** mit anpassbarer Permission-Matrix; **SAML 2.0 SSO** (Entra, Google, Okta), **SCIM 2.0** (aktuell Entra); **MFA nur über IdP** (kein Standalone-MFA); **Branding/White-Label** (Icon, Farbe, Favicon, Modell-Logos ersetzen, Disclaimer); **Prompt-Library** + **Skills** (Workspace-Defaults, erzwingbare Regeln); Usage-Analytics; IP-Restriktionen (CIDR), Session-Management, statische Outbound-IP, **BYOK**. *(docs — permissions, saml, scim, workspace-setup)*

**Security/Compliance.** „The entire application and all models are hosted in the EU"; **SOC 2 Type II** + **ISO 27001**; „data is never used for training"; AES-256 + TLS≥1.2; konfigurierbare Retention; GDPR-DPA Teil der ToS; **Dedicated Deployment** (eigene Cloud/Datacenter, Enterprise, min. 5.000 User); Pen-Tests, Vuln-Scanning. *(langdock.com/security, /pricing, legal-compliance)*

**Pricing-Logik.** 3 Produkte, 3 Modelle: **Chat & Agents pro Seat**, **Workflows pro monatliche Runs**, **API usage-based pro Token**. Business (bis 1.000 User, inkl. SSO/SCIM) vs Enterprise (Dedicated). „AI Models Included" vs **BYOK**. Mengenrabatte, 20 % bei Jahreszahlung, 7-Tage-Trial. *(docs — billing/pricing)*

## 1.2 Paperclip (open source, MIT, self-hostbar)

> **Quellen-Caveat:** Öffentlich sind nur `cli/` + `doc/`. Server/UI/DB-Schema **nicht öffentlich**. Feld-genaue Datenmodell-Aussagen stammen aus den Spezifikationsdokumenten (`SPEC.md`, `TASKS.md`, `DATABASE.md`) und aus den vom CLI referenzierten Tabellen — also **dokumentierte Absicht**, nicht verifizierte Migrationen.

**Org-Struktur.** `Company` = oberstes, company-scoped Tenant-Objekt; „One Paperclip instance runs multiple Companies". Agenten haben „roles, titles, reporting lines, permissions, and budgets"; hierarchische Reporting-Struktur (CEO oben). **Departments = Teams** (`key`, z. B. „ENG"); Cross-Team-Delegation, Eskalation, Request-Depth, Billing-Codes für Kostenzuordnung. Org ist **Full-Visibility** (Hierarchie = Delegation/Reporting, nicht Access-Control). *(README; doc/SPEC.md §1–3; doc/TASKS.md)*

**Agenten-„Einstellung" & Bring-your-own (USP-relevant!).** Jeder Agent hat **`adapter_type` + adapter-spezifischen Config-Blob**. Hiring ist ein **Board-Approval-Gate**. **Ausgelieferte Adapter** (aus `cli/src/adapters/registry.ts`): `claude_local`, `codex_local`, `opencode_local`, `cursor`, `cursor_cloud`, `gemini_local`, `grok_local`, `pi_local`, `acpx_local`, `hermes_local`, `hermes_gateway`, `openclaw_gateway`, **`process`**, **`http`**. **HTTP** = Webhook/API an extern laufenden Agenten; **Process** = Kind-Prozess/CLI. **Neue Adapter-Typen** sind via **Plugin-System registrierbar** (Adapter-Contract: Package mit Exports `.`/`./server`/`./ui`/`./cli`; `execute()`, `testEnvironment()`). ⚠️ Vollständig dynamische Dritt-Adapter-Strings (`feat/external-adapter-phase1`) waren zum gelesenen Commit „not finished yet" — Built-ins http/process **sind** ausgeliefert. *(cli/src/adapters/*, doc/SPEC.md §2,§4,§8; .agents/skills/create-agent-adapter/SKILL.md)*

**Tickets/Issues.** Linear-artiges Modell: `Workspace > Initiatives > Projects > Milestones > Issues > Sub-issues`. Issue-Felder: `identifier` (ENG-123), `status` (team-spezifische WorkflowStates, Kategorien triage/backlog/unstarted/started/completed/cancelled), `priority` 0–4, `estimate`, `assigneeId` (**einzelner Assignee**), `parentId`, Relations (`blocks`/`blocked_by`/`related`/`duplicate`), Labels, threaded Comments (Autor User *oder* Agent). **Atomic single-assignment checkout** verhindert Doppelarbeit. **Tasks sind der einzige Inter-Agent-Kommunikationskanal** („no separate messaging system"). *(doc/TASKS.md; doc/SPEC.md §5,§8)*

**Skills.** Zwei Stufen: app-mitgelieferter **Catalog** (`bundled`/`optional`, `recommendedForRoles`, `trustLevel`, `contentHash`, per-File `sha256`) + pro-Company installierte Skills. Lifecycle-CLI: `browse/search/inspect/install/list/show/import/create/scan-projects/check/update/audit/reset/remove`. **Versionierung/Integrität:** `installedHash` vs `originHash`, `currentRef`/`latestRef`, `hasUpdate`. **Policy/Scope (auto vs approval/holds):** `update --force` „Discard… holds; **hard-stop audit findings still fail**"; `audit` liefert `verdict` mit Severity-Findings. Pro-Agent „desired skills" → `AgentSkillSnapshot` in die Runtime synchronisiert. *(cli/src/commands/client/skills.ts; doc/plans/2026-05-26-skills-cli-catalog-contract.md)* — **Hinweis:** kein `input_schema` in den öffentlichen Quellen gefunden (Skills sind SKILL.md-Markdown-Pakete; siehe Lücken).

**Budgets/Cost-Caps.** Heute: `budgetMonthlyCents` + `spentMonthlyCents` auf Company- und Agent-Ebene; `cost_events` inkrementieren Zähler; **Auto-Pause bei 100 %**, Soft-Warnung bei **80 %**, Board kann übersteuern. Geplant: `budget_policies` (scope company/agent/project, window calendar_month/lifetime, `warn_percent`, `hard_stop_enabled`) + `budget_incidents` + Approval-Typ `budget_override_required`. Kosten pro Agent/Task/Project/Goal/Company/Provider/Model. *(README „Budget & Cost Control"; doc/plans/2026-03-14-budget-policies-and-enforcement.md)*

**Routines/Schedules/Heartbeats.** **Routines** = wiederkehrende Tasks (cron/webhook/API-Trigger, Concurrency- + Catch-up-Policies; jede Ausführung erzeugt ein getracktes Issue + weckt den Agenten). Tabelle `routines` (`status` active/paused/archived), **versioniert** über `routine_revisions`/`routine_runs`, secret-aware `routines.env`. **Heartbeats** = „DB-backed wakeup queue with coalescing, budget checks, workspace resolution, secret injection, skill loading, and adapter invocation". Paperclip steuert *wann/wie/welcher Kontext*; Adapter steuert *was der Agent tut*. *(README; cli/src/commands/routines.ts, heartbeat-run.ts; doc/SPEC.md §4)*

**Approvals/Governance.** **Board** = einzelner Mensch (V1). Approval-Gates: neue Hires, CEOs Initial-Strategie, Budget-Override. Board-Powers (immer an): Budgets setzen, Agenten/Work-Items pausieren/fortsetzen, voller PM-Zugriff, jede Entscheidung übersteuern. Execution-Policies mit Review/Approval-Stages. Pause-Semantik: Signal → Grace → Force-Kill → keine weiteren Heartbeats. **HITL:** Menschen können Tasks zugewiesen bekommen. *(doc/SPEC.md §1,§4; cli/src/commands/client/approval.ts)*

**Audit-Log.** „Append-only history. No edits, no deletions." Erfasst: mutierende Aktionen, Heartbeat-State-Changes, Cost-Events, Approvals, Comments, Work-Products; **volles Tool-Call-Tracing**; UI-Run-Viewer mit typisierten `TranscriptEntry` (init/assistant/thinking/tool_call/tool_result/result mit usage+costUsd). *(README; .agents/skills/create-agent-adapter/SKILL.md §9)*

**Plugins/Extensions.** Ausgeliefertes **instance-weites Plugin-System** (Out-of-Process-Worker, SDK `@paperclipai/plugin-sdk`, `paperclipai plugin init/install`). **Capability-gated** Host-APIs (config, events, jobs, http, secrets, activity, state, **database-namespace**, apiRoutes, entities, issues, agents, routines, skills, goals, tools, metrics, logger). Plugins registrieren **managed agents/projects/routines/skills**, liefern UI in ~16 Mount-Slots, exposen Routen unter `/api/plugins/:id/api/*`. **DB-Isolation** pro Plugin-Namespace. UI-Plugins laufen als **trusted same-origin JS** (nicht sandboxed → Alpha-Warnung). *(doc/plugins/PLUGIN_AUTHORING_GUIDE.md; cli/src/commands/client/plugin.ts)*

**Secrets/Storage.** Tabellen `company_secrets`, `*_versions`, `*_bindings`, `secret_access_events` (versioniert + Zugriffs-Audit). Default **`local_encrypted`** (AES at rest, lokaler Master-Key `~/.paperclip/.../master.key`, `0600`); Hosted-**AWS-Provider** optional. **Sidecar-Injection:** Secrets als ENV in den Agent-Prozess, **nie in Prompts**; `redactEnvForLogs()` maskiert key/token/secret/password. Strict-Mode blockt inline-Secrets. *(doc/DATABASE.md „Secret storage"; cli/src/commands/client/secrets.ts)*

**Multi-Company-Isolation.** „Every entity is company-scoped… one deployment can run many companies with separate data and audit trails." App-Level-Scoping (`company_id` überall), **nicht** separate DBs. **Single-Tenant pro Operator** (self-hostbar, „Not a SaaS"). *(README; doc/SPEC.md §8)*

**Export/Import.** Ganze Organisationen exportieren/importieren (Agents, Skills, Projects, Routines, Issues) **mit Secret-Scrubbing + Collision-Handling**; zwei Modi **template** (nur Struktur) / **snapshot** (Vollzustand); Import via URL/ZIP. Per E2E-Tests bestätigt. *(README „Company Portability"; doc/plans/2026-03-13-company-import-export-v2.md)*

**Tech-Stack & Repo-Fakten.** Node 20+, TS, **pnpm 9.15+**; Backend **Express** (`localhost:3100`), Frontend **React+Vite**, DB **PostgreSQL via Drizzle** (embedded-postgres default, Docker-PG17 oder Supabase), Auth **Better Auth** (`local_trusted` vs `authenticated`). Install `npx paperclipai onboard`. **MIT** © Paperclip Labs. Letztes Release **v2026.525.0 (25.05.2026)**, aktive Kadenz. **Öffentliches Repo = nur `cli/` + `doc/`.** *(README, cli/package.json, doc/SPEC.md §8, doc/DATABASE.md)*

---

# PHASE 2 — Feature-Matrix & Vergleich

Spalten: **Funktion | Langdock | Paperclip | Bewertung für Agency OS | Übernehmen?**
Legende Übernehmen: ✅ ja · ➕ angepasst/erweitert · ❌ nein/irrelevant.

| Funktion | Langdock | Paperclip | Bewertung für unser Ziel | Übernehmen? |
|---|---|---|---|---|
| **Firmen-/Org-Chart, Abteilungen, Reporting** | ❌ (kein Org-Konzept) | ✅ Company/Teams/Reporting-Lines | Kern-Säule 1. Paperclip ist Vorbild. | ✅ (von Paperclip) |
| **Personalakte je Agent** | teilw. (Agent-Config) | ✅ Felder verstreut (role/title/budget/adapter) | **Charter-Herzstück** — als *eine* Akte-UI konsolidieren. | ➕ (neu konsolidiert) |
| **Skill-System m. Version/Policy** | ➕ Skills (SKILL.md, erzwingbar) | ✅ Catalog+Install, Hash-Versioning, audit/holds | Säule 4. Paperclips Modell + `input_schema` ergänzen. | ➕ |
| **Skill input_schema (typisierte Inputs)** | ❌ | ❌ (nicht gefunden) | **Lücke beider** — wir ergänzen JSON-Schema-Inputs. | ➕ (über beide hinaus) |
| **Granulares RBAC** | ✅ Admin/Editor/Member + Matrix | teilw. (Board + Org-Visibility) | Säule 3. Langdock-Vorbild, feiner. | ✅ (von Langdock) |
| **Pro-Agent/Skill/Zugang Toggles** | teilw. (Tool-Gates) | teilw. (Skill-Sync, Secret-Bindings) | **Charter-USP** „alles per Toggle". Beide unvollständig. | ➕ (neu, first-class) |
| **SSO/SAML, SCIM** | ✅ SAML, SCIM(Entra) | ❌ (Better Auth lokal) | Enterprise/Self-host-Pflicht später. | ➕ (Langdock-Vorbild) |
| **Knowledge-Folders / Vektor-RAG** | ✅ bis 1.000 Files, Reranking, Sync | ❌ (kein RAG-Kern) | Säule „Eigenschaften: Wissensordner". | ✅ (von Langdock) |
| **Integrationen (native Konnektoren)** | ✅ ~55 + Custom-Builder | teilw. (über Adapter/Secrets/Plugins) | Säule 5. Langdock-Breite als Ziel. | ➕ |
| **MCP-Client (externe Tools)** | ✅ HTTP/SSE, 59-Server-Dir | teilw. (kein 1st-class MCP-Adapter gefunden) | Säule 5 + USP. Pflicht. | ✅ (von Langdock) |
| **MCP-Server (Agency-OS exposed)** | ✅ `/mcp` + A2A | ❌ | „BYO-Agent" auch andersrum nutzbar. | ➕ |
| **Bring-your-own / externe Agenten** | teilw. (Agent via API, A2A) | ✅ http/process/CLI-Adapter + Plugin-Adapter | **DER USP.** Paperclips Adapter-Modell ist Gold. | ✅ (Kern) |
| **Tickets/Issues/Tasks** | ➕ (Workflows, kein Issue-Tracker) | ✅ Linear-artig, Relations, Labels | Säule 6. Paperclip-Vorbild. | ✅ (von Paperclip) |
| **Routines/Schedules** | ✅ Scheduled-Workflows | ✅ cron/webhook/API + Catch-up | Säule 6. Beide gut; Paperclip integrierter. | ✅ |
| **Heartbeats/Wakeup-Loop** | ❌ | ✅ DB-Wakeup-Queue, Secret-Injection | Säule 6 Motor. Einzigartig Paperclip. | ✅ (von Paperclip) |
| **Workflows (Node-Graph)** | ✅ reicher Builder, HITL | teilw. (Routines + Tasks) | Säule 6 Komfort. Langdock-Vorbild, später. | ➕ (später) |
| **Budgets/Cost-Caps** | ✅ Spend-Limits/Seat-Usage | ✅ monthly cents, Auto-Pause, policies | Säule 7. Paperclip granularer (pro Agent). | ✅ (von Paperclip) |
| **Approvals/HITL** | ✅ Workflow-Pause | ✅ Board-Gates, Execution-Policies | Säule 7. Beide; Paperclip org-nah. | ✅ |
| **Audit-Log (append-only)** | ✅ Audit-API, 90 Tage, SIEM | ✅ append-only, Tool-Call-Tracing | Säule 7 Pflicht. Beide stark. | ✅ |
| **Secrets-Management** | ✅ BYO-OAuth, BYOK | ✅ versioniert, AES, sidecar, nie in Prompts | Säule 7/DSGVO. Paperclip-Muster vorbildlich. | ✅ (von Paperclip) |
| **Multi-Company-Isolation** | ➕ (Workspace) | ✅ company-scoped, viele pro Deployment | Säule 7. Paperclip-Vorbild. | ✅ |
| **Company Export/Import** | ❌ | ✅ template/snapshot, Secret-Scrub | Säule 8 Portabilität. Einzigartig. | ✅ (von Paperclip) |
| **Plugin-/Extension-System** | teilw. (Custom-Integrations) | ✅ Out-of-Proc, Capability-gated, DB-NS | Erweiterbarkeit + Adapter-Reg. | ➕ |
| **Branding/White-Label** | ✅ Icon/Farbe/Logo/Disclaimer | ❌ | Säule (Außenwirkung), später. | ➕ (später) |
| **Prompt-Library** | ✅ Variablen, teilbar | teilw. (Skills) | Komfort, mittel. | ➕ |
| **Chat-UI (Multi-Modell)** | ✅ voll ausgestattet | ❌ (Tasks statt Chat) | Optional fürs Personal-„Gespräch". | ➕ (optional) |
| **EU-Hosting/SOC2/ISO** | ✅ zertifiziert (SaaS) | n/a (du hostest selbst) | Self-host = du kontrollierst Residenz. | ➕ (eigene Pflicht) |
| **Modell-agnostisch / BYOK** | ✅ | ✅ (provider-agnostisch) | Charter-Pflicht. | ✅ |

**Überschneidungen** (beide können, wir wählen das bessere): Skills, Routines, Approvals, Audit, Budgets, Multi-Tenancy, Modell-Agnostik.
**Lücken bei beiden** (= unsere Über-die-Vorbilder-hinaus-Chancen): konsolidierte **Personalakte-UI**, **universelle Toggle-Engine** (Zugang/Skill/Tool an/aus mit Laufzeit-Wirkung), **typisierte Skill-`input_schema`**, **externe Agenten mit voller Akte/Rechte/Budget/Audit gleichgestellt**.
**Konflikte:** (a) Auth — Langdock SAML/SCIM vs Paperclip Better-Auth-lokal → wir nehmen pluggable Auth (lokal für MVP, OIDC/SAML später). (b) Kommunikation — Paperclip „nur Tasks" vs Langdock Chat → wir erlauben beides (Tasks als Kanal, optional Chat-Ansicht). (c) Org-Visibility — Paperclip Full-Visibility vs Langdock RBAC → wir trennen **Org-Hierarchie** (Reporting) von **Access-Control** (RBAC), nicht vermischen.

---

# PHASE 3 — Synthese zur Super-App (Best-of-Merge)

**Best-of-Prinzip:** Paperclip liefert das **Betriebssystem der Firma** (Org, HR, Orchestrierung, Audit, Portabilität); Langdock liefert die **Plattform-/Governance-/Wissens-Schicht** (RBAC, SSO, RAG, MCP, API, Branding). Agency OS ist die **konsolidierende Web-App**, die beides unter *einer* Personalakte und *einer* Toggle-/RBAC-Logik vereint und **externe Agenten gleichstellt**.

**Konflikt-Entscheidungen (begründet):**
- **Auth:** Pluggable. MVP = lokales Better-Auth-Äquivalent; Enterprise = OIDC/SAML + SCIM. *Grund:* Self-host-Einstieg darf nicht an IdP scheitern, Enterprise braucht es. → Langdock gewinnt für die Ziel-Tiefe, Paperclip-Pragmatik für MVP.
- **Kommunikation:** **Tasks als primärer, auditierter Kanal** (Paperclip) — kein verstecktes Chat-Side-Channel, der Audit umgeht. Optionaler Chat ist *View auf Tasks*, kein paralleles System. *Grund:* Säule 7 (Audit) ist nicht verhandelbar.
- **Org vs Rechte:** **Strikt getrennt.** Reporting-Linie ≠ Berechtigung. *Grund:* Charter verlangt granulares RBAC *und* Org-Chart — vermischt man sie (Paperclip-Default), verliert man die Toggle-Granularität.
- **RAG:** Langdock-Modell (Knowledge-Folders + externe Vektor-DB), self-hostbar (z. B. pgvector/Qdrant). *Grund:* „Wissensordner (RAG)" steht wörtlich in der Akte-Definition.

**Zuordnung zu den 8 Produkt-Säulen:**

| Säule | Vereinter Funktionsumfang | Hauptquelle |
|---|---|---|
| **1 Firmenstruktur** | Company → Departments/Teams → Rollen → Reporting-Linien, Org-Chart-View | Paperclip |
| **2 Personalwirtschaft** | **Konsolidierte Akte** (Identität, Skills, Rechte, Eigenschaften, Herkunft, Status, Historie), Skill-Matrix, Onboarding/Offboarding-Flows, Status-Lifecycle | Paperclip + neu |
| **3 Berechtigung & Zugang** | RBAC (Rollen/Matrix) + **universelle Toggle-Engine** (pro Agent/Skill/Tool/Integration/Secret), SSO/SCIM (später) | Langdock + neu |
| **4 Skill-/Tool-System** | Skills mit **Schema(`input_schema`)/Version/Policy(auto·approval)/Scope**, Catalog+Install, Hash-Integrität, Audit-Holds | Paperclip + neu |
| **5 Integrationen & MCP** | MCP-Client (Tool-Server), MCP-Server (Agency-OS exposed), native Konnektoren, Custom-Builder, A2A | Langdock |
| **6 Orchestrierung** | Issues/Tasks (single-assignee, Relations), Routines (cron/webhook/API), **Heartbeat-Wakeup-Loop**, Delegation, optional Workflow-Graph | Paperclip |
| **7 Governance** | Approvals/Board-Gates, Budgets/Cost-Caps (pro Agent/Project), append-only Audit + Tool-Call-Tracing, Secrets (versioniert, sidecar), Multi-Company-Isolation | Paperclip + Langdock-API |
| **8 Portabilität** | Company Export/Import (template/snapshot) inkl. Agenten & Skills, Secret-Scrubbing | Paperclip |

**Explizit ÜBER beide Vorbilder hinaus (unser Mehrwert):**
1. **Externe Agenten = vollwertige Mitarbeiter** mit identischer Akte/Skills/Rechte/Budget/Audit (keiner der beiden vereint das so).
2. **Universelle Toggle-Engine** als eigenes Primitive mit *deterministischer Laufzeit-Durchsetzung* (Phase 5 zeigt den Mechanismus).
3. **Typisierte Skill-`input_schema`** (JSON-Schema) — fehlt bei beiden.
4. **Eine Akte-Oberfläche** statt verstreuter Configs — die „Personalakte" als zentrales UI-Objekt.
5. **Zwei-Wege-MCP/A2A:** Agency OS ist gleichzeitig Konsument *und* Anbieter von Agenten/Tools.

---

# PHASE 4 — USP-Architektur: externe Agenten einbinden

**Ziel:** Jeder fremde Agent — egal welches Protokoll — wird im System zu einem **„Mitarbeiter mit Akte"**, der dieselben Skills, Rechte, Budgets, Toggles und Audit-Pflichten erhält wie ein interner.

## 4.1 Unterstützte Agenten-Typen / Protokolle

| Typ | Protokoll/Mechanik | Beispiel | Paperclip-Vorbild |
|---|---|---|---|
| **HTTP/Webhook-Agent** | POST Request→Response (JSON), optional Streaming/SSE; Heartbeat-Ping | **deine Aigency-Engine** `POST /wake` | `http`-Adapter ✅ |
| **Process/CLI-Agent** | Kind-Prozess, stdin/stdout, Exit-Codes | `claude` CLI, lokales Skript | `process`-Adapter ✅ |
| **Claude-Agent/-Projekt** | Anthropic API / Claude-Code-Session | Claude-Code-Headless | `claude_local` ✅ |
| **OpenAI-kompatibel** | `/v1/chat/completions` | vLLM, Ollama, OpenAI | provider-agnostisch |
| **MCP-Agent/-Tool** | MCP-Client (HTTP/SSE), Tool-/Resource-Aufruf | beliebiger MCP-Server | (neu, von Langdock) |
| **A2A-Agent** | AgentCard `/.well-known/agent-card.json` | externer A2A-Dienst | (neu, von Langdock) |

## 4.2 Adapter-/Konnektor-Konzept (einheitliche Schnittstelle)

Ein **Adapter** ist die Übersetzung zwischen Agency-OS-Kern und Fremd-Protokoll. Einheitlicher Vertrag (an Paperclips bewährtem Contract orientiert):

```
interface AgentAdapter {
  type: string                       // "http" | "process" | "mcp" | "openai" | ...
  testEnvironment(cfg): HealthResult // Verbindungstest beim Onboarding
  execute(ctx: ExecutionContext): ExecutionResult
  //   ctx liefert: task, injizierte Secrets (ENV, nie im Prompt),
  //   freigeschaltete Skills, Tool-Allowlist, Budget-Restbetrag, Audit-Sink
  //   result liefert: TranscriptEntries (tool_call/tool_result/result+costUsd),
  //   Statuswechsel, Kosten, Artefakte
  sessionCodec?                      // optional: Resume/Checkpoint
}
```

Kern-Eigenschaft: **Der Adapter erzwingt die Akte.** Vor `execute` filtert der Kern Skills/Tools nach Toggles+RBAC, injiziert nur erlaubte Secrets als ENV, prüft das Budget; nach `execute` schreibt er jede Tool-Aktion ins append-only Audit und bucht Kosten. So ist ein externer Agent **nicht privilegierter** als ein interner — die Akte ist die Klammer, nicht der Agent selbst.

## 4.3 Onboarding-Flow „externen Agenten einstellen"

1. **Registrieren:** Typ wählen (HTTP/Process/MCP/…), Config (URL/Command/Headers), Secrets binden (verschlüsselt).
2. **Testen:** `testEnvironment()` → Health/Auth/Latenz; bei MCP: Tool-Discovery-Liste anzeigen.
3. **Akte anlegen:** Name, Rolle/Titel, Abteilung, Vorgesetzter, Reporting-Linie.
4. **Ausstatten:** Skills zuweisen (mit Policy auto/approval), Tools/Integrationen/Secrets/Datenräume per Toggle, Modell-Config (falls intern), Budget/Cost-Cap setzen.
5. **Einhängen:** Status `onboarding` → Probe-Task gegen Sandbox-Scope → bei Erfolg `active`; Board-Approval-Gate wie bei jedem Hire.
6. **Betreiben:** Heartbeat/Routine triggert den Agenten; jede Aktion landet in seiner Historie; Offboarding = Status `terminated` (Zugänge revoked, Akte archiviert, Audit bleibt).

## 4.4 Gleichstellung intern ↔ extern

| Akte-Aspekt | Interner Agent | Externer Agent | Durchsetzung |
|---|---|---|---|
| Skills | zugewiesen | identisch zugewiesen | Kern filtert vor `execute` |
| Rechte/Toggles | RBAC + Toggles | identisch | Kern, nicht Agent |
| Budget/Cost-Cap | pro Agent | identisch | Kern bucht `cost_events`, Auto-Pause |
| Audit/Historie | append-only | identisch | Adapter→Audit-Sink Pflicht |
| Secrets | sidecar-ENV | sidecar-ENV | nie im Prompt, `redactEnvForLogs` |
| Status-Lifecycle | aktiv/pausiert/… | identisch | Heartbeat respektiert Status |

**Konsequenz:** Deine Aigency-Engine wird als **HTTP-Agent** mit Akte „eingestellt" (`POST /wake`), bekommt z. B. Skill „SEO-Audit" (Policy auto) + Budget 20 €/Monat + Toggle „live_url_fetch an", und erscheint im Org-Chart unter ihrem Team — vollständig auditiert, ohne Sonderrechte.

---

# PHASE 5 — Datenmodell & Berechtigungen

## 5.1 Die „Agenten-Akte" (Kern-Entität, alle Charter-Felder)

```
Agent (= Mitarbeiter mit Akte)
├─ identity:    id, displayName, role/title, departmentId, managerId (Reporting), companyId
├─ origin:      kind ∈ {internal, external}, adapterType, adapterConfig(JSON), protocol
├─ properties:  modelConfig?, systemPrompt/persona?, knowledgeFolderIds[] (RAG),
│               budgetMonthlyCents, costCapPolicyId
├─ skills:      AgentSkill[] → { skillId, version(pin), policy ∈ {auto, approval_required},
│                                scope, enabled(toggle) }
├─ access:      Toggle[] → { target ∈ {tool, integration, secret, dataroom},
│                            targetId, enabled, grantedBy, expiresAt? }
├─ status:      ∈ {onboarding, active, paused, terminated}
├─ budget:      budgetMonthlyCents, spentMonthlyCents, autoPauseAt(%)
└─ history:     AuditEntry[] (append-only: action, toolCall, decision, cost, ts)
```

## 5.2 Org-/Rollen-Modell

```
Company 1─* Department(Team: key,name) 1─* Agent
Agent.managerId → Agent            (Reporting-Linie, rein organisatorisch)
Role (RBAC-Rolle, getrennt!) *─* Permission   (Access-Control)
User *─* Role                      (Menschen: Board/Admin/Editor/Member)
```
**Wichtig:** `managerId` (Org) und `Role/Permission` (RBAC) sind **getrennte Achsen** (siehe Phase-3-Konflikt). Ein Agent kann hoch in der Hierarchie und trotzdem eng berechtigt sein.

## 5.3 Skill-Modell (Schema/Version/Policy)

```
Skill
├─ key, slug, name, description, body (SKILL.md)
├─ input_schema (JSON-Schema)        ← unser Zusatz über beide Vorbilder
├─ version, contentHash (Integrität: installedHash vs originHash)
├─ trustLevel, sourceType (catalog|github|url|local)
└─ defaultPolicy ∈ {auto, approval_required}, defaultScope
AgentSkill (Zuweisung)
└─ skillId, versionPin, policy(override), scope, enabled(toggle), addedBy
```
Policy `auto` = Skill läuft ohne Rückfrage; `approval_required` = Tool-Call erzeugt Approval-Gate (Board/Manager). Hash-Mismatch → Skill blockiert bis Re-Pin (`reset`) oder Audit-Freigabe.

## 5.4 Berechtigungsmodell: RBAC + universelle Toggles

Zwei Ebenen, **AND-verknüpft**:
1. **RBAC** (wer darf konfigurieren/sehen): Rolle→Permission-Matrix über Ressourcentypen (Agent, Skill, Integration, Budget, Audit, Company-Settings) × Aktionen (view/edit/approve/admin) — Langdock-Vorbild.
2. **Toggle** (was darf *dieser Agent zur Laufzeit* nutzen): boolean pro (Agent × Ziel), Ziel ∈ {Skill, Tool, Integration, Secret, Dataroom}. Default-deny.

Effektive Laufzeit-Erlaubnis = `RBAC erlaubt Konfiguration` **UND** `Toggle(agent,target)=true` **UND** `Status=active` **UND** `Budget>0`.

## 5.5 Beispiel: Toggle → Laufzeit-Wirkung (deterministisch)

**Szenario:** Agent „SEO-Auditor" (extern, HTTP), Toggle `tool:live_url_fetch` wird auf **OFF** gesetzt.

```
1. Mensch/Manager: PATCH /agents/seo-auditor/toggles { target:"tool:live_url_fetch", enabled:false }
   → schreibt Toggle-Row, schreibt Audit-Entry (wer/wann/was), invalidiert Permission-Cache.
2. Nächster Heartbeat weckt den Agenten mit Task "Audit b-riemer.dev".
3. Kern baut den ExecutionContext: Tool-Allowlist = {Toggles(agent)=true} ∩ {Skill erlaubt}
   → live_url_fetch NICHT in der Allowlist.
4a. HTTP-Adapter sendet dem Agenten nur die erlaubten Tool-Definitionen (Tool ist „unsichtbar").
4b. Ruft der Agent es dennoch (Halluzination), lehnt der Kern-Tool-Proxy ab:
    403 tool_not_permitted → Audit-Entry „denied" → kein Seiteneffekt, keine Kosten.
5. Ergebnis: Verhalten ändert sich sofort beim nächsten Lauf, ohne Redeploy des Agenten.
   Re-Aktivierung (ON) wirkt symmetrisch ab dem nächsten Heartbeat.
```
Der Toggle wirkt also an **zwei** Stellen (Allowlist-Filter *und* Tool-Proxy-Enforcement) → „defense in depth", auch gegen einen unkooperativen externen Agenten.

---

# PHASE 6 — Architektur & Tech-Stack

## 6.1 Die zentrale Entscheidung: Fork vs. Neubau

Wegen **🔴 Befund 2** (nur `cli/`+`doc/` öffentlich, Server/UI/DB closed) gibt es drei realistische Wege:

| Option | Beschreibung | Pro | Contra | Eignung Charter |
|---|---|---|---|---|
| **A — Paperclip als Basis, nur via Plugins erweitern** | Paperclip self-hosted betreiben; Akte/Governance/RAG als Paperclip-**Plugins** + Companion-Service | Schnellste Time-to-Value; Org/HR/Orchestrierung „kostenlos"; aktiver Upstream | **Kern (Server/UI) nicht patchbar** (nicht öffentlich); an Plugin-API-Grenzen gebunden; die „Akte-UI" lebt in fremder, nicht-sandboxed UI; Kopplung an Paperclips Roadmap/Lizenzpolitik | Mittel — USP-UI eingeschränkt |
| **B — Greenfield-Neubau** | Eigene App; dokumentiertes Paperclip-Datenmodell + Langdock-Governance selbst implementieren | Volle Kontrolle, eigene Akte-UI, model-agnostisch, keine Vendor-Kopplung, DSGVO-Hoheit | Höchster Initialaufwand (Orchestrierungs-Engine + Adapter neu) | Hoch |
| **C — Greenfield Control-Plane + Paperclip-kompatibles Adapter-Protokoll (EMPFOHLEN)** | Eigene App (wie B), aber Adapter-Contract + Datenmodell **bewusst Paperclip-kompatibel**; Paperclip *optional* als eine anbindbare Engine; **deine aigency-engine** als HTTP-Agent von Tag 1 | Kontrolle + Wiederverwendung bewährter Konzepte; Migrationspfad zu/von Paperclip via Export/Import; USP nativ | Etwas mehr Disziplin (Kompatibilität pflegen) | **Höchste** |

**Empfehlung: Option C.** Begründung auf USP/Säulen: Die Charter-Kernidee ist die **konsolidierte Personalakte-UI mit Toggle-Engine** und **externe Agenten gleichgestellt** — beides verlangt Kontrolle über UI + Kern, die ein nicht-öffentlicher Paperclip-Server nicht hergibt (Option A scheitert hier). Greenfield (B/C) gibt diese Kontrolle; C sichert zusätzlich **Portabilität** (Säule 8) und einen pragmatischen Migrationspfad, indem wir Paperclips Export/Import- und Adapter-Form übernehmen. **A bleibt als Schnell-Prototyp/Benchmark sinnvoll** (du hast Paperclip bereits lokal laufen) — aber nicht als Produktfundament.

## 6.2 Vorgeschlagener Stack (begründet, self-host + DSGVO)

| Schicht | Vorschlag | Begründung |
|---|---|---|
| **Frontend** | React + Vite + TypeScript (Tailwind, shadcn/ui) | Paperclip-Idiom → Konzepte/Community übertragbar; SPA für Akte/Org-Chart/Toggles |
| **Backend** | Node.js 20+ / TypeScript, **NestJS** (Fastify-Adapter unter der Haube) | „Beste Langzeit-Qualität" (D6): Module/DI + Guards/Interceptors/Pipes für RBAC, Audit, Schema-Validierung; Fastify-Perf erhalten |
| **DB** | **PostgreSQL + Drizzle ORM**, `pgvector` für RAG | Paperclip-kompatibel; pgvector spart separate Vektor-DB im MVP; Qdrant später optional |
| **Auth** | **OIDC-Fundament ab Tag 1** (D7); MVP lokaler/eingebauter Provider → Entra/Google/Okta + SCIM einsteckbar | Kein Rip-and-Replace; Enterprise-SSO später ohne Umbau |
| **Secrets** | AES-`local_encrypted` (Master-Key, 0600) → später Vault/AWS-Provider | Paperclip-Muster; sidecar-ENV, nie in Prompts (DSGVO/Audit) |
| **Job/Scheduling** | DB-backed Wakeup-Queue + Worker (BullMQ/Redis oder pg-boss) | Heartbeat-/Routine-Motor; pg-boss vermeidet Redis im MVP |
| **Audit** | Append-only Postgres-Tabelle + optional Export zu SIEM | Säule 7; unveränderlich, Tool-Call-Tracing |
| **Adapter-Runtime** | Out-of-Process-Worker pro Agent-Lauf (Isolation) | Sicherheit; externer Code/Prozess gekapselt |
| **MCP** | MCP-Client-Lib (HTTP/SSE) + eigener MCP-Server-Endpoint | Säule 5 + Zwei-Wege-USP |
| **Deployment** | Docker-Compose (App+PG+Worker), VPS-tauglich | Self-host; läuft auf deinem 8-GB-VPS (Paperclip-Erfahrung) |

**DSGVO/Sicherheit by design:** EU-Hosting (dein VPS), Secrets nie in Prompts/Logs (`redactEnvForLogs`), append-only Audit, Datenresidenz selbstbestimmt, Company-Isolation per `company_id`, Export/Import mit Secret-Scrubbing, RBAC default-deny.

## 6.3 Wiederverwendung deines Bestands
- **aigency-engine** → erster externer HTTP-Agent (`/wake`, `/health` existieren bereits) → validiert den USP sofort.
- **Vault (PARA/RAG `vault_rag.py`)** → als Knowledge-Folder-Quelle anbindbar (RAG-Säule).
- **Paperclip (lokal installiert)** → Referenz-Benchmark + optionale Engine via Export/Import-Kompatibilität.

---

# PHASE 7 — Roadmap, Risiken, offene Fragen

## 7.1 Phasenweise Roadmap

**MVP-Definition (das kleinste, das den USP beweist):** Eine Company, ein Department, **eine Akte-UI**, in der man **einen externen HTTP-Agenten (aigency-engine) einstellt**, ihm **einen Skill + ein Tool per Toggle** gibt, ein **Budget** setzt, ihn per **Heartbeat/Routine** einen Task abarbeiten lässt, und **jede Aktion + Kosten im append-only Audit** sieht. Toggle-OFF wirkt nachweisbar zur Laufzeit (Phase-5-Beispiel).

| Meilenstein | Inhalt | Säulen | Aufwand* |
|---|---|---|---|
| **M0 — Spike/Decision** | Option-C bestätigen; Paperclip-http-Adapter hands-on testen (Q1); Datenmodell-Skizze als Migration | — | S |
| **M1 — Fundament** | Repo, Docker-Compose (App+PG), Auth lokal, Company/Department/Agent-Schema, leere Akte-UI | 1 | M |
| **M2 — Akte + Org** | Voll konsolidierte Personalakte-UI, Org-Chart-View, Status-Lifecycle, Reporting-Linien | 1, 2 | M |
| **M3 — Adapter + USP** | HTTP-Adapter, Onboarding-Flow, **aigency-engine eingestellt & lauffähig**, `testEnvironment` | 5, USP | M–L |
| **M4 — Skills + Toggles + RBAC** | Skill-Modell (`input_schema`/Version/Policy), universelle Toggle-Engine + Laufzeit-Enforcement, RBAC default-deny | 3, 4 | L |
| **M5 — Orchestrierung** | Issues/Tasks, Routines (cron), Heartbeat-Wakeup-Loop, Delegation | 6 | L |
| **M6 — Governance** | Budgets/Cost-Caps + Auto-Pause, Approvals/Board-Gates, append-only Audit + Tool-Tracing, Secrets (AES/sidecar) | 7 | L |
| **M7 — RAG + MCP** | Knowledge-Folders (pgvector), MCP-Client (Tools), optional MCP-Server (exposed) | 4, 5 | M–L |
| **M8 — Portabilität + Härtung** | Company Export/Import (template/snapshot), Multi-Company-Isolation, Backups | 8, 7 | M |
| **M9 — Enterprise (später)** | OIDC/SAML+SCIM, Branding/White-Label, Workflow-Graph, Prompt-Library, Chat-View | 3, 5, 6 | L |

*Aufwand grob, ohne Personentage-Zusage: S=Tage, M=1–2 Wochen, L=2–4 Wochen (1 Entwickler + Claude).

**MVP-Grenze (festgelegt, D2):** **M0–M6** — der USP-Beweis *plus* volle Governance (Approvals/Board-Gates, Cost-Caps/Auto-Pause, append-only Audit, Secrets-Management). Bewusst umfangreicher als der schlanke USP-MVP, dafür von Anfang an demo- *und* betriebssicher. M7–M9 bleiben „später".

## 7.2 Risiken & Aufwandsabschätzung

| Risiko | Wahrsch. | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Paperclip-Server/DB nicht öffentlich → kein Fork | **eingetreten** | hoch | Option C (Greenfield, Konzepte statt Code) |
| Paperclip-http-Adapter doch nicht produktionsreif | mittel | mittel | Q1 zuerst testen; eigener HTTP-Adapter ist ohnehin Teil von C |
| Eigene Orchestrierungs-Engine unterschätzt (Heartbeat/Queue) | mittel | hoch | pg-boss/BullMQ statt Eigenbau; M5 als eigener Block |
| Sicherheit externer Agenten (fremder Code/Prozess) | mittel | hoch | Out-of-Process-Worker, Toggle-Enforcement im Proxy, Secrets sidecar |
| Scope-Creep (Langdock-Vollumfang) | hoch | mittel | Strikte MVP-Grenze M0–M4; M9 explizit „später" |
| RAG-Qualität/Kosten | mittel | mittel | pgvector + bestehender `vault_rag` als Start |
| Modell-/Provider-Drift | niedrig | mittel | Provider-agnostische Factory (Engine-Vorbild vorhanden) |

## 7.3 Entscheidungen & offene Fragen

**✅ Bereits entschieden (28.06.2026):**
- **Q1 → JA (D3):** Paperclips `http`/`process`-Adapter **zuerst hands-on** gegen `aigency-engine /wake` testen (klärt Blocker #3989), dann bauen.
- **Q2 → Option C (D1):** Neubau („Greenfield") Control-Plane, Paperclip-kompatibel. (Nicht Option A/B.)
- **Q4 → M0–M6 (D2):** MVP inkl. voller Governance.
- **Q3 → NestJS (+Fastify-Adapter) & self-hosted Postgres+pgvector (D4/D6):** kein Supabase.
- **Q5 → OIDC-Fundament, lokaler Login im MVP (D7):** SSO/SAML/SCIM später einsteckbar.
- **D5 → Visual = Dark Command Center**, React-Umsetzung nach Higgsfield-Referenz.

**❓ Noch offen — deine Freigabe nötig, BEVOR gebaut wird:**

6. **Q6 (Repo/Ort):** Neues Repo `~/dev/agency-os`, oder im Vault unter `01_Projects/agency_os/`? Plan zusätzlich als Vault-Notiz (PARA/Frontmatter)?
7. **Q7 (Skill-`input_schema`):** JSON-Schema **Pflicht** für Skills (typsicher, etwas mehr Aufwand) oder optional?
8. **Q8 (Lizenz):** Soll Agency OS selbst Open Source werden (beeinflusst Abhängigkeiten/Lizenzwahl)?
6. **Q6 (Speicherort/Repo):** Neues Repo in `~/dev/` (z. B. `agency-os`), oder im Vault unter `01_Projects/agency_os/`? Soll der Plan zusätzlich als Vault-Notiz (PARA, Frontmatter) abgelegt werden?
7. **Q7 (Skill-`input_schema`):** JSON-Schema als Pflicht für Skills (typsicher, mehr Aufwand) oder optional?
8. **Q8 (Lizenz/Veröffentlichung):** Soll Agency OS selbst Open Source werden (Lizenzwahl beeinflusst Abhängigkeiten)?

---

---

# Anhang A — Verifikations-Ergebnis (D3): Engine ↔ Paperclip-HTTP-Adapter

**Befund: Der alte Blocker #3989 ist nach aktueller Quellenlage überholt — die Anbindung ist machbar.**

- **Paperclip-Seite (ausgeliefert):** `http`- und `process`-Adapter sind im aktuellen Code **registriert** (`cli/src/adapters/registry.ts`) und als **reale CLI-Module** vorhanden (`cli/src/adapters/http/{index.ts,format-event.ts}`, `.../process/{…}`). `SPEC.md` §4: „the `process` and `http` adapters ship as generic defaults." → kein „coming soon" mehr.
- **Engine-Seite (zweckgebaut + getestet):** `status_app.py::/wake` ist exakt für diesen HTTP-Adapter gebaut: liest die Aufgabe aus konfigurierbaren Feldern (`task`/`instruction`/`prompt`/`goal`, top-level **oder** unter `context`), ruft `staffing.deliver()`, antwortet `{"status":"completed","result":…,"final_path":…,"run_id":…}`; bei fehlender Aufgabe **422 mit Diagnose** (`received_keys`), bei Fehler **500**. Testsuite `tests/test_paperclip_wake.py` deckt completed/context/422/500 ab.
- **Verbleibende Unsicherheit (unkritisch):** Der **exakte Request-Body**, den Paperclips HTTP-Adapter sendet, ist öffentlich nicht einsehbar (Request-Bauteil liegt im nicht-öffentlichen `server`-Paket). Da `/wake` mehrere Feldnamen akzeptiert *und* die 422-Antwort die angekommenen Keys zurückspiegelt, ist eine Abweichung beim Onboarding **sofort sichtbar** und ein **Config-Tweak (payloadTemplate)**, kein Code-Blocker.
- **Warum kein Live-Lauf in dieser Session:** Die Sandbox-Umgebung hat **keinen Netzzugang** zum Paket-Index (PyPI) noch zu Higgsfield-CDN (Proxy 403); die ML-Abhängigkeiten der Engine (langgraph/langchain) ließen sich daher nicht installieren. Der **finale End-to-End-Ping läuft auf deinem Mac**, wo Engine + Paperclip ohnehin liegen.

**Runbook (auf deinem Mac, ~5 Min):**
1. **Engine starten:** `cd ~/dev/aigency-engine && uv run uvicorn aigency_engine.status_app:app --port 8900` → Test: `curl localhost:8900/health` ⇒ `{"status":"ok"}`.
2. **Paperclip:** neuen Agenten anlegen, **Adapter = http**, URL `http://localhost:8900/wake`, im `payloadTemplate` ein Feld `task` = `{{issue.title}}: {{issue.description}}`, `timeoutMs` hoch (z. B. `300000`, da `deliver()` Minuten dauert).
3. **Auslösen:** Issue dem Agenten zuweisen / Heartbeat → Engine liefert, Antwort `{"status":"completed",…}` erscheint in Paperclips Run-Log.
4. **Falls 422:** `received_keys` in der Antwort prüfen → Feldnamen im `payloadTemplate` anpassen. Fertig.

> Ich kann dich dabei live begleiten (Befehle gebe ich vor; ins Terminal tippst du bzw. ich über Befehls-Snippets).

# Anhang B — Frontend-Visual (D5): Higgsfield-Konzepte

Zwei erste UI-Konzepte für die „Firmenstruktur der Zukunft" generiert (nano_banana, 16:9), zur Festlegung der Visual Language; danach Umsetzung in React:
- **Konzept A — Dark Command Center** (charcoal, Glassmorphism, elektrisch-blau/violett, cinematic): `hf_20260628_050124_e27b1680…png`
- **Konzept B — Light Modular/Editorial** (off-white, Swiss-Grid, ein Akzent, viel Weißraum; Nick zu modulr.design): `hf_20260628_050126_f39a1912…png`

**Gewählt: A — Dark Command Center.** Darauf aufbauend zwei konsistente Schlüssel-Screens erzeugt:
- **Org-Chart / Firmenstruktur** (CEO → Abteilungen → Agenten-Nodes, „EXTERNAL"-Badges für BYO-Agenten): `hf_20260628_050553_b42e0933…png`
- **Personalakte / Agenten-Detail** (Identity · Skills mit auto/approval · Access-Toggles · Budget-Meter · Origin „external · HTTP adapter" · Audit-Timeline): `hf_20260628_050557_dddac500…png`

Alle vier liegen in der Higgsfield-Historie des Workspaces. **Credits danach: 0/8** — für die nächsten Screens (Governance-Dashboard, Skill-Matrix, Onboarding-Flow „externen Agenten einstellen") ist ein Top-up nötig. Diese Bilder sind die **Design-Referenz** für die spätere React-Umsetzung.

---

# Anhang C — Zusatz-Analyse: LangGraph Studio, companyGPT, Amber (verifiziert)

Dritte Recherche-Runde zur Ideen-Übernahme. Quellen je Tool am Ende dieses Anhangs.

## C.1 LangGraph Studio / LangSmith (LangChain)
**Was:** Agent-IDE + Runtime/Plattform für graph-basierte Agenten (die Engine des Users nutzt LangGraph bereits). Lib **MIT**; Production-Server **Elastic 2.0 + Lizenzschlüssel + Beacon-Egress**. **⚠ Wettbewerb:** „LangSmith Fleet" ist ein no-code Agent-Flotten-Manager mit abgestuften Rechten (edit/run/clone) — überlappt direkt unser Feld.
**Top-Ideen für uns:**
1. **Live-Graph-View eines Auftrags** — laufender Delivery-Run als animierter Graph (Org-Chart wird zum Live-Cockpit).
2. **Checkpoints + Resume + Time-Travel** — durabler Auftrags-Verlauf; „zurückspulen, State korrigieren, ab Schritt N neu starten" (stark für teure/lange Agenten-Jobs + Audit).
3. **HITL-Interrupts → unsere Approval-Gates** — vier Modi *approve / edit / reject / respond*; Mensch kann Tool-Call **vor** Ausführung editieren (nicht nur ja/nein). Cost-Cap-Erreichung löst Interrupt aus.
4. **Assistants = versionierte Agenten-Konfig** — Config (Prompt/Modell/Tools) getrennt von der Blaupause, mit **Promote/Rollback**. → unsere „Personalakte" wird versioniert (Beförderung/Rollback mit Audit).
5. **Token-/Cost-Roll-up** (pro Sub-Agent/Auftrag/Abteilung) als Datenbasis der Budgets/Cost-Caps.
6. **Zwei-Wege-Standardprotokolle** (MCP-Endpoint, A2A, Webhooks, RemoteGraph) bestätigen unser BYO-Agent-Adapter-Konzept.

## C.2 companyGPT (innFactory, DE)
**Was:** **Open-Core** (Basis LibreChat, MIT) + proprietäre Addons, als **Managed-Deployment im Kunden-Tenant** (BYOC, EU/DE, DSGVO/EU-AI-Act). Kein Per-Seat-Preis.
**Top-Ideen für uns:**
1. **Permission-Mirroring im RAG** — Agent sieht nur Dokumente, die der aufrufende Mensch/Agent sehen darf (SharePoint-ACLs 1:1). Bindet Daten-Permissions an Identität statt globaler Wissensbasis → passt exakt zu unseren Toggles.
2. **Agent-Katalog/Marketplace** mit Metadaten, Rollen, Sichtbarkeit (privat/Team/Org) — deckt sich mit Org-Chart + Personalakte.
3. **Self-Host/BYOC ab User #1 als Default** (nicht Enterprise-Gate) — bewusst als Differenzierung vermarkten.
4. **Usage-Dashboard mit Handlungsempfehlungen** (nicht nur Zahlen: „wer braucht Schulung?", „Kostenausreißer?", „ungenutzte Agenten?").
5. **MCP + n8n + Kubernetes** als dokumentiertes Erweiterungs-Muster für eingebundene Fremd-Tools/-Agenten (stützt USP).
6. **Office-Output** (Excel/Word/PPT schreiben) als first-class Skill — konkretes Deliverable einer „Firma aus Agenten".
7. **EU-AI-Act/DSGVO-Readiness** als verkaufbares Governance-Modul (Audit + programmatische Löschung + DPIA-Hilfe).

## C.3 Amber (inFeedo)
**Was:** Personifizierter „agentic" HR-/Engagement-Bot („Chief Engagement Officer", den man „einstellt"). Proprietär, Cloud-SaaS, **kein** Self-Host → nur konzeptionell Vorbild.
**Top-Ideen für uns:**
1. **Benannte Persona-Agenten** (Name + Titel + Avatar + „Einstellungsdatum") statt nüchterner IDs — erhöht Adoption (deckt sich mit Konzept A/Personalakte).
2. **Agenten-Lebenszyklus** „provisioning → onboarding → active → review → decommission" mit Meilenstein-Check-ins.
3. **Proaktive Heartbeats** — Agent meldet sich aktiv („stecke bei X fest", „Budget 80 %") statt stiller Statusfelder.
4. **„Agents at risk"-Watchlist** — Frühwarnung über Drift/Fehlerrate/Budget-Burn/Eskalationen im Governance-Dashboard.
5. **„Agents-to-Review"** — täglich priorisierte Liste der Agenten, die menschliche Aufmerksamkeit brauchen, mit Auto-Summary.
6. **„Chat with your fleet"-Meta-Agent** (Lens-artig) über das **Audit-Log** — „Welcher Agent hat letzte Woche das meiste Budget verbraucht?" → Auto-Report.
7. **Governance-Inbox** mit Eskalation/Reassignment für freigabepflichtige Agenten-Aktionen.

## C.4 Zuordnung zu den Säulen (neu/verstärkt)
- **Säule 2 (Personalwirtschaft):** versionierte Akte (Promote/Rollback), Persona/Lifecycle, „Agents-to-Review".
- **Säule 3 (Berechtigung):** Permission-Mirroring (Daten an Identität), HITL-Edit-vor-Ausführung.
- **Säule 6 (Orchestrierung):** Live-Graph-View, Checkpoints/Resume/Time-Travel, proaktive Heartbeats, Supervisor-/Swarm-Topologien als Vorlagen.
- **Säule 7 (Governance):** Cost-Roll-up → Budgets, „at-risk"-Watchlist, Governance-Inbox, Audit-Meta-Agent, EU-AI-Act-Modul.
- **Säule 5 (Integrationen/MCP):** MCP+A2A+Webhooks zwei-Wege, n8n/K8s-Erweiterungsmuster.
- **USP-Verstärkung:** „echtes, schlüsselloses Self-Hosting ohne Phone-Home" (gegen LangGraph-Server-Reibung) + BYO-Agent.

## C.5 Open-Source-Strategie (Q8 → D9)
**Empfehlung: ja, Open Source — das ist für dieses Tool ein Adoptions-Hebel, kein Risiko.** Belege aus der Recherche: Paperclip (MIT) ist self-host-beliebt; companyGPT setzt bewusst auf Open-Core (LibreChat) „gegen Vendor-Lock-in"; LangGraphs **Lib (MIT, ~35k Stars)** ist beliebt, während sein **Server (Elastic 2.0 + Lizenzschlüssel + Phone-Home)** genau die Reibung erzeugt, die self-hostende Teams stört.

**Optionen & Abwägung:**
| Modell | Wirkung | Risiko |
|---|---|---|
| **Permissiv (Apache-2.0)** *(empfohlen f. Kern)* | Max. Reichweite/Community/Vertrauen; Patent-Grant (besser als MIT) | Andere dürfen es auch kommerziell hosten |
| **Open-Core** (Kern OSS + bezahlte Enterprise-Add-ons: SSO/SCIM, erw. Governance) | Bewährtes Monetarisierungsmodell (Langdock/LangChain/companyGPT) | Grenzziehung Kern/Enterprise muss sauber sein |
| **Source-available / BSL / Elastic-2.0** | Schützt vor Cloud-Konkurrenz | **Weniger „populär"** — genau die LangGraph-Reibung |

**Konkrete Empfehlung (D9):** Kern unter **Apache-2.0**, von Anfang an **ohne Lizenzschlüssel/Phone-Home/Air-gap-fähig** (aktives Verkaufsargument). Enterprise-Add-ons später als optionales Open-Core-Modul, falls Monetarisierung gewünscht. Abhängigkeiten bleiben permissiv-kompatibel (bereits so umgesetzt: NestJS MIT, React MIT, Drizzle Apache-2.0, Postgres PostgreSQL-Lizenz). **Bestätigt (29.06.2026): Apache-2.0, schlüsselloses Self-Hosting, kein Phone-Home.**

## C.6 Quellen (Anhang C)
**LangGraph/LangSmith:** docs.langchain.com/langsmith/{studio,assistants,deployment,cost-tracking,server-mcp,server-a2a,fleet} · docs.langchain.com/oss/python/langgraph/persistence · github.com/langchain-ai/langgraph (MIT) · langchain.com/blog/langgraph-studio-the-first-agent-ide · langchain.com/blog/introducing-langsmith-fleet · rvernica.github.io/2026/03/langchain-license (Elastic-2.0/Beacon).
**companyGPT (innFactory):** innfactory.ai/en/blog/companygpt-vs-langdock · innfactory.ai/en/blog/chatgpt-in-business-gdpr-compliant-private-gpts · innfactory.ai/en/services/companygpt · github.com/innFactory/librechat-admin-dashboard (MIT). *(Produktseiten JS-Shells; viele Details aus Anbieter-Blogs — als Marketing einordnen.)*
**Amber (inFeedo):** infeedo.ai · infeedo.ai/conversational-ai-chatbot · infeedo.ai/hr-automation-and-enablement · infeedo.ai/lens-ai-people-scientist · infeedo.ai/pricing. *(Mehrdeutiger Name; Fokus inFeedo-Amber als „AI-Mitarbeiter"-Vorbild. Alternativen: ambr.ai, Amber Group/Nasdaq AMBR.)*

---

# Anhang D — Zusatz-Analyse: meinGPT, nele.ai, Zylon/PrivateGPT (verifiziert)

Vierte Recherche-Runde. Quellen je Tool am Ende.

## D.1 meinGPT (SelectCode, DE — proprietär SaaS)
**Top-Ideen:**
1. **Sovereignty-Level pro Agent/Modell (Stufe 1–4: „EU-Only" → „Worldwide+PII")** — sichtbarer Trade-off Features ↔ Compliance; filtert automatisch zulässige Modelle/externe Agenten.
2. **Budget mit Graceful-Degradation** — Warnstufen 50/75/95/100 %, bei 100 % **automatischer Fallback auf günstiges Modell statt Hard-Stop** (Erweiterung unseres Auto-Pause).
3. **Identity-Forwarding (JWT)** — externe Agenten laufen mit weitergereichter Nutzer-Identität/Scoped-Token statt Service-Account-Vollzugriff.
4. **Agent-Governance-Gate**: Model-Approvals + Tool-Policies + Pflicht-Acknowledgement der KI-Policy beim Onboarding.
5. **Adoption-/KI-Cockpit** (Aktivierung, Use-Case-Map, „h gespart"). 6. **Abteilungs-Templates/Playbook**. 7. **Tenant-Key-Verschlüsselung + Privacy-Proxy/PII-Maskierung** vor Weitergabe an Fremd-Agenten.

## D.2 nele.ai (GAL Digital, DE — proprietär SaaS)
**Top-Ideen:**
1. **Verbrauchsbasiertes Pricing statt Per-Seat** (Credits, „kein Preis pro User") — passt ideal zu „beliebig viele Agenten".
2. **Additive Gruppen-Budgets** (Not defined/Unlimited/Limited, höchstes Limit gewinnt) — einfaches, erprobtes Auflösungsmodell für Budget-Toggles pro Agent/Abteilung/Org.
3. **„Eigenes KI-Modell" = Modell + Wissensbasis als wiederverwendbares Bündel** → unsere Akte als komponierbares, freigebbares Artefakt.
4. **Content-Filter** als deklarative, term-basierte Guardrail-Schicht vor jeder Ausgabe.
5. **Audit + „Mitarbeiter dürfen nicht bewertet werden"-Prinzip** — Governance ohne Überwachung (Betriebsrat-/Works-Council-freundlich, DACH-entscheidend) — als Feature **und** Marketing.
6. **Modell-Katalog mit Filtern** (Serverstandort, Verbrauchsfaktor, Reasoning) als Governance-Datenquelle.

## D.3 Zylon / PrivateGPT (Zylon AI — **Open-Core**, PrivateGPT Apache-2.0, 57k★, v1.0.0 06/2026)
**Direkte Bestätigung unserer Strategie (D9):** großzügig OSS (komplette API-/Engine-Schicht, keyless), Monetarisierung über **Betrieb, Governance, Connectors, Support** — nicht über das Feature selbst.
**Top-Ideen:**
1. **Projekt-/Workspace-gescopte Permissions** („AI only sees data explicitly connected; RBAC prevents cross-project exposure") → **genau unser Permission-Mirroring** (jetzt umgesetzt).
2. **Token-scoped Gateway für externe Agenten** — Token erbt erlaubte Modelle/KBs/Guardrails/Rate-Limits/Audit; externe Agenten bekommen **scoped Credentials statt Vollzugriff**. (Kern-Antwort auf „wie governt man fremde Agenten sicher".)
3. **Audit/Provenance first-class + SIEM-Export** (pro Request: User, Modell, Tools, Daten-Zugriff, Timestamps).
4. **OpenAI-/Anthropic-API-Kompatibilität** als Drop-in-Adoptionshebel (Cursor/LangChain/n8n docken ohne Umbau an).
5. **High-Level „Admin-API"** für die Control-Plane selbst → Org/Akte/Skill/Budget vollständig API-/IaC-getrieben (Onboarding/Offboarding als API-Call).
6. **Deployment-Spektrum** (Cloud-VPC / Managed-On-Prem / Air-gapped „Zylon in a Box") + **OSS-GTM**: virales Repo als Top-of-Funnel, Referenz-UI als „Demonstrator", AWS-Marketplace fürs Procurement.

## D.4 In dieser Session bereits umgesetzt
- **Permission-Mirroring (Zylon/companyGPT):** Wissensordner mit per-Agent-Zugriff; Laufzeit-Kontext zeigt nur freigeschaltete Ordner. ✅
- **Versionierte Akte / Promote-Rollback (LangGraph):** `agent_versions` + Snapshot/Promote. ✅
- **Heartbeats, Budget-Alarme, Fleet-Insights (Amber/LangGraph/meinGPT):** ✅ (M-Features)
- **Onboarding-Wizard mit Pre-Create-Verbindungstest:** ✅

## D.5 Als Nächstes lohnend (priorisiert)
1. **Token-scoped Credentials + Sovereignty-Level** für externe Agenten (Zylon + meinGPT) — härtet den USP.
2. **Budget-Graceful-Fallback** (meinGPT) — Fallback-Modell statt Hard-Stop.
3. **OpenAI-/Anthropic-kompatibler Endpoint** (Zylon) — Zero-Friction-Anbindung bestehender Frameworks.
4. **SIEM-Audit-Export + „no-monitoring"-Haltung** (Zylon + nele.ai) — Enterprise/Betriebsrat.

## D.6 Quellen (Anhang D)
**meinGPT:** meingpt.com/en · meingpt.com/en/pricing · meingpt.com/en/security · docs.meingpt.com/de/{privacy-security,integrations,admin-guide}. *(SaaS, proprietär; selbst-hostbar nur DataVault + private LLMs.)*
**nele.ai:** nele.ai/en · /en/functions · /en/functions/information-for-administrators/{knowledge-bases,ai-models,groups,content-filter} · /en/ai-security · /en/ai-pricing. *(SaaS, proprietär; Self-Host nur als Sales-Paket.)*
**Zylon/PrivateGPT:** zylon.ai · zylon.ai/deployment-options · zylon.ai/platform/{workspace,api-gateway,ai-core} · github.com/zylon-ai/private-gpt (Apache-2.0, 57,3k★, v1.0.0 03.06.2026). *(Open-Core: OSS API-Layer + kommerzielle Plattform.)*

---

## Quellen

**Langdock** (alle Juni 2026 abgerufen):
langdock.com · langdock.com/security · langdock.com/pricing · langdock.com/changelog · docs.langdock.com · docs.langdock.com/llms.txt · …/chat/functionalities · …/models-and-limits/models · …/chat/tools/web-search · …/chat/tools/knowledge-folders · …/chat/tools/company-knowledge · …/agents/introduction · …/agents/configuration · …/agents/subagents · …/skills/introduction · …/integrations/integration-directory · …/integrations/mcp-directory · …/guides/integrations/mcp/mcp · …/guides/integrations/mcp/langdock-agent-mcp-server · …/integrations/a2a-protocol · …/workflows/introduction · …/developer/overview/api-introduction · …/developer/agents-api/agent · …/developer/knowledge-folder-api/search-knowledge-folder · …/developer/integrations-api/integrations-overview · …/developer/audit-logs-api/intro-to-audit-logs-api · …/admin/workspace/permissions · …/admin/workspace/workspace-setup · …/admin/security/saml · …/admin/security/scim · …/admin/billing/pricing · …/admin/compliance-and-governance/legal-compliance

**Paperclip** (Repo `github.com/paperclipai/paperclip`, Branch `master`/`HEAD`, Juni 2026):
README.md · cli/package.json · cli/src/adapters/registry.ts · cli/src/adapters/http/index.ts · cli/src/commands/routines.ts · cli/src/commands/heartbeat-run.ts · cli/src/commands/client/{skills,approval,activity,secrets,plugin,agent,issue}.ts · doc/SPEC.md · doc/PRODUCT.md · doc/TASKS.md · doc/DATABASE.md · doc/plans/2026-03-14-budget-policies-and-enforcement.md · doc/plans/2026-03-13-company-import-export-v2.md · doc/plans/2026-05-26-skills-cli-catalog-contract.md · doc/plugins/PLUGIN_AUTHORING_GUIDE.md · .agents/skills/create-agent-adapter/SKILL.md · adapter-plugin.md · api.github.com/repos/paperclipai/paperclip/releases · paperclip.ing

**Verifikations-Lücken (siehe auch §0):** Langdock Trust-Center-PDFs (SOC2/ISO-Zertifikate, Sub-Processor-Liste), exakter Cloud-Provider, „Zero-Retention"-Garantie, exakte Seat-Preise — client-rendered/nicht direkt lesbar. Paperclip: echtes Drizzle-Schema (`packages/db/`), `server/`, `ui/` **nicht öffentlich** → Datenmodell = dokumentierte Absicht; Skill-`input_schema` nicht gefunden; dynamische Dritt-Adapter-Registrierung (`feat/external-adapter-phase1`) zum gelesenen Commit unfertig; Stars/letztes Commit-Datum via API nicht abrufbar.

---

> **Nächster Schritt:** Bitte beantworte Q1–Q8 (oben). Erst nach deiner Freigabe beginne ich mit M0.
> Ich baue nichts eigenständig.
