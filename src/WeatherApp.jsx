import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

const places = [
  ["Rayachoti", "Andhra Pradesh", 14.05, 78.75], ["Kadapa", "Andhra Pradesh", 14.47, 78.82],
  ["Anantapur", "Andhra Pradesh", 14.68, 77.60], ["Chittoor", "Andhra Pradesh", 13.22, 79.10],
  ["Tirupati", "Andhra Pradesh", 13.63, 79.42], ["Nellore", "Andhra Pradesh", 14.44, 79.99],
  ["Kurnool", "Andhra Pradesh", 15.83, 78.04], ["Guntur", "Andhra Pradesh", 16.31, 80.44],
  ["Bengaluru", "Karnataka", 12.97, 77.59], ["Mysuru", "Karnataka", 12.30, 76.64],
  ["Mangaluru", "Karnataka", 12.87, 74.88], ["Shivamogga", "Karnataka", 13.93, 75.57],
  ["Chennai", "Tamil Nadu", 13.08, 80.27], ["Coimbatore", "Tamil Nadu", 11.02, 76.96],
  ["Madurai", "Tamil Nadu", 9.93, 78.12], ["Thiruvananthapuram", "Kerala", 8.52, 76.94],
  ["Kochi", "Kerala", 9.93, 76.27], ["Kozhikode", "Kerala", 11.26, 75.78],
  ["Hyderabad", "Telangana", 17.39, 78.49], ["Warangal", "Telangana", 17.97, 79.59]
].map(([name, state, lat, lon]) => ({ name, state, lat, lon }));

const models = [
  { id: "ecmwf_ifs025", name: "ECMWF IFS" },
  { id: "gfs_seamless", name: "NOAA GFS" },
  { id: "icon_seamless", name: "DWD ICON" },
  { id: "jma_seamless", name: "JMA GSM" }
];

const panelStyle = { background: "rgba(12, 29, 53, .92)", border: "1px solid rgba(130,180,230,.18)", borderRadius: 18, padding: 16, marginBottom: 16, boxShadow: "0 10px 28px rgba(0,0,0,.16)" };
const selectStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #36516f", background: "#102844", color: "#f4f8ff", margin: "8px 0 14px", fontSize: 15 };
const metricStyle = { background: "linear-gradient(145deg,#173b61,#102844)", border: "1px solid #2d5276", padding: 14, borderRadius: 14, minWidth: 0 };
const muted = { color: "#a9bfd7", fontSize: 12 };

function MapCenter({ place }) {
  const map = useMap();
  useEffect(() => { map.setView([place.lat, place.lon], 7); setTimeout(() => map.invalidateSize(), 150); }, [map, place]);
  return null;
}

function BarChart({ title, values, unit = "mm", color = "#38bdf8" }) {
  const max = Math.max(1, ...values.map(v => Number(v.value) || 0));
  return <div style={{ marginTop: 18 }}>
    <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>{title}</h3>
    <div style={{ display: "flex", alignItems: "stretch", gap: 5, height: 145, overflowX: "auto", paddingBottom: 4 }}>
      {values.map((v, i) => {
        const value = Number(v.value) || 0;
        return <div key={`${v.label}-${i}`} title={`${v.label}: ${value.toFixed(1)} ${unit}`} style={{ minWidth: 20, flex: "1 0 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
          <small style={{ color: "#d9eaff", fontSize: 9, whiteSpace: "nowrap" }}>{value.toFixed(1)}</small>
          <div style={{ height: 88, width: "100%", display: "flex", alignItems: "flex-end", background: "rgba(255,255,255,.05)", borderRadius: "5px 5px 2px 2px", overflow: "hidden" }}>
            <div style={{ width: "100%", height: `${Math.max(value > 0 ? 3 : 0, value / max * 100)}%`, background: color, borderRadius: "5px 5px 0 0" }} />
          </div>
          <small style={{ color: "#9fb7d1", fontSize: 9, whiteSpace: "nowrap" }}>{v.label}</small>
        </div>;
      })}
    </div>
  </div>;
}

function Metric({ label, value, icon, detail }) {
  return <article style={metricStyle}><div style={{ fontSize: 20 }}>{icon}</div><div style={{ ...muted, marginTop: 7 }}>{label}</div><strong style={{ display: "block", fontSize: 19, marginTop: 4, overflowWrap: "anywhere" }}>{value}</strong>{detail && <small style={{ ...muted, display: "block", marginTop: 4 }}>{detail}</small>}</article>;
}

export default function WeatherApp() {
  const [selected, setSelected] = useState("Rayachoti");
  const [mapStyle, setMapStyle] = useState("satellite");
  const [radarOn, setRadarOn] = useState(false);
  const [radarFrame, setRadarFrame] = useState(null);
  const [radarMessage, setRadarMessage] = useState("");
  const [model, setModel] = useState(models[0].id);
  const [weather, setWeather] = useState(null);
  const [modelData, setModelData] = useState({});
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState("");
  const place = places.find(p => p.name === selected) || places[0];

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(""); setWeather(null);
      try {
        const params = new URLSearchParams({
          latitude: String(place.lat), longitude: String(place.lon),
          daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max",
          hourly: "precipitation,precipitation_probability,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,relative_humidity_2m,surface_pressure,cape",
          forecast_days: "7", timezone: "auto"
        });
        const res = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
        if (!res.ok) throw new Error("Forecast provider returned an error");
        const data = await res.json();
        if (active) setWeather(data);
      } catch { if (active) setError("Could not load forecast. Check your internet connection and retry."); }
      finally { if (active) setLoading(false); }
    }
    load(); return () => { active = false; };
  }, [place.lat, place.lon]);

  useEffect(() => {
    let active = true;
    async function loadModels() {
      setModelLoading(true);
      const result = {};
      await Promise.all(models.map(async m => {
        try {
          const params = new URLSearchParams({ latitude: String(place.lat), longitude: String(place.lon), hourly: "precipitation", forecast_days: "7", timezone: "auto", models: m.id });
          const res = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
          if (!res.ok) throw new Error("Unavailable");
          const json = await res.json();
          const rain = json.hourly?.precipitation || [];
          const daily = Array.from({ length: 7 }, (_, i) => ({ label: json.hourly?.time?.[i * 24]?.slice(5, 10) || `D${i + 1}`, value: rain.slice(i * 24, (i + 1) * 24).reduce((a, b) => a + (Number(b) || 0), 0) }));
          result[m.id] = { name: m.name, days: daily, h24: rain.slice(0, 24).reduce((a, b) => a + (Number(b) || 0), 0), h72: rain.slice(0, 72).reduce((a, b) => a + (Number(b) || 0), 0), h168: rain.slice(0, 168).reduce((a, b) => a + (Number(b) || 0), 0) };
        } catch { result[m.id] = { name: m.name, error: true }; }
      }));
      if (active) { setModelData(result); setModelLoading(false); }
    }
    loadModels(); return () => { active = false; };
  }, [place.lat, place.lon]);

  useEffect(() => {
    let active = true;
    async function loadRadar() {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (!res.ok) throw new Error("Radar feed unavailable");
        const data = await res.json();
        const frames = data?.radar?.past || [];
        if (!frames.length) throw new Error("No recent radar frames available");
        if (active) { setRadarFrame(frames[frames.length - 1]); setRadarMessage(`Latest available radar frame: ${new Date(frames[frames.length - 1].time * 1000).toLocaleString()}`); }
      } catch { if (active) setRadarMessage("Radar data is temporarily unavailable. Forecasts remain available."); }
    }
    loadRadar(); return () => { active = false; };
  }, []);

  const activeModel = modelData[model];
  const sevenDayTotal = useMemo(() => weather?.daily?.precipitation_sum?.reduce((sum, n) => sum + (Number(n) || 0), 0) ?? null, [weather]);
  const dailyRain = weather?.daily?.time?.map((day, i) => ({ label: new Date(day + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" }), value: Number(weather.daily.precipitation_sum?.[i]) || 0 })) || [];
  const cumulativeRain = dailyRain.map((d, i) => ({ label: d.label, value: dailyRain.slice(0, i + 1).reduce((sum, x) => sum + x.value, 0) }));
  const hourly = weather?.hourly;
  const currentHour = hourly ? Math.max(0, hourly.time.findIndex(t => new Date(t).getTime() >= Date.now())) : -1;
  const hi = currentHour >= 0 ? currentHour : 0;
  const radarUrl = radarFrame ? `https://tilecache.rainviewer.com${radarFrame.path}/256/{z}/{x}/{y}/2/1_1.png` : "";
  const tileUrl = mapStyle === "satellite" ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const hourValues = (key, count = 24) => (hourly?.[key] || []).slice(hi, hi + count).map((v, i) => ({ label: i % 3 === 0 ? new Date(hourly.time[hi + i]).toLocaleTimeString("en-IN", { hour: "2-digit", hour12: false }) : "", value: Number(v) || 0 }));

  return <main className="app" style={{ maxWidth: 980, margin: "0 auto", padding: "14px", color: "#f2f7ff", minHeight: "100vh", background: "linear-gradient(160deg,#081629,#102b49 60%,#071424)" }}>
    <header className="topbar" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <div className="brand-icon" style={{ fontSize: 34 }}>🌦️</div><div><h1 style={{ margin: 0, fontSize: 23 }}>South India Weather</h1><p style={{ margin: "4px 0 0", color: "#a9bfd7" }}>District Forecast Centre · Free data</p></div>
    </header>
    <section className="hero" style={{ ...panelStyle, background: "radial-gradient(circle at 90% 10%,#215987,#102844 58%,#0b1d33)" }}><span style={{ ...muted, letterSpacing: 2 }}>REGIONAL WEATHER OUTLOOK</span><h2 style={{ fontSize: 25, margin: "8px 0" }}>Know the rain before it arrives.</h2><p style={{ color: "#c3d7ec", margin: 0 }}>Seven-day rainfall totals, model guidance, radar and atmospheric conditions.</p></section>

    <section style={panelStyle}>
      <label htmlFor="district">Select city / district</label><select id="district" style={selectStyle} value={selected} onChange={e => setSelected(e.target.value)}>{places.map(p => <option key={p.name} value={p.name}>{p.name} — {p.state}</option>)}</select>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><div style={muted}>{place.state} · {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°</div><h2 style={{ margin: "4px 0 12px", fontSize: 24 }}>{place.name}</h2></div><span style={{ fontSize: 27 }}>📍</span></div>
      {loading && <p>Loading forecast…</p>}{error && <p style={{ color: "#ffb4a9" }}>{error} <button onClick={() => setSelected(s => s)} style={{ marginLeft: 6 }}>Retry by reselecting location</button></p>}
      {weather?.daily && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9 }}>
          <Metric icon="🌧️" label="Rain today" value={`${Number(weather.daily.precipitation_sum[0] || 0).toFixed(1)} mm`} />
          <Metric icon="💧" label="Rain chance" value={`${weather.daily.precipitation_probability_max?.[0] ?? "—"}%`} />
          <Metric icon="🌡️" label="Max / min" value={`${Math.round(weather.daily.temperature_2m_max[0])}° / ${Math.round(weather.daily.temperature_2m_min[0])}°C`} />
          <Metric icon="🌧️" label="7-day rainfall total" value={`${Number(sevenDayTotal).toFixed(1)} mm`} detail="Sum of the next 7 daily forecasts" />
        </div>
        <BarChart title="Daily precipitation forecast (mm)" values={dailyRain} unit="mm" />
        <BarChart title="Cumulative precipitation over 7 days (mm)" values={cumulativeRain} unit="mm" color="#a78bfa" />
        <div style={{ marginTop: 12, overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Day", "Rain (mm)", "Rain chance", "Max / Min"].map(x => <th key={x} style={{ textAlign: "left", padding: 9, color: "#b8d5f1", borderBottom: "1px solid #36516f" }}>{x}</th>)}</tr></thead><tbody>{weather.daily.time.map((day, i) => <tr key={day}><td style={{ padding: 9, borderBottom: "1px solid #203b58" }}>{new Date(day + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</td><td style={{ padding: 9, borderBottom: "1px solid #203b58" }}>{Number(weather.daily.precipitation_sum[i] || 0).toFixed(1)}</td><td style={{ padding: 9, borderBottom: "1px solid #203b58" }}>{weather.daily.precipitation_probability_max?.[i] ?? "—"}%</td><td style={{ padding: 9, borderBottom: "1px solid #203b58" }}>{Math.round(weather.daily.temperature_2m_max[i])}° / {Math.round(weather.daily.temperature_2m_min[i])}°</td></tr>)}</tbody></table></div>
      </>}
    </section>

    <section style={panelStyle}><span style={muted}>MAP VIEW</span><h2 style={{ margin: "6px 0 10px" }}>Satellite, street & rainfall radar</h2>
      <label htmlFor="mapstyle">Base map</label><select id="mapstyle" style={selectStyle} value={mapStyle} onChange={e => setMapStyle(e.target.value)}><option value="satellite">Satellite imagery</option><option value="street">Street map</option></select>
      <label style={{ display: "flex", alignItems: "center", gap: 9, margin: "4px 0 12px" }}><input type="checkbox" checked={radarOn} onChange={e => setRadarOn(e.target.checked)} /> Show RainViewer radar overlay</label>
      <div style={{ height: 340, borderRadius: 14, overflow: "hidden", border: "1px solid #34516f" }}><MapContainer center={[place.lat, place.lon]} zoom={7} scrollWheelZoom style={{ height: "100%", width: "100%" }}><MapCenter place={place} /><TileLayer key={mapStyle} url={tileUrl} attribution={mapStyle === "satellite" ? "Tiles © Esri" : "© OpenStreetMap contributors"} />{radarOn && radarUrl && <TileLayer key={`radar-${radarFrame?.time}`} url={radarUrl} opacity={0.68} attribution="RainViewer radar" /> }<Marker position={[place.lat, place.lon]}><Popup>{place.name}, {place.state}</Popup></Marker></MapContainer></div>
      <p style={muted}>{radarOn ? radarMessage || "Loading radar metadata…" : "Radar is off. Enable the switch to show the latest available radar tile."}</p><p style={muted}>Radar coverage, update time and historical availability vary by region. A radar image is not a forecast or an official warning.</p>
    </section>

    <section style={panelStyle}><span style={muted}>NUMERICAL WEATHER MODELS</span><h2 style={{ margin: "6px 0" }}>Rainfall model comparison</h2><p style={muted}>Accumulated precipitation estimates in millimetres. Model availability varies by location and provider.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9, margin: "14px 0" }}>{models.map(m => { const d = modelData[m.id]; return <button key={m.id} onClick={() => setModel(m.id)} style={{ ...metricStyle, color: "#f4f8ff", textAlign: "left", outline: model === m.id ? "2px solid #38bdf8" : "none", cursor: "pointer" }}><span style={{ fontSize: 12 }}>{m.name}</span><strong style={{ display: "block", fontSize: 19, marginTop: 8 }}>{d?.error ? "Unavailable" : d ? `${d.h24.toFixed(1)} mm` : "Loading…"}</strong><small style={muted}>Next 24 hours</small></button>; })}</div>
      <label htmlFor="model">Selected model</label><select id="model" style={selectStyle} value={model} onChange={e => setModel(e.target.value)}>{models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      {modelLoading && <p style={muted}>Loading model guidance…</p>}{activeModel?.error && <p style={{ color: "#ffd1a8" }}>This model is currently unavailable from the provider. Try another model; unavailable does not mean zero rainfall.</p>}
      {activeModel && !activeModel.error && <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 9, marginTop: 12 }}><Metric icon="⏱️" label="24 hours" value={`${activeModel.h24.toFixed(1)} mm`} /><Metric icon="🗓️" label="72 hours" value={`${activeModel.h72.toFixed(1)} mm`} /><Metric icon="🌧️" label="7-day accumulation" value={`${activeModel.h168.toFixed(1)} mm`} /></div><BarChart title={`${activeModel.name}: daily rainfall (mm)`} values={activeModel.days} /></>}
      <div style={{ overflowX: "auto", marginTop: 16 }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{["Model", "24 h", "72 h", "7 days"].map(x => <th key={x} style={{ textAlign: "left", padding: 9, color: "#b8d5f1", borderBottom: "1px solid #36516f" }}>{x}</th>)}</tr></thead><tbody>{models.map(m => { const d = modelData[m.id]; return <tr key={m.id}><td style={{ padding: 9, borderBottom: "1px solid #203b58" }}>{m.name}</td><td style={{ padding: 9, borderBottom: "1px solid #203b58" }}>{d && !d.error ? d.h24.toFixed(1) : "—"}</td><td style={{ padding: 9, borderBottom: "1px solid #203b58" }}>{d && !d.error ? d.h72.toFixed(1) : "—"}</td><td style={{ padding: 9, borderBottom: "1px solid #203b58" }}>{d && !d.error ? d.h168.toFixed(1) : "—"}</td></tr>; })}</tbody></table></div>
      <p style={muted}>Open-Meteo model selection is provider-dependent; values are guidance, not guarantees. Different models may have different update cycles and resolution.</p>
    </section>

    {hourly && <section style={panelStyle}><span style={muted}>ATMOSPHERIC CONDITIONS · NEXT 24 HOURS</span><h2 style={{ margin: "6px 0 12px" }}>Wind, humidity & storm potential</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9 }}>
        <Metric icon="💨" label="Wind speed" value={`${Number(hourly.wind_speed_10m?.[hi] || 0).toFixed(1)} km/h`} />
        <Metric icon="🌬️" label="Wind gusts" value={`${Number(hourly.wind_gusts_10m?.[hi] || 0).toFixed(1)} km/h`} />
        <Metric icon="💧" label="Relative humidity" value={`${hourly.relative_humidity_2m?.[hi] ?? "—"}%`} />
        <Metric icon="🧭" label="Wind direction" value={`${hourly.wind_direction_10m?.[hi] ?? "—"}°`} detail="Degrees clockwise from north" />
        <Metric icon="🧱" label="Surface pressure" value={`${Number(hourly.surface_pressure?.[hi] || 0).toFixed(0)} hPa`} />
        <Metric icon="⚡" label="CAPE" value={`${Number(hourly.cape?.[hi] || 0).toFixed(0)} J/kg`} detail="Atmospheric instability indicator" />
      </div>
      <BarChart title="Hourly precipitation (mm)" values={hourValues("precipitation")} unit="mm" />
      <BarChart title="Hourly rain probability (%)" values={hourValues("precipitation_probability")} unit="%" color="#60a5fa" />
      <BarChart title="Wind speed (km/h)" values={hourValues("wind_speed_10m")} unit="km/h" color="#34d399" />
      <BarChart title="Wind gusts (km/h)" values={hourValues("wind_gusts_10m")} unit="km/h" color="#fbbf24" />
      <BarChart title="Relative humidity (%)" values={hourValues("relative_humidity_2m")} unit="%" color="#a78bfa" />
      <BarChart title="Cloud cover (%)" values={hourValues("cloud_cover")} unit="%" color="#94a3b8" />
      
      <BarChart title="CAPE (J/kg)" values={hourValues("cape")} unit="J/kg" color="#fb7185" />
      <p style={muted}>
        CAPE is not a thunderstorm warning by itself. Use official meteorological alerts for safety decisions.
      </p>
    </section>}

    <section style={panelStyle}>
      <span style={muted}>MORE WEATHER SOURCES</span>
      <h2 style={{ margin: "6px 0 12px" }}>Forecast tools &amp; official alerts</h2>
      <div style={{ display: "grid", gap: 10 }}>
        <a href="https://www.windy.com/" target="_blank" rel="noreferrer" style={{ color: "#8bd5ff" }}>
          Open Windy interactive weather map ↗
        </a>
        <a href="https://meteologix.com/in/model-charts/multimodel" target="_blank" rel="noopener noreferrer" style={{ color: "#8bd5ff" }}>
          Open Meteologix weather charts ↗
        </a>
      </div>
    </section>
  </main>;
}

      
<p style={muted}>
  CAPE is not a thunderstorm warning by itself. Use official meteorological alerts for safety decisions.
</p>
    <section style={panelStyle}><span style={muted}>MORE WEATHER SOURCES</span><h2 style={{ margin: "6px 0 12px" }}>Forecast tools & official alerts</h2><div style={{ display: "grid", gap: 10 }}>
      <a href="https://www.windy.com/" target="_blank" rel="noreferrer" style={{ color: "#8bd5ff" }}>Open Windy interactive weather map ↗</a>
      <a 


      <section style={panelStyle}>
        <span style={muted}>MORE WEATHER SOURCES</span>
        <h2 style={{ margin: "6px 0 12px" }}>
          Forecast tools & official alerts
        </h2>
        <div style={{ display: "grid", gap: 10 }}>
          <a href="https://www.windy.com/" target="_blank" rel="noreferrer" style={{ color: "#8bd5ff" }}>
            Open Windy interactive weather map ↗
          </a>
          <a
            href="https://meteologix.com/in/model-charts/multimodel"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8bd5ff" }}
          >
            Open Meteologix weather charts ↗
          </a>
        </div>
      </section>
