import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";


/**
 * App.jsx - MGNREGA Tamil Nadu Dashboard
 * - Fetches from backend: http://127.0.0.1:8000/get_data
 * - Supports All Years (2018-2019 → 2024-2025) aggregation or single year selection
 * - Shows summary cards, insights, chart, table, and district modal
 */

const YEARS = [
  "All",
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
  "2019-2020",
  "2018-2019",
];

const API_BASE = "https://mgnrega-backend-icrp.onrender.com/get_data";


// Helper - safe number parser (handles "12,345", null, strings, etc.)
const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/,/g, "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
};

export default function App() {
  // states
  const [data, setData] = useState([]); // grouped district-level data used in chart/table
  const [rawRecords, setRawRecords] = useState([]); // optional raw rows if needed
  const [loading, setLoading] = useState(false);
  const [isTamil, setIsTamil] = useState(false);

  const [year, setYear] = useState("All");
  const [stateName, setStateName] = useState("TAMIL NADU");
  const [districtFilter, setDistrictFilter] = useState("");

  const [insights, setInsights] = useState({
    totalHouseholds: 0,
    totalPersondays: 0,
    totalExpenditure: 0,
    avgHouseholds: 0,
    topDistrict: "N/A",
    lowDistrict: "N/A",
  });

  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // debounce for district input
  const districtTimer = useRef(null);

  // Main fetch function: supports year = 'All' or single FY
  const fetchData = async (opts = {}) => {
    // opts can include yearOverride and districtOverride
    const yearOverride = opts.yearOverride ?? year;
    const districtOverride = opts.districtOverride ?? districtFilter;
    setLoading(true);

    try {
      // Helper to call backend for a specific fin_year
      const fetchForYear = async (fin_year) => {
        const params = new URLSearchParams();
        if (stateName) params.append("state_name", stateName.toUpperCase());
        if (fin_year && fin_year !== "All") params.append("fin_year", fin_year);
        if (districtOverride) params.append("district_name", districtOverride.toUpperCase());
        const url = `${API_BASE}?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Fetch failed ${res.status} ${res.statusText} ${txt}`);
        }
        const json = await res.json();
        // backend returns { data: [...] } OR [...]
        return json?.data || json || [];
      };

      let allRows = [];

      if (yearOverride === "All") {
        // fetch each year sequentially (backend should return filtered rows)
        const yearsToFetch = YEARS.filter((y) => y !== "All");
        for (const y of yearsToFetch) {
          try {
            const rows = await fetchForYear(y);
            if (rows && rows.length) allRows.push(...rows);
          } catch (e) {
            console.warn(`year ${y} fetch failed:`, e.message || e);
          }
        }
      } else {
        // single year
        const rows = await fetchForYear(yearOverride);
        if (rows && rows.length) allRows.push(...rows);
      }
     
            // save rawRecords (optional)
      setRawRecords(allRows);

      // ✅ Normalize records and group by district_name
      const normalized = allRows.map((r) => {
        const district_raw = r.district_name || r.District || "";
        const district_clean = String(district_raw).trim();
        return {
          district_name: district_clean.toUpperCase(),
          district_display: district_clean,
          state_name: r.state_name || stateName,
          fin_year: r.fin_year || "—",
          month: r.month || "—",
          Approved_Labour_Budget: toNumber(r.Approved_Labour_Budget),
          Average_Wage_rate_per_day_per_person: toNumber(r.Average_Wage_rate_per_day_per_person),
          Average_days_of_employment_provided_per_Household: toNumber(r.Average_days_of_employment_provided_per_Household),
          Total_Households_Worked: toNumber(r.Total_Households_Worked),
          Total_Individuals_Worked: toNumber(r.Total_Individuals_Worked),
          Total_Exp: toNumber(r.Total_Exp),
          Wages: toNumber(r.Wages),
        };
      });

      // ✅ Filter valid districts
      const filtered = normalized.filter(
        (x) => x.district_name && x.district_name.length > 0
      );

      // ✅ Group by district
      const grouped = filtered.reduce((acc, cur) => {
        const key = cur.district_name;
        if (!acc[key]) {
          acc[key] = { ...cur };
        } else {
          acc[key].Approved_Labour_Budget += cur.Approved_Labour_Budget;
          acc[key].Average_Wage_rate_per_day_per_person += cur.Average_Wage_rate_per_day_per_person;
          acc[key].Average_days_of_employment_provided_per_Household += cur.Average_days_of_employment_provided_per_Household;
          acc[key].Total_Households_Worked += cur.Total_Households_Worked;
          acc[key].Total_Individuals_Worked += cur.Total_Individuals_Worked;
          acc[key].Total_Exp += cur.Total_Exp;
          acc[key].Wages += cur.Wages;
        }
        return acc;
      }, {});

      let finalArray = Object.values(grouped);

      // ✅ Apply visible district filter
      if (districtFilter && districtFilter.trim().length > 0) {
        const df = districtFilter.trim().toUpperCase();
        finalArray = finalArray.filter((d) =>
          d.district_name.includes(df)
        );
      }

      // ✅ Sort by Total_Exp (descending)
      finalArray.sort((a, b) => b.Total_Exp - a.Total_Exp);

      // ✅ Set final data
      setData(finalArray);

      // ✅ Compute insights
      const totalHouseholds = finalArray.reduce(
        (s, x) => s + toNumber(x.Total_Households_Worked),
        0
      );
      const totalExp = finalArray.reduce(
        (s, x) => s + toNumber(x.Total_Exp),
        0
      );
      const avgHouseholds = finalArray.length
        ? Math.round(totalHouseholds / finalArray.length)
        : 0;
      const topDistrict = finalArray.length
        ? finalArray[0].district_display
        : "N/A";
      const lowDistrict = finalArray.length
        ? finalArray[finalArray.length - 1].district_display
        : "N/A";

      setInsights({
        totalHouseholds,
        totalPersondays: 0,
        totalExpenditure: totalExp,
        avgHouseholds,
        topDistrict,
        lowDistrict,
      });
    } catch (err) {
      console.error("FetchData error:", err);
    } finally {
      setLoading(false);
    }
  };
  // 🌍 Auto detect user's district/state on page load
useEffect(() => {
  async function detectLocation() {
    try {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported in this browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log("📍 Location detected:", latitude, longitude);

        // 🆕 Added language=en to always get English output
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
        );
        const data = await res.json();

        let stateNameDetected = data.address?.state?.toUpperCase() || "";
        let districtNameDetected =
          data.address?.state_district ||
          data.address?.county ||
          data.address?.region ||
          "";

        // 🧹 Normalize district name
        districtNameDetected = districtNameDetected
          .replace(/district/gi, "")
          .replace(/north|south|east|west|division/gi, "")
          .trim()
          .toUpperCase();

        console.log("✅ Auto detected cleaned:", stateNameDetected, districtNameDetected);

        if (stateNameDetected) setStateName(stateNameDetected);
        if (districtNameDetected) {
          setDistrictFilter(districtNameDetected);
          // 🔄 Auto-refresh data once detected
          fetchData({
            yearOverride: year,
            districtOverride: districtNameDetected,
          });
        }
      });
    } catch (err) {
      console.error("❌ Error detecting location:", err);
    }
  }

  detectLocation();
}, []);




    // Auto-fetch data on mount or when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, stateName]);

  // Small helpers for UI
  const totalDistricts = data.length;
  const topChartData = data.slice(0, 10).map((d) => ({
    district_name: d.district_display,
    Total_Persondays_Generated: toNumber(d.Total_Persondays_Generated),
  }));

  // ✅ UI Render
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", background: "#f7f9fb", minHeight: "100vh" }}>
      {/* 🔹 Header */}
<div
  style={{
    background: "#073b6b",
    color: "white",
    padding: "26px 16px 12px 16px",
    boxShadow: "0 3px 0 #f0b429 inset",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <img
    src="/tamilnadu_emblem.svg"
    alt="Tamil Nadu Emblem"
    style={{ height: 80, marginBottom: 10 }}
  />
  <h1
    style={{
      margin: "6px 0 0 0",
      fontSize: 30,
      fontWeight: 700,
      textAlign: "center",
    }}
  >
    {isTamil
      ? "எம்.ஜி.என்.ஆர்.இ.ஜி.ஏ - மாவட்ட தரவு பார்வையாளர்"
      : "🌾 MGNREGA Tamil Nadu Dashboard"}
  </h1>

  <button
    onClick={() => setIsTamil((s) => !s)}
    style={{
      marginTop: 10,
      padding: "8px 16px",
      borderRadius: 6,
      background: "#0a4a80",
      color: "white",
      border: "none",
      cursor: "pointer",
    }}
  >
    {isTamil ? "English" : "தமிழ்"}
  </button>
</div>


      {/* 🔸 Filters */}
      <div style={{ padding: "18px 26px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Year:</strong>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: 10, borderRadius: 8 }}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => fetchData({ yearOverride: year })}
          style={{ padding: "10px 14px", borderRadius: 8, background: "#003366", color: "white", border: "none", cursor: "pointer" }}
        >
          {isTamil ? "புதுப்பி" : "Refresh"}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#666" }}>{isTamil ? "மாவட்டத்தைத் தேடவும்" : "District:"}</span>
          <input
            value={districtFilter}
            onChange={(e) => {
              const v = e.target.value;
              setDistrictFilter(v);
              if (districtTimer.current) clearTimeout(districtTimer.current);
              districtTimer.current = setTimeout(() => {
                fetchData({ yearOverride: year, districtOverride: v });
              }, 450);
            }}
            placeholder={isTamil ? "மாவட்டத்தை உள்ளிடவும் (செயற்கை)" : "Enter district (optional)"}
            style={{ padding: 10, borderRadius: 8 }}
          />
        </div>
      </div>

      {/* 🔹 Summary Cards */}
      <div style={{ padding: "8px 26px 24px 26px", display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <div style={{ background: "#e8f4ff", padding: 18, borderRadius: 12, minWidth: 220, textAlign: "center" }}>
          <div style={{ color: "#003366", fontWeight: 600 }}>{isTamil ? "மொத்த குடும்பங்கள்" : "Total Households Worked"}</div>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{insights.totalHouseholds?.toLocaleString() ?? 0}</div>
        </div>
        <div style={{ background: "#f0fff5", padding: 18, borderRadius: 12, minWidth: 220, textAlign: "center" }}>
          <div style={{ color: "#006644", fontWeight: 600 }}>{isTamil ? "சராசரி per மாவட்டம்" : "Average Worked"}</div>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{insights.avgHouseholds?.toLocaleString() ?? 0}</div>
        </div>
        <div style={{ background: "#fff7e6", padding: 18, borderRadius: 12, minWidth: 220, textAlign: "center" }}>
          <div style={{ color: "#cc6600", fontWeight: 600 }}>{isTamil ? "மேல்தரமான மாவட்டம்" : "Top District"}</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{insights.topDistrict}</div>
        </div>
        <div style={{ background: "#ffe9ea", padding: 18, borderRadius: 12, minWidth: 220, textAlign: "center" }}>
          <div style={{ color: "#990000", fontWeight: 600 }}>{isTamil ? "குறைந்த மாவட்டம்" : "Lowest District"}</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{insights.lowDistrict}</div>
        </div>
      </div>

      {/* 📊 Bar Chart */}
<div style={{ width: "95%", margin: "12px auto 28px auto" }}>
  {loading ? (
    <div style={{ textAlign: "center", padding: 30 }}>Loading...</div>
  ) : data.length === 0 ? (
    <div style={{ textAlign: "center", padding: 30, color: "#666" }}>
      {isTamil ? "தரவு இல்லை" : "No data available."}
    </div>
  ) : (
    <div style={{ background: "white", padding: 14, borderRadius: 12 }}>
      <h3 style={{ color: "#003366", textAlign: "center" }}>
        {isTamil ? "மாவட்ட வாரியாக மொத்த செலவுகள்" : "District-wise Total Expenditure (Top 10)"}
      </h3>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data.slice(0, 10)}>
          <XAxis dataKey="district_name" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip formatter={(v) => Number(v).toLocaleString()} />
          <Legend />
         <Bar dataKey="Total_Exp" name="Total Expenditure (₹ Lakhs)">
  {data.slice(0, 10).map((entry, index) => {
    let fillColor = "#4A90E2"; // default light blue
    if (index === 0) fillColor = "#FF4C4C"; // top 1 → red
    else if (index === 1) fillColor = "#00C49F"; // top 2 → green
    else if (index === 2) fillColor = "#FFD700"; // top 3 → gold
    return <Cell key={`cell-${index}`} fill={fillColor} />;
  })}
</Bar>


        </BarChart>
      </ResponsiveContainer>
    </div>
  )}
</div>

{/* 🧾 Table */}
<div style={{ width: "95%", margin: "10px auto 40px auto", background: "white", borderRadius: 12, padding: 16 }}>
  <table style={{ width: "100%", borderCollapse: "collapse" }}>
    <thead>
      <tr style={{ background: "#082c4a", color: "white" }}>
        <th style={{ padding: "12px 10px" }}>District</th>
        <th style={{ padding: "12px 10px" }}>Approved Labour Budget</th>
        <th style={{ padding: "12px 10px" }}>Avg Wage Rate</th>
        <th style={{ padding: "12px 10px" }}>Avg Employment Days</th>
        <th style={{ padding: "12px 10px" }}>Households Worked</th>
        <th style={{ padding: "12px 10px" }}>Individuals Worked</th>
        <th style={{ padding: "12px 10px" }}>Total Expenditure (₹ Lakhs)</th>
        <th style={{ padding: "12px 10px" }}>Wages (₹ Lakhs)</th>
      </tr>
    </thead>
    <tbody>
      {data.map((row, idx) => (
        <tr
          key={row.district_name + "-" + idx}
          onClick={() => setSelectedDistrict(row)}
          style={{
            cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
            background: idx % 2 === 0 ? "#fff" : "#fbfdff",
          }}
        >
          <td style={{ padding: "10px" }}>{row.district_name}</td>
          <td style={{ padding: "10px" }}>{row.Approved_Labour_Budget}</td>
          <td style={{ padding: "10px" }}>{row.Average_Wage_rate_per_day_per_person}</td>
          <td style={{ padding: "10px" }}>{row.Average_days_of_employment_provided_per_Household}</td>
          <td style={{ padding: "10px" }}>{row.Total_Households_Worked}</td>
          <td style={{ padding: "10px" }}>{row.Total_Individuals_Worked}</td>
          <td style={{ padding: "10px" }}>{row.Total_Exp}</td>
          <td style={{ padding: "10px" }}>{row.Wages}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


      {/* 🪟 District Modal */}
      {selectedDistrict && (
        <div
          onClick={() => setSelectedDistrict(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 680, maxWidth: "92%", background: "white", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, color: "#073b6b" }}>{selectedDistrict.district_display}</h2>
              <button onClick={() => setSelectedDistrict(null)} style={{ background: "#eee", border: "none", padding: 8, borderRadius: 8, cursor: "pointer" }}>Close</button>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <p><b>State:</b> {selectedDistrict.state_name}</p>
                <p><b>Financial Years:</b> {(selectedDistrict.fin_years || []).join(", ")}</p>
                <p><b>Months:</b> {(selectedDistrict.months || []).join(", ")}</p>
                <p><b>Total Households Worked:</b> {(selectedDistrict.Total_Households_Worked || 0).toLocaleString()}</p>
                <p><b>Total Persondays Generated:</b> {(selectedDistrict.Total_Persondays_Generated || 0).toLocaleString()}</p>
                <p><b>Total Expenditure (₹):</b> {(selectedDistrict.Total_Exp || 0).toLocaleString()}</p>
              </div>

              <div style={{ flex: 1 }}>
                <h4 style={{ marginTop: 0 }}>Sample rows (latest 3)</h4>
                {(selectedDistrict.samples || []).slice(-3).reverse().map((s, i) => (
                  <div key={i} style={{ background: "#f7f9fb", padding: 8, borderRadius: 6, marginBottom: 8 }}>
                    <div><b>FY:</b> {s.fin_year}</div>
                    <div><b>Month:</b> {s.month || "—"}</div>
                    <div><b>Households:</b> {(s.Total_Households_Worked || 0).toLocaleString()}</div>
                    <div><b>Persondays:</b> {(s.Total_Persondays_Generated || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟦 Footer */}
      <footer style={{ textAlign: "center", padding: 22, background: "#073b6b", color: "white", marginTop: 40 }}>
        <div>Developed for Citizens — Our Work, Our Right</div>
      </footer>
    </div>
  );
}
