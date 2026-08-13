import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { createDashboard, DashboardError } from "../../business/listings.js";
import { createAnalytics, AnalyticsError } from "../../business/listings.js";
import { createReports, encodeReportCsv, ReportsError } from "../../business/listings.js";

const now = new Date("2026-08-04T12:00:00.000Z");
const calls = [];
const db = { all: async (sql, parameters) => { calls.push({ sql, parameters }); return { results: [] }; } };
const logs = [];
const logger = { info: (message, metadata) => logs.push({ message, metadata }) };
const owner = { userId: "user_1234567890123456", correlationId: "corr-1" };
const admin = { ...owner, capabilities: ["management.dashboard.global", "management.analytics.global", "management.reports.global"] };
const dashboard = createDashboard({ db, logger, clock: () => now });
const analytics = createAnalytics({ db, logger, clock: () => now });
const reports = createReports({ db, logger, clock: () => now });
const range = { from: "2026-07-01T00:00:00.000Z", to: "2026-08-01T00:00:00.000Z" };

test.beforeEach(() => { calls.length = 0; logs.length = 0; });
const rejects = (promise, ErrorType, code) => assert.rejects(promise, (error) => error instanceof ErrorType && error.code === code);

test("Dashboard: proprietário autenticado recebe somente agregados próprios", async () => {
  await dashboard.get({ scope: "owner", periodDays: 30, indicators: ["listings", "contacts"] }, owner);
  assert.equal(calls.length, 2); assert.equal(calls[0].parameters[0], owner.userId);
});
test("Dashboard: usuário ausente é negado", () => rejects(dashboard.get({ scope: "owner", indicators: ["listings"] }), DashboardError, "UNAUTHENTICATED"));
test("Dashboard: payload não pode solicitar proprietário cruzado", () => rejects(dashboard.get({ scope: "owner", ownerId: "other", indicators: ["listings"] }, owner), DashboardError, "INVALID_INPUT"));
test("Dashboard: visão administrativa autorizada", async () => assert.equal((await dashboard.get({ scope: "admin", periodDays: 7, indicators: ["listings"] }, admin)).scope, "admin"));
test("Dashboard: visão administrativa negada", () => rejects(dashboard.get({ scope: "admin", indicators: ["listings"] }, owner), DashboardError, "FORBIDDEN"));
test("Dashboard: período válido usa UTC", async () => assert.equal((await dashboard.get({ scope: "owner", periodDays: 90, indicators: ["listings"] }, owner)).period.timezone, "UTC"));
test("Dashboard: período inválido é rejeitado", () => rejects(dashboard.get({ scope: "owner", periodDays: 0, indicators: ["listings"] }, owner), DashboardError, "INVALID_PERIOD"));
test("Dashboard: período excessivo é rejeitado", () => rejects(dashboard.get({ scope: "owner", periodDays: 365, indicators: ["listings"] }, owner), DashboardError, "INVALID_PERIOD"));
test("Dashboard: indicador desconhecido é rejeitado", () => rejects(dashboard.get({ scope: "owner", indicators: ["users"] }, owner), DashboardError, "INVALID_INDICATOR"));
test("Dashboard: resposta é agregada e sem PII", async () => { const value = JSON.stringify(await dashboard.get({ scope: "owner", indicators: ["contacts"] }, owner)); assert.doesNotMatch(value, /sender_|message|phone|email/i); });
test("Dashboard: SQL é parametrizado, limitado e determinístico", async () => { await dashboard.get({ scope: "owner", indicators: ["contacts"] }, owner); assert.match(calls[0].sql, /\?/); assert.match(calls[0].sql, /ORDER BY/); assert.match(calls[0].sql, /LIMIT \?/); });

test("Analytics: métrica válida", async () => assert.equal((await analytics.query({ metric: "listings_by_status", scope: "owner" }, owner)).metric, "listings_by_status"));
test("Analytics: métrica desconhecida", () => rejects(analytics.query({ metric: "sql", scope: "owner" }, owner), AnalyticsError, "INVALID_INPUT"));
test("Analytics: granularidades dia, semana e mês são válidas", async () => { for (const granularity of ["day", "week", "month"]) await analytics.query({ metric: "contacts_over_time", scope: "owner", granularity, ...range }, owner); assert.equal(calls.length, 3); });
test("Analytics: granularidade desconhecida", () => rejects(analytics.query({ metric: "contacts_over_time", scope: "owner", granularidade: "hour", ...range }, owner), AnalyticsError, "INVALID_INPUT"));
test("Analytics: período máximo é aplicado", () => rejects(analytics.query({ metric: "contacts_over_time", scope: "owner", granularity: "day", from: "2024-01-01", to: "2026-01-01" }, owner), AnalyticsError, "INVALID_PERIOD"));
test("Analytics: limite de pontos é aplicado", () => rejects(analytics.query({ metric: "contacts_over_time", scope: "owner", granularity: "day", limit: 101, ...range }, owner), AnalyticsError, "INVALID_LIMIT"));
test("Analytics: limite de grupos é aplicado", () => rejects(analytics.query({ metric: "leads_by_status", scope: "owner", limit: 21 }, owner), AnalyticsError, "INVALID_LIMIT"));
test("Analytics: ownership vem do contexto", async () => { await analytics.query({ metric: "leads_by_status", scope: "owner" }, owner); assert.equal(calls[0].parameters[0], owner.userId); });
test("Analytics: RBAC administrativo vem do contexto", () => rejects(analytics.query({ metric: "listings_by_status", scope: "admin", isAdmin: true }, owner), AnalyticsError, "FORBIDDEN"));
test("Analytics: filtro desconhecido é rejeitado", () => rejects(analytics.query({ metric: "leads_by_status", scope: "owner", filters: { column: "id" } }, owner), AnalyticsError, "INVALID_INPUT"));
test("Analytics: SQL é parametrizado, limitado e ordenado", async () => { await analytics.query({ metric: "contacts_over_time", scope: "owner", granularity: "month", ...range }, owner); assert.match(calls[0].sql, /ORDER BY point ASC LIMIT \?/); assert.equal(calls[0].parameters.at(-1), 100); });
test("Analytics: campos de SQL livre são rejeitados", () => rejects(analytics.query({ metric: "leads_by_status", scope: "owner", groupBy: "notes; DROP TABLE leads" }, owner), AnalyticsError, "INVALID_INPUT"));
test("Analytics: financeiro próprio não expõe referência externa", async () => { await analytics.query({ metric: "payments_by_status", scope: "owner" }, owner); assert.doesNotMatch(calls[0].sql, /external_reference|SELECT \*/i); });

test("Reports: tipo válido em JSON", async () => assert.deepEqual((await reports.generate({ type: "owner_listings", format: "json", ...range }, owner)).data, []));
test("Reports: tipo desconhecido", () => rejects(reports.generate({ type: "contacts", format: "json", ...range }, owner), ReportsError, "INVALID_TYPE"));
test("Reports: CSV UTF-8 tem BOM e cabeçalhos fixos", async () => assert.match((await reports.generate({ type: "owner_leads", format: "csv", ...range }, owner)).content, /^\uFEFF"id","status","created_at","updated_at"/));
test("Reports: formato inválido", () => rejects(reports.generate({ type: "owner_leads", format: "pdf", ...range }, owner), ReportsError, "INVALID_FORMAT"));
test("Reports: ownership e acesso cruzado", async () => { await reports.generate({ type: "owner_payments", format: "json", ...range }, owner); assert.equal(calls[0].parameters[0], owner.userId); await rejects(reports.generate({ type: "owner_payments", format: "json", ownerId: "other", ...range }, owner), ReportsError, "INVALID_TYPE"); });
test("Reports: relatório administrativo é protegido", () => rejects(reports.generate({ type: "admin_listing_summary", format: "json", ...range }, owner), ReportsError, "FORBIDDEN"));
test("Reports: limite de linhas", () => rejects(reports.generate({ type: "owner_leads", format: "json", limit: 501, ...range }, owner), ReportsError, "INVALID_LIMIT"));
test("Reports: limite de período", () => rejects(reports.generate({ type: "owner_leads", format: "json", from: "2020-01-01", to: "2026-01-01" }, owner), ReportsError, "INVALID_PERIOD"));
test("Reports: CSV escapa aspas e normaliza quebra de linha", () => assert.equal(encodeReportCsv(["value"], [{ value: "a\"b\r\nc" }]), "\uFEFF\"value\"\r\n\"a\"\"b\nc\""));
for (const prefix of ["=", "+", "-", "@", "\t", "\r"]) test(`Reports: formula injection neutraliza ${JSON.stringify(prefix)}`, () => assert.match(encodeReportCsv(["value"], [{ value: `${prefix}cmd` }]), /"'[^\"]+cmd"/));
test("Reports: projeção exclui PII e referência financeira externa", async () => { await reports.generate({ type: "owner_payments", format: "json", ...range }, owner); assert.doesNotMatch(calls[0].sql, /email|phone|notes|message|external_reference|SELECT \*/i); });
test("Reports: logs não contêm relatório ou CSV", async () => { await reports.generate({ type: "owner_leads", format: "csv", ...range }, owner); assert.doesNotMatch(JSON.stringify(logs), /content|SELECT|created_at/); });
test("Reports: ordenação é determinística", async () => { await reports.generate({ type: "owner_listings", format: "json", ...range }, owner); assert.match(calls[0].sql, /ORDER BY created_at DESC, id DESC LIMIT \?/); });

test("Arquitetura: módulos são isolados, injetados e não usam recursos proibidos", async () => {
  for (const name of ["Dashboard.js", "Analytics.js", "Reports.js"]) {
    const source = await readFile(new URL('../../business/listings.js', import.meta.url), "utf8");
    assert.doesNotMatch(source, /process\.env|AI\.js|provider de IA/i);
    assert.match(source, /createDashboard|createAnalytics|createReports/);
  }
});
test("Arquitetura: somente a expansão 13A existe e recursos futuros permanecem ausentes", async () => {
  const migrations = await readdir(new URL("../../database/migrations/", import.meta.url));
  const modules = ['Dashboard.js', 'Analytics.js', 'Reports.js'];
  assert.deepEqual(migrations.sort(), ["0001_initial_schema.sql", "0002_payment_event_ordering.sql", "0003_city_publication_state.sql"]);
  assert.equal(modules.includes("AI.js"), false); assert.equal(modules.includes("Publish.js"), false); assert.equal(modules.includes("Seo.js"), false);
});
