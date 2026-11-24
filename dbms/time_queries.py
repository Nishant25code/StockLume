#!/usr/bin/env python3
"""
StockLume · dbms/time_queries.py
Times every query in dbms/04_queries.sql (CP4).

  createdb stocklume
  psql -d stocklume -f dbms/03_schema.sql
  psql -d stocklume -f dbms/seed_for_timings.sql
  python3 dbms/time_queries.py stocklume

For each query: PREPARE it exactly as written in 04_queries.sql, then run
EXPLAIN (ANALYZE, BUFFERS) EXECUTE ... with real ids from the demo data,
3 times, each run in a fresh psql session. WRITE queries run inside
BEGIN ... ROLLBACK, so the data never changes between runs.
Writes:  dbms/plans/<ID>.txt  (raw plans of the 3 runs)
         dbms/plans/summary.csv
"""
import csv, os, re, subprocess, sys

DB = sys.argv[1] if len(sys.argv) > 1 else "stocklume"
RUNS = 3
HERE = os.path.dirname(os.path.abspath(__file__))
PLANS = os.path.join(HERE, "plans")


def psql(sql):
    r = subprocess.run(["psql", "-d", DB, "-X", "-q", "-A", "-t", "-F", "|", "-v", "ON_ERROR_STOP=1"],
                       input=sql, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"psql failed:\n{sql}\n{r.stderr}")
    return r.stdout


# ---- 1. queries from 04_queries.sql -----------------------------------
text = open(os.path.join(HERE, "04_queries.sql")).read()
parts = re.split(r"^-- ((?:R|W)\d+) -- (READ|WRITE)\s*$", text, flags=re.M)
queries = {}
for i in range(1, len(parts), 3):
    qid, kind, body = parts[i], parts[i + 1], parts[i + 2]
    lines = [l for l in body.split("\n") if l.strip().startswith("--")]
    desc = lines[0].lstrip("- ").strip() if lines else ""
    sql = "\n".join(l for l in body.split("\n") if not l.strip().startswith("--")).strip().split(";")[0]
    queries[qid] = (kind, desc, sql)

# ---- 2. real ids from the demo data ------------------------------------
LOOKUP = """
WITH r AS (SELECT id FROM businesses WHERE name = 'Retail Store 1'),
     w AS (SELECT id FROM businesses WHERE name = 'Wholesaler 2')
SELECT 'R', (SELECT id FROM r)::text
UNION ALL SELECT 'W', (SELECT id FROM w)::text
UNION ALL SELECT 'W_NOT_CONNECTED', (SELECT b.id FROM businesses b WHERE b.type = 'WHOLESALER'
      AND NOT EXISTS (SELECT 1 FROM business_connections c WHERE c.retailer_id = (SELECT id FROM r) AND c.wholesaler_id = b.id)
      ORDER BY b.name LIMIT 1)::text
UNION ALL SELECT 'C', (SELECT c.id FROM business_connections c WHERE c.retailer_id = (SELECT id FROM r) AND c.wholesaler_id = (SELECT id FROM w))::text
UNION ALL SELECT 'P', (SELECT i.product_id FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE i.business_id = (SELECT id FROM r) AND p.wholesaler_id = (SELECT id FROM w) ORDER BY p.name LIMIT 1)::text
UNION ALL SELECT 'INV', (SELECT i.id FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE i.business_id = (SELECT id FROM r) AND p.wholesaler_id = (SELECT id FROM w) ORDER BY p.name LIMIT 1)::text
UNION ALL SELECT 'P_NEW', (SELECT p.id FROM products p WHERE p.wholesaler_id = (SELECT id FROM w) AND p.is_active
      AND NOT EXISTS (SELECT 1 FROM inventory i WHERE i.business_id = (SELECT id FROM r) AND i.product_id = p.id)
      ORDER BY p.name LIMIT 1)::text
UNION ALL SELECT 'O_DRAFT', (SELECT o.id FROM orders o WHERE o.retailer_id = (SELECT id FROM r) AND o.status = 'DRAFT'
      AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
      AND EXISTS (SELECT 1 FROM business_connections c WHERE c.retailer_id = o.retailer_id AND c.wholesaler_id = o.wholesaler_id AND c.status = 'ACTIVE')
      ORDER BY o.order_number LIMIT 1)::text
UNION ALL SELECT 'O_SUBMITTED', (SELECT o.id FROM orders o WHERE o.retailer_id = (SELECT id FROM r) AND o.status = 'SUBMITTED' ORDER BY o.order_number LIMIT 1)::text
UNION ALL SELECT 'O_ACCEPTED', (SELECT o.id FROM orders o WHERE o.retailer_id = (SELECT id FROM r) AND o.status = 'ACCEPTED' ORDER BY o.order_number LIMIT 1)::text
UNION ALL SELECT 'O_DISPATCHED', (SELECT o.id FROM orders o WHERE o.retailer_id = (SELECT id FROM r) AND o.status = 'DISPATCHED' ORDER BY o.order_number LIMIT 1)::text
UNION ALL SELECT 'O_DELIVERED', (SELECT o.id FROM orders o WHERE o.retailer_id = (SELECT id FROM r) AND o.status = 'DELIVERED' ORDER BY o.order_number LIMIT 1)::text
UNION ALL SELECT 'N', (SELECT n.id FROM notifications n WHERE n.business_id = (SELECT id FROM w) AND NOT n.is_read ORDER BY n.created_at DESC LIMIT 1)::text;
"""
ids = dict(line.split("|", 1) for line in psql(LOOKUP).strip().split("\n"))
# the wholesaler / product that go with each sample order
for key in ("O_DRAFT", "O_SUBMITTED", "O_ACCEPTED", "O_DISPATCHED"):
    ids[key + "_W"] = psql(f"SELECT wholesaler_id FROM orders WHERE id = '{ids[key]}';").strip()
ids["P_NOT_IN_DRAFT"] = psql(f"""
SELECT p.id FROM products p JOIN orders o ON o.wholesaler_id = p.wholesaler_id
WHERE o.id = '{ids['O_DRAFT']}' AND p.is_active
  AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = p.id)
ORDER BY p.name LIMIT 1;""").strip()
for k, v in ids.items():
    assert v, f"no sample id for {k}"


def q(k):
    return f"'{ids[k]}'"


R, W, P = q("R"), q("W"), q("P")
NEW_USER = "'00000000-0000-0000-0000-0000000000ff'"
# params for EXECUTE, plus an optional statement run first inside the transaction
PARAMS = {
    "R1": "", "R2": R,
    "W1": "'New Shop', 'RETAILER', 'new@shop.test', '9999999999', 'Delhi'",
    "W2": (f"{NEW_USER}, {R}, 'New Owner', 'new@shop.test'",
           f"INSERT INTO auth.users (id) VALUES ({NEW_USER}); DELETE FROM profiles WHERE business_id = {R};"),
    "R3": R, "R4": W, "R5": R,
    "W3": f"{R}, {q('W_NOT_CONNECTED')}",
    "W4": f"{q('C')}, {W}, 'INACTIVE'",
    "R6": f"{W}, 50, 0", "R7": f"{R}, NULL, NULL, 50, 0", "R8": f"{P}, {R}",
    "W5": f"{W}, 'New Product', 'SKU-NEW-1', 'Grocery', NULL, 99.50, 100",
    "W6": f"{P}, {W}, NULL, NULL, NULL, 499.00, NULL, NULL",
    "W7": f"{P}, {W}",
    "R9": R,
    "W8": f"{R}, {q('P_NEW')}, 25",
    "W9": f"{q('INV')}, {R}, -1",
    "W10": f"{R}, {P}, -1, 10, 'MANUAL_ADJUSTMENT', NULL, NULL, 'count correction', {R}",
    "R10": f"{R}, NULL, 50, 0", "R11": R,
    "W11": f"{R}, {P}, 8, 25, 3",
    "R12": f"{R}, NULL, NULL, NULL, 50, 0",
    "W12": f"{R}, {P}, 1",
    "W13": f"{R}, {P}, 1, NULL, {R}",
    "W14": f"{R}, 7",
    "R13": R, "R14": f"{R}, {P}", "R15": f"{R}, {P}",
    "R16": f"{R}, {W}",
    "W15": f"{R}, {W}, 'restock', true, {R}",
    "W16": f"{q('O_DRAFT')}, {R}",
    "W17": f"{q('O_DRAFT')}, {q('P_NOT_IN_DRAFT')}, 10, NULL, {R}",
    "W18": f"{q('O_DRAFT')}, {R}",
    "R17": f"{R}, NULL, 50, 0", "R18": f"{W}, NULL, 50, 0",
    "R19": f"{q('O_DELIVERED')}, {R}", "R20": q("O_DELIVERED"),
    "W19": f"{q('O_DRAFT')}, {R}",
    "W20": f"{q('O_SUBMITTED')}, {R}",
    "W21": f"{q('O_SUBMITTED')}, {q('O_SUBMITTED_W')}",
    "W22": f"{q('O_SUBMITTED')}, {q('O_SUBMITTED_W')}, 'out of stock'",
    "W23": f"{q('O_ACCEPTED')}, {q('O_ACCEPTED_W')}",
    "W24": f"{q('O_ACCEPTED')}, {q('O_ACCEPTED_W')}",
    "W25": f"{q('O_ACCEPTED')}, {q('O_ACCEPTED_W')}, {q('O_ACCEPTED_W')}",
    "W26": f"{q('O_DISPATCHED')}, {R}",
    "W27": f"{q('O_DISPATCHED')}, {R}",
    "W28": f"{q('O_DISPATCHED')}, {R}, {R}",
    "W29": f"{W}, 'ORDER_SUBMITTED', 'New order', 'A retailer submitted an order', {q('O_SUBMITTED')}, NULL",
    "R21": f"{W}, false, 50, 0", "R22": W,
    "W30": f"{q('N')}, {W}", "W31": W,
    "R23": R, "R24": R, "R25": W,
    "R26": f"{R}, 30", "R27": f"{W}, 30",
    "R28": f"{R}, 5", "R29": f"{W}, 5", "R30": R,
}
assert set(PARAMS) == set(queries), set(queries) ^ set(PARAMS)

SCAN = re.compile(r"(?:Parallel )?(Seq Scan|Index Scan|Index Only Scan|Bitmap Heap Scan|Bitmap Index Scan)"
                  r"(?: Backward)?(?: using ([a-z0-9_]+))? on ([a-z0-9_]+)")


def order_key(qid):
    return (qid[0] != "R", int(qid[1:]))


os.makedirs(PLANS, exist_ok=True)
rows = []
for qid in sorted(queries, key=order_key):
    kind, desc, sql = queries[qid]
    p = PARAMS[qid]
    prelude = ""
    if isinstance(p, tuple):
        p, prelude = p
    execute = f"EXECUTE s({p})" if p else "EXECUTE s"
    times, out = [], []
    for run in range(1, RUNS + 1):
        if kind == "WRITE":
            script = f"PREPARE s AS {sql};\nBEGIN;\n{prelude}\nEXPLAIN (ANALYZE, BUFFERS) {execute};\nROLLBACK;\n"
        else:
            script = f"PREPARE s AS {sql};\nEXPLAIN (ANALYZE, BUFFERS) {execute};\n"
        plan = psql(script).strip()
        out.append(f"=== {qid} run {run} ===\n-- {execute}\n{plan}\n")
        times.append(float(re.search(r"Execution Time: ([0-9.]+)", plan).group(1)))
    open(os.path.join(PLANS, f"{qid}.txt"), "w").write("\n".join(out))
    scans = []
    for m in SCAN.finditer(plan):
        s = f"{m.group(1)}{' using ' + m.group(2) if m.group(2) else ''} on {m.group(3)}"
        if s not in scans:
            scans.append(s)
    avg = sum(times) / RUNS
    rows.append([qid, kind, desc] + [f"{t:.3f}" for t in times] + [f"{avg:.3f}", " | ".join(scans) or "(no scan)"])
    print(f"{qid:4} {kind:5} avg {avg:8.3f} ms  {' | '.join(scans)[:90]}")

with open(os.path.join(PLANS, "summary.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["query_id", "type", "what_it_does", "run1_ms", "run2_ms", "run3_ms", "avg_ms", "scan_nodes"])
    w.writerows(rows)
print("saved dbms/plans/*.txt and dbms/plans/summary.csv")
