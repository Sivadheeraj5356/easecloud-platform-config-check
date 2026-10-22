// Platform/data config QA for cloud + data stacks: reviews pasted config lines
// from Terraform, dbt, Airbyte, Docker and CI files for the mistakes that bite
// in production - hardcoded secrets, public access, unpinned versions, latest
// tags and wildcard selects. Heuristic review of pasted lines. Pure functions.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlatformConfigCheck = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function parseLines(input) {
    const rows = [];
    const skipped = [];
    input.split('\n').forEach((raw, i) => {
      const line = raw.trim();
      if (!line) return;
      const p = raw.split('|').map((s) => s.trim());
      if (p.length >= 2 && p[0]) rows.push({ file: p[0], text: p.slice(1).join(' | '), line: i + 1 });
      else skipped.push(i + 1);
    });
    return { rows, skipped };
  }

  function check(input) {
    const { rows, skipped } = typeof input === 'string' ? parseLines(input) : input;
    const findings = [];
    const push = (level, code, text) => findings.push({ level, code, text });

    rows.forEach((r) => {
      if (/(password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9][A-Za-z0-9_\-\/+]{5,}/i.test(r.text))
        push('error', 'HARDCODED_SECRET_HINT', `Line ${r.line} (${r.file}): looks like a credential literal in config - verify it moves to a secrets manager or env var before this reaches production.`);
      if (/public[_-]?(access|read|policy)\s*[:=]?\s*["']?true/i.test(r.text) || /acl\s*=\s*"public/i.test(r.text))
        push('error', 'PUBLIC_ACCESS_HINT', `Line ${r.line} (${r.file}): public access appears enabled - verify this bucket/dataset is meant to be public; it usually is not.`);
      if (/version\s*[:=]\s*["']?(latest|\*)/i.test(r.text) || /:\s*["']?(>=\s*0|\*)\s*["']?\s*$/.test(r.text))
        push('warn', 'UNPINNED_VERSION', `Line ${r.line} (${r.file}): dependency/version appears unpinned - verify a pinned version so deploys are reproducible.`);
      if (/image\s*[:=]\s*["']?\S+:latest\b/i.test(r.text))
        push('warn', 'LATEST_TAG', `Line ${r.line} (${r.file}): container image uses :latest - verify a pinned tag so rollbacks and audits stay possible.`);
      if (/select\s+\*/i.test(r.text))
        push('warn', 'WILDCARD_SELECT', `Line ${r.line} (${r.file}): SELECT * in a model - verify the column list; wildcard selects break quietly when sources change.`);
    });

    const sqlRows = rows.filter((r) => /\.sql\b/i.test(r.file));
    if (sqlRows.length && !rows.some((r) => /\btest|assert|not_null|unique\b/i.test(r.text)))
      push('warn', 'MODELS_WITHOUT_TESTS', `${sqlRows.length} SQL model file(s) pasted with no test/assertion config anywhere - verify dbt tests exist elsewhere; models without tests drift silently.`);
    if (rows.some((r) => /sync|pipeline|airbyte|etl/i.test(r.file + ' ' + r.text)) && !rows.some((r) => /retry|backoff/i.test(r.text)))
      push('warn', 'NO_RETRY_HINT', 'Pipeline/sync config has no retry/backoff hint - verify transient-failure handling is configured somewhere.');
    if (skipped.length) push('warn', 'UNPARSED', `Line(s) ${skipped.join(', ')} skipped - expected file | config-line.`);
    if (rows.length && !findings.some((f) => f.level !== 'ok'))
      push('ok', 'CONFIG_CLEAN', `${rows.length} config line(s) passed these heuristics - line-level pattern screen only; see Limitations.`);
    return { findings, stats: { rows: rows.length, files: new Set(rows.map((r) => r.file)).size } };
  }
  return { parseLines, check };
});
