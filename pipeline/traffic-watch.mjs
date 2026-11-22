// Traffic watch: finds scrapers in the site's traffic and challenges them in Vercel's firewall, so they stop costing ISR
// writes (every page a scraper opens that isn't cached is drawn and stored again). Runs every few hours
// (.github/workflows/traffic-watch.yml).
//
// A scraper network is one (an ASN: an ISP or a hosting company) whose page requests miss the cache by the hundred
// while its visitors never run the site's script: real browsers send a Web Analytics beacon (…/view) for the pages
// they open, scrapers fetching HTML don't. Norwegian ISPs always send beacons, so they're never flagged. Rate limits
// can't catch these scrapers: they spread their requests over thousands of home IPs, a few each (RCN, Nov 2026: 6,200
// uncached player pages in two days, at most 23 requests an IP, not one beacon).
//
// What it does:
//   - flags new scraper networks: adds them to one firewall rule, "auto: scraper networks" (Challenge: a browser
//     check real visitors pass and scrapers don't) and opens a GitHub issue for each (label scraper-network), with
//     the numbers. The open issues are the list: closing one takes its network out of the rule on the next run;
//     labelling it not-a-scraper as well keeps it from being flagged again.
//   - lets networks go again: one challenged for 30 days without a single request since is taken out, its issue closed.
//   - keeps a per-IP rate limit, "auto: page rate limit per IP": more than 60 full page loads a minute from one IP get
//     429 (not the client-side navigations and prefetches, which carry an RSC header, nor files).
//   - warns when the ISR writes of the last hours are far above the week's (an issue labelled isr-spike; none while
//     one is open), with the networks missing the cache most, for a scraper the beacon test doesn't catch (one that
//     runs the script, or is spread over many networks). A deploy, which starts the cache afresh, can set it off too.
//
// Usage: node traffic-watch.mjs [--dry-run] [--challenge <AS number>]
//   --dry-run: report what it would do, change nothing. --challenge: flag that network now, whatever its traffic.
// The scraper rule keeps condition groups added to it by hand (a user agent pattern, say), so other challenges can live
// in it rather than in rules of their own.
// Env: VERCEL_TOKEN (an access token for the team, allowed to read observability and change the firewall),
//      VERCEL_TEAM_ID, VERCEL_PROJECT_ID; GITHUB_TOKEN and GITHUB_REPOSITORY (set in Actions) for the issues.

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? (args[args.indexOf(name) + 1] ?? "") : null);
const DRY = args.includes("--dry-run");
const { VERCEL_TOKEN, VERCEL_TEAM_ID: TEAM, VERCEL_PROJECT_ID: PROJECT, GITHUB_TOKEN, GITHUB_REPOSITORY: REPO } = process.env;
if (!VERCEL_TOKEN || !TEAM || !PROJECT) throw new Error("Set VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID");
if (!DRY && (!GITHUB_TOKEN || !REPO)) throw new Error("Set GITHUB_TOKEN and GITHUB_REPOSITORY (or use --dry-run)");

/** The hours looked at each run (the workflow runs every 3, so each hour is seen twice) */
const WINDOW_HOURS = 6;
/** Uncached page requests in the window from one network before it can be flagged */
const MIN_MISSES = 150;
/** Beacons per page request below which a network's visitors don't run the script */
const MAX_BEACON_RATIO = 0.01;
/** Days a challenged network must stay away before it's let go */
const QUIET_DAYS = 30;
/** ISR writes in the window, against the week's average for as many hours, that count as a spike, and the least */
const SPIKE_FACTOR = 3;
const SPIKE_MIN_UNITS = 15000;
/** Never flagged: Google, Microsoft, Apple and Meta, whose link-preview and other fetchers may not name themselves */
const NEVER = new Set(["15169", "8075", "714", "32934"]);

const SCRAPER_RULE = "auto: scraper networks";
const RATE_RULE = "auto: page rate limit per IP";
const RATE_RULE_VALUE = {
  name: RATE_RULE,
  description: "Kept by pipeline/traffic-watch.mjs: more than 60 full page loads a minute from one IP get 429",
  active: true,
  conditionGroup: [
    {
      conditions: [
        { type: "path", op: "pre", value: "/_next/", neg: true },
        { type: "path", op: "re", value: "\\.[A-Za-z0-9]+$", neg: true },
        { type: "header", key: "rsc", op: "ex", neg: true },
      ],
    },
  ],
  action: { mitigate: { action: "rate_limit", rateLimit: { algo: "fixed_window", window: 60, limit: 60, keys: ["ip"], action: "rate_limit" } } },
};
const LABEL = { scraper: "scraper-network", allowed: "not-a-scraper", spike: "isr-spike" };

// ---- Vercel ----

async function vercel(method, path, body) {
  const url = new URL(`https://api.vercel.com${path}`);
  url.searchParams.set("teamId", TEAM);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vercel ${method} ${path}: ${res.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();

/** An observability query's totals per group (the summary over the whole range) */
async function query(metric, { aggregation = "sum", filter, groupBy = [], from, to = new Date().toISOString(), limit = 500 }) {
  // Vercel refuses a query that could return more than 250,000 rows (time buckets × limit), as the 30 days of
  // firewall hits in hours (720 × 500) do. Longer ranges are asked in days: only the summary is read, and it's the
  // same, but for the range being widened to whole days.
  const hours = (Date.parse(to) - Date.parse(from)) / 3600_000;
  const json = await vercel("POST", "/v2/observability/query", {
    metric,
    aggregation,
    scope: { type: "project", ownerId: TEAM, projectIds: [PROJECT] },
    startTime: from,
    endTime: to,
    granularity: hours * limit <= 250_000 ? { hours: 1 } : { days: 1 },
    ...(filter && { filter }),
    ...(groupBy.length && { groupBy }),
    limit,
  });
  const rows = (json.result ?? json).summary ?? [];
  const valueKey = (row) => Object.keys(row).find((k) => k.startsWith("vercel_"));
  return rows.map((row) => ({ ...row, value: Number(row[valueKey(row)] ?? 0) }));
}

/** Page requests, uncached ones and beacons per network over the window, not counting verified bots */
async function networks() {
  const from = hoursAgo(WINDOW_HOURS);
  const pages = await query("vercel.request.count", {
    filter: "bot_name eq '' and startswith(route, '/[lang]')",
    groupBy: ["asn_id", "asn", "cache_result"],
    from,
  });
  const beacons = await query("vercel.request.count", { filter: "endswith(route, '/view')", groupBy: ["asn_id"], from });
  const byAsn = new Map();
  const get = (id, name = "") => {
    if (!byAsn.has(id)) byAsn.set(id, { asn: id, name, pages: 0, misses: 0, beacons: 0 });
    const n = byAsn.get(id);
    if (name && !n.name) n.name = name;
    return n;
  };
  for (const row of pages) {
    if (!row.asn_id) continue;
    const n = get(row.asn_id, row.asn_name);
    n.pages += row.value;
    if (row.cache_result === "MISS") n.misses += row.value;
  }
  for (const row of beacons) if (row.asn_id) get(row.asn_id).beacons += row.value;
  return [...byAsn.values()].sort((a, b) => b.misses - a.misses);
}

const describe = (n) => `AS${n.asn} ${n.name || "(no name)"}: ${n.misses} uncached of ${n.pages} page requests, ${n.beacons} beacons`;

async function firewallRules() {
  const config = await vercel("GET", `/v1/security/firewall/config/active?projectId=${PROJECT}`);
  return config?.rules ?? [];
}

async function patchFirewall(change) {
  if (DRY) return console.log(`[dry run] firewall ${change.action}`, JSON.stringify(change.value ?? change.id));
  await vercel("PATCH", `/v1/security/firewall/config?projectId=${PROJECT}`, change);
}

const isAsnGroup = (group) => group.conditions.length === 1 && group.conditions[0].type === "geo_as_number";

/** Makes the scraper rule challenge exactly these networks. Its other condition groups (added by hand, e.g. a user
 * agent pattern: the groups are alternatives) are kept; without networks or other groups the rule is removed. */
async function setScraperRule(rules, asns) {
  const rule = rules.find((r) => r.name === SCRAPER_RULE);
  const groups = rule?.conditionGroup ?? [];
  const others = groups.filter((g) => !isAsnGroup(g));
  const current = [groups.find(isAsnGroup)?.conditions[0].value ?? []].flat().map(String);
  const want = [...asns].map(String).sort((a, b) => a - b);
  if (rule?.active && JSON.stringify(current.sort((a, b) => a - b)) === JSON.stringify(want)) return;
  if (!want.length && !others.length) return rule && patchFirewall({ action: "rules.remove", id: rule.id, value: null });
  const value = {
    name: SCRAPER_RULE,
    description: "Kept by pipeline/traffic-watch.mjs from the open scraper-network issues; close an issue to let its network in",
    active: true,
    conditionGroup: [...(want.length ? [{ conditions: [{ type: "geo_as_number", op: "inc", value: want }] }] : []), ...others],
    action: { mitigate: { action: "challenge" } },
  };
  await patchFirewall(rule ? { action: "rules.update", id: rule.id, value } : { action: "rules.insert", id: null, value });
}

// ---- GitHub ----

async function github(method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    body: body && JSON.stringify(body),
  });
  if (method === "POST" && path === "/labels" && res.status === 422) return null; // already there
  if (!res.ok) throw new Error(`GitHub ${method} ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function issues(label, state = "all") {
  if (!GITHUB_TOKEN || !REPO) return [];
  const list = await github("GET", `/issues?labels=${label}&state=${state}&per_page=100`);
  return list.filter((i) => !i.pull_request);
}

const asnOf = (issue) => issue.title.match(/\bAS(\d+)\b/)?.[1];
const hasLabel = (issue, name) => issue.labels.some((l) => (l.name ?? l) === name);

async function openIssue(title, body, labels) {
  if (DRY) return console.log(`[dry run] issue: ${title}\n${body}\n`);
  for (const name of labels) await github("POST", "/labels", { name });
  await github("POST", "/issues", { title, body, labels });
}

async function closeIssue(issue, comment) {
  if (DRY) return console.log(`[dry run] close #${issue.number}: ${comment}`);
  await github("POST", `/issues/${issue.number}/comments`, { body: comment });
  await github("PATCH", `/issues/${issue.number}`, { state: "closed", state_reason: "completed" });
}

// ---- The run ----

const rules = await firewallRules();
const all = await issues(LABEL.scraper);
const open = all.filter((i) => i.state === "open");
const challenged = new Set(open.map(asnOf).filter(Boolean));
const allowed = new Set(all.filter((i) => hasLabel(i, LABEL.allowed)).map(asnOf).filter(Boolean));
// Networks other rules already stop (the scraper rule is rebuilt from the issues, so it doesn't count)
const elsewhere = new Set(
  rules
    .filter((r) => r.active && r.name !== SCRAPER_RULE)
    .flatMap((r) => r.conditionGroup.flatMap((g) => g.conditions))
    .filter((c) => c.type === "geo_as_number" && !c.neg)
    .flatMap((c) => [c.value].flat().map(String)),
);

// New scraper networks
const seen = await networks();
for (const n of seen.slice(0, 15)) console.log(describe(n));
const flagged = seen.filter(
  (n) =>
    n.misses >= MIN_MISSES &&
    n.beacons <= n.pages * MAX_BEACON_RATIO &&
    !NEVER.has(n.asn) &&
    !allowed.has(n.asn) &&
    !challenged.has(n.asn) &&
    !elsewhere.has(n.asn),
);
// By hand: --challenge <AS number> (e.g. to move a network from a rule of its own to this one)
const byHand = option("--challenge")?.replace(/^AS/i, "");
if (byHand && !challenged.has(byHand) && !flagged.some((n) => n.asn === byHand)) {
  flagged.push({ ...(seen.find((n) => n.asn === byHand) ?? { asn: byHand, name: "", pages: 0, misses: 0, beacons: 0 }), byHand: true });
}
for (const n of flagged) {
  console.log(`Flagged: ${describe(n)}`);
  challenged.add(n.asn);
  await openIssue(
    `Scraper network AS${n.asn} (${n.name || "no name"}) challenged`,
    [
      n.byHand
        ? `Added by hand (\`--challenge AS${n.asn}\`). In the last ${WINDOW_HOURS} hours it made ${n.pages} page requests, ${n.misses} of them uncached, and sent ${n.beacons} analytics beacons.`
        : `In the last ${WINDOW_HOURS} hours, AS${n.asn} (${n.name || "no name"}) made **${n.pages}** page requests, **${n.misses}** of them uncached (each an ISR write), and sent **${n.beacons}** analytics beacons: its visitors don't run the site's script, so it's a scraper, not people.`,
      `It's now in the firewall rule "${SCRAPER_RULE}" (Challenge). It's let in again after ${QUIET_DAYS} days without a request.`,
      [
        `- **Not a scraper?** Add the label \`${LABEL.allowed}\` and close this issue: the next run takes it out of the rule and won't flag it again.`,
        `- Close it without the label to let it in now; it's flagged again if it comes back the same way.`,
      ].join("\n"),
      "_Opened by pipeline/traffic-watch.mjs._",
    ].join("\n\n"),
    [LABEL.scraper],
  );
}

// Networks quiet for long enough
const ruleId = rules.find((r) => r.name === SCRAPER_RULE)?.id;
if (ruleId) {
  const hits = await query("vercel.firewall_action.count", {
    filter: `waf_rule_id eq '${ruleId}'`,
    groupBy: ["asn_id"],
    from: hoursAgo(QUIET_DAYS * 24),
  });
  const active = new Set(hits.filter((h) => h.value > 0).map((h) => String(h.asn_id)));
  for (const issue of open) {
    const asn = asnOf(issue);
    const age = (Date.now() - Date.parse(issue.created_at)) / 86400_000;
    if (!asn || age < QUIET_DAYS || active.has(asn)) continue;
    console.log(`Quiet for ${QUIET_DAYS} days: AS${asn}`);
    challenged.delete(asn);
    await closeIssue(issue, `No requests from AS${asn} in ${QUIET_DAYS} days: taken out of "${SCRAPER_RULE}".`);
  }
}

await setScraperRule(rules, challenged);

// The per-IP rate limit
const rateRule = rules.find((r) => r.name === RATE_RULE);
if (!rateRule) {
  try {
    await patchFirewall({ action: "rules.insert", id: null, value: RATE_RULE_VALUE });
  } catch (error) {
    // The rest of the run still goes ahead
    console.error(`Couldn't add "${RATE_RULE}": ${error.message}`);
    process.exitCode = 1;
  }
}

// ISR write spike
const [recent] = await query("vercel.isr_operation.write_units", { from: hoursAgo(WINDOW_HOURS) });
const [week] = await query("vercel.isr_operation.write_units", { from: hoursAgo(7 * 24 + WINDOW_HOURS), to: hoursAgo(WINDOW_HOURS) });
const usual = ((week?.value ?? 0) / (7 * 24)) * WINDOW_HOURS;
console.log(`ISR writes: ${recent?.value ?? 0} in the last ${WINDOW_HOURS} hours, ${Math.round(usual)} usual`);
// One issue at a time: while it's open, later runs stay quiet (close it once it's dealt with)
if ((recent?.value ?? 0) >= SPIKE_MIN_UNITS && (recent?.value ?? 0) >= usual * SPIKE_FACTOR && !(await issues(LABEL.spike, "open")).length) {
  const body = [
    `ISR write units in the last ${WINDOW_HOURS} hours: **${recent.value}**, against **${Math.round(usual)}** for as many hours over the past week.`,
    "Networks with the most uncached page requests (and their beacons; few beacons means a scraper, many means people):",
    seen
      .slice(0, 10)
      .map((n) => `- ${describe(n)}`)
      .join("\n"),
    "_Opened by pipeline/traffic-watch.mjs._",
  ].join("\n\n");
  await openIssue("ISR writes far above usual", body, [LABEL.spike]);
}
