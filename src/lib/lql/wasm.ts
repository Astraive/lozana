// LQL WASM bindings — compiles LQL to SQL in the browser
// For MVP, we compile client-side using a simple implementation
// that mirrors the Rust LQL compiler's output

export function compileToDuckDB(input: string): string {
  // Parse the LQL pipeline and compile to DuckDB SQL
  const lines = input.trim().split("|").map((s) => s.trim());
  let sql = "";
  let selectCols = "*";
  const whereClauses: string[] = [];
  let groupBy: string[] = [];
  let orderBy = "";
  let limit = "";
  let table = "events";

  for (const line of lines) {
    const parts = line.split(/\s+/);
    const keyword = parts[0].toLowerCase();

    switch (keyword) {
      case "from":
        table = parts[1] || "events";
        break;

      case "where": {
        const expr = line.substring(6).trim();
        whereClauses.push(compileWhereExpr(expr));
        break;
      }

      case "summarize": {
        const summarizeBody = line.substring(10).trim();
        const byIndex = summarizeBody.toLowerCase().indexOf(" by ");
        const aggStr = byIndex >= 0 ? summarizeBody.substring(0, byIndex) : summarizeBody;
        const byStr = byIndex >= 0 ? summarizeBody.substring(byIndex + 4).trim() : "";

        selectCols = compileAggregations(aggStr);
        if (byStr) {
          groupBy = byStr.split(",").map((s) => escapeIdent(s.trim()));
        }
        break;
      }

      case "sort":
      case "order": {
        const field = parts[1] || "ts";
        const dir = (parts[2] || "desc").toUpperCase();
        orderBy = `${escapeIdent(field)} ${dir}`;
        break;
      }

      case "limit":
      case "take":
        limit = parts[1] || "100";
        break;

      case "project":
      case "select":
        selectCols = parts.slice(1).join(",").split(",").map((s) => escapeIdent(s.trim())).join(", ");
        break;

      case "timeseries": {
        const interval = parts[1] || "5m";
        const minutes = parseDurationMinutes(interval);
        selectCols = `date_trunc('minute', ts) - (extract(minute FROM ts)::int % ${minutes}) * interval '1 minute' AS time_bucket, COUNT(*) AS count`;
        groupBy = ["time_bucket"];
        orderBy = "time_bucket ASC";
        break;
      }
    }
  }

  sql = `SELECT ${selectCols} FROM "${table}"`;
  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(" AND ")}`;
  }
  if (groupBy.length > 0) {
    sql += ` GROUP BY ${groupBy.join(", ")}`;
  }
  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`;
  }
  if (limit) {
    sql += ` LIMIT ${limit}`;
  }

  return sql;
}

function escapeSQLString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/'/g, "''");
}

function compileWhereExpr(expr: string): string {
  // Handle simple field = "value" and field op value patterns
  // And/Or are handled by splitting
  return expr
    .replace(/\band\b/gi, "AND")
    .replace(/\bor\b/gi, "OR")
    .replace(/\bnot\b/gi, "NOT")
    .replace(/(\w+(?:\.\w+)*)\s*=\s*"([^"]*)"/g, (_, field, value) => {
      if (field.includes(".")) {
        return `json_extract_string(raw, '$.${field}') = '${escapeSQLString(value)}'`;
      }
      return `${escapeIdent(field)} = '${escapeSQLString(value)}'`;
    })
    .replace(/(\w+(?:\.\w+)*)\s*=\s*(\d+(?:\.\d+)?)/g, (_, field, value) => {
      if (field.includes(".")) {
        return `CAST(json_extract_string(raw, '$.${field}') AS DOUBLE) = ${value}`;
      }
      return `${escapeIdent(field)} = ${value}`;
    })
    .replace(/(\w+(?:\.\w+)*)\s*>\s*(\d+(?:\.\d+)?)/g, (_, field, value) => {
      if (field.includes(".")) {
        return `CAST(json_extract_string(raw, '$.${field}') AS DOUBLE) > ${value}`;
      }
      return `${escapeIdent(field)} > ${value}`;
    })
    .replace(/(\w+(?:\.\w+)*)\s*<\s*(\d+(?:\.\d+)?)/g, (_, field, value) => {
      if (field.includes(".")) {
        return `CAST(json_extract_string(raw, '$.${field}') AS DOUBLE) < ${value}`;
      }
      return `${escapeIdent(field)} < ${value}`;
    })
    .replace(/(\w+(?:\.\w+)*)\s+has\s+"([^"]*)"/gi, (_, field, value) => {
      if (field.includes(".")) {
        return `json_extract_string(raw, '$.${field}') LIKE '%${escapeSQLString(value)}%'`;
      }
      return `${escapeIdent(field)} LIKE '%${escapeSQLString(value)}%'`;
    })
    .replace(/(\w+(?:\.\w+)*)\s+contains\s+"([^"]*)"/gi, (_, field, value) => {
      if (field.includes(".")) {
        return `json_extract_string(raw, '$.${field}') LIKE '%${escapeSQLString(value)}%'`;
      }
      return `${escapeIdent(field)} LIKE '%${escapeSQLString(value)}%'`;
    })
    .replace(/(\w+(?:\.\w+)*)\s+startswith\s+"([^"]*)"/gi, (_, field, value) => {
      if (field.includes(".")) {
        return `json_extract_string(raw, '$.${field}') LIKE '${escapeSQLString(value)}%'`;
      }
      return `${escapeIdent(field)} LIKE '${escapeSQLString(value)}%'`;
    })
    .replace(/(\w+(?:\.\w+)*)\s+endswith\s+"([^"]*)"/gi, (_, field, value) => {
      if (field.includes(".")) {
        return `json_extract_string(raw, '$.${field}') LIKE '%${escapeSQLString(value)}'`;
      }
      return `${escapeIdent(field)} LIKE '%${escapeSQLString(value)}'`;
    })
    .replace(/\bago\((\d+)(h|m|s|d|w)\)/gi, (_, num, unit) => {
      const unitMap: Record<string, string> = { h: "HOUR", m: "MINUTE", s: "SECOND", d: "DAY", w: "DAY" };
      const multiplier = unit === "w" ? 7 : 1;
      return `NOW() - INTERVAL '${parseInt(num) * multiplier}' ${unitMap[unit] || "MINUTE"}`;
    });
}

function compileAggregations(aggStr: string): string {
  return aggStr
    .split(",")
    .map((agg) => {
      agg = agg.trim();
      // Handle alias = func() syntax
      const eqMatch = agg.match(/^(\w+)\s*=\s*(.+)$/);
      if (eqMatch) {
        const alias = eqMatch[1];
        const func = compileSingleAgg(eqMatch[2].trim());
        return `${func} AS ${escapeIdent(alias)}`;
      }
      return compileSingleAgg(agg);
    })
    .join(", ");
}

function compileSingleAgg(agg: string): string {
  agg = agg.trim().toLowerCase();
  if (agg === "count()" || agg === "count(*)") return "COUNT(*)";
  if (agg.startsWith("count(")) {
    const arg = agg.slice(6, -1).trim();
    if (arg === "*") return "COUNT(*)";
    return `COUNT(${escapeIdent(arg)})`;
  }
  if (agg.startsWith("avg(")) return `AVG(${escapeIdent(agg.slice(4, -1))})`;
  if (agg.startsWith("sum(")) return `SUM(${escapeIdent(agg.slice(4, -1))})`;
  if (agg.startsWith("min(")) return `MIN(${escapeIdent(agg.slice(4, -1))})`;
  if (agg.startsWith("max(")) return `MAX(${escapeIdent(agg.slice(4, -1))})`;
  if (agg.startsWith("p50(")) return `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${escapeIdent(agg.slice(4, -1))})`;
  if (agg.startsWith("p95(")) return `PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${escapeIdent(agg.slice(4, -1))})`;
  if (agg.startsWith("p99(")) return `PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${escapeIdent(agg.slice(4, -1))})`;
  if (agg.startsWith("dcount(")) return `COUNT(DISTINCT ${escapeIdent(agg.slice(7, -1))})`;
  return agg;
}

function escapeIdent(name: string): string {
  if (name === "*") return "*";
  if (name.includes(".") && !name.startsWith("json_")) {
    return `json_extract_string(raw, '$.${name}')`;
  }
  return `"${name}"`;
}

function parseDurationMinutes(s: string): number {
  const match = s.match(/^(\d+)(h|m|s|d|w)$/);
  if (!match) return 5;
  const num = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s": return Math.max(1, Math.floor(num / 60));
    case "m": return num;
    case "h": return num * 60;
    case "d": return num * 1440;
    case "w": return num * 10080;
    default: return num;
  }
}
