export const dynamic = 'force-dynamic'; // always fetch fresh

type Row = Record<string, string>;

function parseCSV(text: string) {
  // Simple CSV parser for this demo (no quoted commas)
  const lines = text.trim().split(/\r?\n/);
  const headers = (lines.shift() || "").split(",").map(h => h.trim());
  const rows: Row[] = lines.map(line => {
    const cells = line.split(",");
    const obj: Row = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  });
  return { headers, rows };
}

async function getSheetData() {
  const baseUrl = process.env.SHEET_CSV_URL;
  if (!baseUrl) return null;

  const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status}`);
  }
  const csv = await res.text();
  return parseCSV(csv);
}

export default async function BvAPage() {
  const data = await getSheetData();

  return (
    <main style={{ padding: 24, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <header style={{ marginBottom: 16 }}>
        <a href="/" style={{ textDecoration: "none", fontSize: 14 }}>&larr; Home</a>
      </header>

      <h1 style={{ fontSize: 24, marginBottom: 8 }}>BvA (Google Sheets Demo)</h1>
      <p style={{ marginBottom: 16, color: "#374151" }}>
        Edit your Google Sheet and <strong>refresh</strong> this page to see new values.
      </p>

      {!data ? (
        <div
          style={{
            padding: 16,
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: 8,
            color: "#92400E",
            maxWidth: 640,
          }}
        >
          <strong>Missing config:</strong> Set <code>SHEET_CSV_URL</code> in <code>.env.local</code>, e.g.:<br />
          <code>SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/…/export?format=csv&amp;gid=…</code>
        </div>
      ) : (
        <>
          <div style={{ margin: "12px 0" }}>
            <strong>Rows loaded:</strong> {data.rows.length}
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead style={{ background: "#f9fafb" }}>
                <tr>
                  {data.headers.map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, idx) => (
                  <tr key={idx}>
                    {data.headers.map((h) => (
                      <td
                        key={h}
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid #f1f5f9",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
                          fontSize: 13,
                        }}
                      >
                        {r[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}


