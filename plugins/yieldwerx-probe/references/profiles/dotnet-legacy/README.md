# Profile: dotnet-legacy — the shipped yieldWerx platform

Load this profile when the work targets the production yieldWerx codebase:
ASP.NET MVC 5 on .NET Framework 4.7.2, Entity Framework 6, SQL Server, the
WinForms desktop application, and the Windows-service analytics engines.

**Source of these facts:** the yieldWerx knowledgebase handbook, third edition —
chiefly Chapter 7 (architecture), Chapter 8 (desktop application and reports),
and Appendix C (known gaps). Architecture and trap facts below are cited there.
Anything marked `TODO(repo)` could not be verified against the source
repository from here and must be confirmed on first use — then written back
into this profile, because a profile a skill cannot trust is worse than none.

## Commands

Profiles never hardcode a command. Resolve every one from `probe.config.yaml`;
an absent key is reported unavailable, never guessed.

| Purpose | `probe.config.yaml` key |
| --- | --- |
| Build the web application | `commands.build` |
| Build the desktop application | `commands.buildDesktop` |
| Run the web application locally | `commands.appStart` |
| Developer-owned tests | `commands.unitTests` |
| One test class / filtered run | `commands.unitTestsFiltered` |
| Lint / static analysis | `commands.lintCode` (report unavailable if unset — the platform predates a configured linter) |
| Database migration apply | `commands.dbMigrate` |
| Database migration verification | `commands.dbMigrateVerify` |

`TODO(repo)`: solution file name, MSBuild vs. `dotnet build` invocation, and
whether a test project exists per module — confirm and record here.

## Layer architecture

Four tiers (handbook §7.1):

```
Client       browser UI (ASP.NET MVC) · WinForms desktop app · Power BI reports
Application  Trisoft.yieldWerx.Web — one controller per module
             (CLM, PAT, SWM, GDBN, SPC, AMG, LG, SBYL, Reports, Dashboard)
             Controller → BL (business logic) Service → DL (data logic) Service → Repository
Engines      UploadService (folder watcher → parsers → business controllers)
             BrokerService (JobCard fan-out) → independent engine services
             (PAT, MVPAT, SWM, GDBN, SPC, AMG, LG, SBYL), each with its own
             in-memory AJobQueue: PreToDo() → ToDo() → PostToDo()
Data         one SQL Server database: 294 tables, 934+ stored procedures,
             29 views, centered on LOT / WAFER / BIN_SUMMARY / TEST_PARAM_MAP,
             plus per-device dynamic tables created at runtime
```

Cross-cutting stack (handbook §7.2): EF6 as ORM — **mostly Code-First, but the
CLM module uses an older EDMX model**; Dapper for hand-written complex queries;
SignalR 2.4.1 for real-time SPC push; RDotNet bridging to R for SPC statistics;
Castle Windsor (dependency injection); AutoMapper (DTO mapping); Log4Net
(logging); Highcharts (server-rendered charts); custom LinqToStdf fork (STDF
parsing).

Background Windows services that change state with no user action (§7.5):
AutomaticReportGeneration, DataDeletionAndMaintenance, FloatingLicenseService,
YWImageService, LotGenealogyService, FileArchivingService. A design that touches
data these services read or delete must account for them.

## Conventions

- A new capability in the web application lands as the full chain for its
  module: controller action → BL service → DL service → repository, with DTO
  mapping through AutoMapper and dependencies registered in Castle Windsor.
  A fragment (a controller calling a repository directly) is not native code.
- Engine work follows the JobCard model (§7.4): work arrives as
  `{JobId, QueueId, Event (RecordType), Wafer{...}}`; a targeted re-run is a
  JobCard with a specific `RecordType`, never a bypass of the queue.
- **Join on sequences, not IDs** (§7.6): human-readable `Lot_ID`/`Wafer_ID` are
  for people; queries join on `Lot_Sequence` and `Wafer_Sequence`. A query
  joining downstream tables on `Lot_ID` is a defect pattern, not a style choice.
- Every WinForms control an automated test must reach carries a developer-set
  `Name` property — that is this stack's selector policy. The compiler drops
  unset names from the executable, and identification then degrades to class +
  caption + index, which breaks silently. Authority:
  [`../testcomplete-winforms/rules/name-mapping-policy.md`](../testcomplete-winforms/rules/name-mapping-policy.md).

## Test conventions

Appendix C records **no unit tests on the main web controllers** — coverage is
built outward from the highest-risk controllers, not assumed. `TODO(repo)`:
confirm the test framework (MSTest/NUnit/xUnit) and project layout before
authoring; do not scaffold a framework the solution does not already use
without recording the decision.

## Search anchors

- **Which layer?** is always the first diagnostic question (§7.1). Locate the
  symptom on the journey-of-a-file map (§7.3) — everything downstream of the
  broken step is wrong, everything upstream innocent.
- **Engine behavior:** read that engine's Log4Net log *before* forming theories
  (§7.7) — the logs are the per-service flight recorder.
- **A data value:** start `SELECT Lot_Sequence FROM LOT WHERE Lot_ID = '…'`
  and join downstream on the sequence (§7.6).
- **A report number:** the report header (lot, wafer count, average yield,
  pass count) reconciles against `WAFER` / `BIN_SUMMARY` before any chart is
  trusted (§8.2).

## Traps

Each is symptom → mechanism, from the handbook's own lists:

- **CLM schema drift** — CLM misbehaves after a model change → the module uses
  EDMX while the rest is Code-First; the two data-access styles desynchronize
  (§7.2).
- **SignalR races** — SPC updates wrong/missing under concurrent uploads →
  real-time push racing engine writes (§7.2).
- **R-bridge mismatches** — SPC numbers differ between screens → R and SQL
  compute the same statistic separately via RDotNet (§7.2).
- **Silently unmapped fields** — a DTO field is always default → AutoMapper
  maps by convention and skips what does not match, without error (§7.2).
- **Upload ≠ processed** — a report generated seconds after upload predates
  engine results → the Broker dispatches asynchronously; upload success and
  engine completion are different moments (§7.7).
- **Retest ambiguity** — numbers change after a wafer re-arrives → the same
  physical wafer can be tested more than once; `Merge` combines passes, and
  which pass wins is a standing edge-case source (§7.7).
- **Dynamic tables** — a query works on one deployment and not another →
  per-device tables are created at runtime by stored procedure; the schema is
  not closed (§7.7).
- **Two SPC paths** — a fix works in one client and not the other → a legacy
  WCF SPC path is alive alongside the Web API path; both must be tested for
  equivalence (Appendix C).
- **CLM expiry not enforced** — expired custom-limit versions keep applying →
  `ExpiryDate` is stored but not enforced (known gap G-17, Appendix C); treat
  as a known bug in test runs, not a new find.
