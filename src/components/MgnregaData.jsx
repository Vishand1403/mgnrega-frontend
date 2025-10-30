// src/components/MgnregaData.jsx
import { useEffect, useMemo, useState } from "react";

const RESOURCE_ID = "8f9b7a76-8f55-4f24-bfc1-54b24c23e9d3";

export default function MgnregaData() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters
  const [stateFilter, setStateFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const API_KEY = import.meta.env.VITE_DATA_GOV_KEY;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // fetch a reasonable number (you can increase limit)
        const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?format=json&limit=200&api-key=${API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setRecords(json.records || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Fetch error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [API_KEY]);

  // compute unique states and months for filter dropdowns
  const states = useMemo(() => {
    const s = new Set(records.map((r) => r.state_name).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [records]);

  const months = useMemo(() => {
    const m = new Set(records.map((r) => r.month_name).filter(Boolean));
    return ["All", ...Array.from(m).sort()];
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (stateFilter && stateFilter !== "All" && r.state_name !== stateFilter)
        return false;
      if (monthFilter && monthFilter !== "All" && r.month_name !== monthFilter)
        return false;
      return true;
    });
  }, [records, stateFilter, monthFilter]);

  if (loading) return <p className="text-center py-6">Loading MGNREGA data...</p>;
  if (error) return <p className="text-center py-6 text-red-600">Error: {error}</p>;

  return (
    <section className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold text-center mb-4">
        MGNREGA Monthly Performance (sample)
      </h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4">
        <div>
          <label className="block text-sm mb-1">State</label>
          <select
            value={stateFilter || "All"}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Month</label>
          <select
            value={monthFilter || "All"}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            onClick={() => {
              setStateFilter("All");
              setMonthFilter("All");
            }}
            className="mt-4 sm:mt-6 bg-gray-200 px-3 py-2 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead className="bg-green-700 text-white">
            <tr>
              <th className="p-2 text-left">State</th>
              <th className="p-2 text-left">District</th>
              <th className="p-2 text-left">Month</th>
              <th className="p-2 text-right">Households Worked</th>
              <th className="p-2 text-right">Person-Days</th>
              <th className="p-2 text-right">Wages Paid</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  No records match the filters.
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b even:bg-gray-50 hover:bg-green-50 transition`}
                >
                  <td className="p-2">{row.state_name}</td>
                  <td className="p-2">{row.district_name}</td>
                  <td className="p-2">{row.month_name}</td>
                  <td className="p-2 text-right">{row.no_of_hh_worked || "-"}</td>
                  <td className="p-2 text-right">{row.total_persondays_gen || "-"}</td>
                  <td className="p-2 text-right">{row.total_wages_paid || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm mt-3 text-gray-600">
        Showing {filtered.length} of {records.length} records (sample).
      </p>
    </section>
  );
}
