
import React, { useEffect, useState } from "react";
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
  ["Rayachoti", "Andhra Pradesh", 14.05, 78.75],
  ["Kadapa", "Andhra Pradesh", 14.47, 78.82],
  ["Anantapur", "Andhra Pradesh", 14.68, 77.60],
  ["Chittoor", "Andhra Pradesh", 13.22, 79.10],
  ["Tirupati", "Andhra Pradesh", 13.63, 79.42],
  ["Nellore", "Andhra Pradesh", 14.44, 79.99],
  ["Kurnool", "Andhra Pradesh", 15.83, 78.04],
  ["Guntur", "Andhra Pradesh", 16.31, 80.44],
  ["Bengaluru", "Karnataka", 12.97, 77.59],
  ["Mysuru", "Karnataka", 12.30, 76.64],
  ["Mangaluru", "Karnataka", 12.87, 74.88],
  ["Shivamogga", "Karnataka", 13.93, 75.57],
  ["Chennai", "Tamil Nadu", 13.08, 80.27],
  ["Coimbatore", "Tamil Nadu", 11.02, 76.96],
  ["Madurai", "Tamil Nadu", 9.93, 78.12],
  ["Thiruvananthapuram", "Kerala", 8.52, 76.94],
  ["Kochi", "Kerala", 9.93, 76.27],
  ["Kozhikode", "Kerala", 11.26, 75.78],
  ["Hyderabad", "Telangana", 17.39, 78.49],
  ["Warangal", "Telangana", 17.97, 79.59]
].map(([name, state, lat, lon]) => ({ name, state, lat, lon }));

const models = [
  { id: "ecmwf_ifs025", name: "ECMWF IFS" },
  { id: "gfs_seamless", name: "NOAA GFS" },
  { id: "icon_seamless", name: "DWD ICON" },
  { id: "jma_seamless", name: "JMA GSM" }
];

function MapCenter({ place }) {
  const map = useMap();
  useEffect(() => {
    map.setView([place.lat, place.lon], 7);
    setTimeout(() => map.invalidateSize(), 200);
  }, [map, place]);
  return null;
}

function RainChart({ title, values }) {
  const max = Math.max(1, ...values.map(v => v.value || 0));
  return (
    <div className="chart-box">
      <h3>{title}</h3>
      <div className="bars">
        {values.map((v, i) => (
          <div className="bar-item" key={i}>
            <span>{Number(v.value || 0).toFixed(1)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${Math.max(2, (v.value / max) * 100)}%` }} />
            </div>
            <small>{v.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeatherApp() {
  const [selected, setSelected] = useState("Rayachoti");
  const [mapStyle, setMapStyle] = useState("satellite");
  const [model, setModel] = useState(models[0].id);
  const [weather, setWeather] = useState(null);
  const [modelData, setModelData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const place = places.find(p => p.name === selected) || places[0];

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setWeather(null);
      try {
        const params = new URLSearchParams({
          latitude: place.lat,
          longitude: place.lon,
          daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
          hourly: "precipitation,precipitation_probability,cloud_cover",
          forecast_days: "7",
          timezone: "auto"
        });
        const res = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
        if (!res.ok) throw new Error("Forecast unavailable");
        const data = await res.json();
        if (active) setWeather(data);
      } catch {
        if (active) setError("Could not load forecast. Check your internet and retry.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [place.lat, place.lon]);

  useEffect(() => {
    let active = true;
    async function loadModels() {
      const result = {};
      await Promise.all(models.map(async m => {
        try {
          const params = new URLSearchParams({
            latitude: place.lat,
            longitude: place.lon,
            hourly: "precipitation",
            forecast_days: "7",
            timezone: "auto",
            models: m.id
          });
          const res = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
          if (!res.ok) throw new Error("Unavailable");
          const json = await res.json();
          const rain = json.hourly?.precipitation || [];
          result[m.id] = {
            name: m.name,
            hours: rain,
            days: Array.from({ length: 7 }, (_, i) => ({
              label: ["Today", "D2", "D3", "D4", "D5", "D6", "D7"][i],
              value: rain.slice(i * 24, (i + 1) * 24)
                .reduce((a, b) => a + (Number(b) || 0), 0)
            })),
            h24: rain.slice(0, 24).reduce((a, b) => a + (Number(b) || 0), 0),
            h72: rain.slice(0, 72).reduce((a, b) => a + (Number(b) || 0), 0),
            h168: rain.slice(0, 168).reduce((a, b) => a + (Number(b) || 0), 0)
          };
        } catch {
          result[m.id] = { name: m.name, error: true };
        }
      }));
      if (active) setModelData(result);
    }
    loadModels();
    return () => { active = false; };
  }, [place.lat, place.lon]);

  const activeModel = modelData[model];
  const tileUrl = mapStyle === "satellite"
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-icon">🌦️</div>
        <div><h1>South India Weather</h1><p>District Forecast Centre</p></div>
      </header>

      <section className="hero">
        <span className="eyebrow">REGIONAL WEATHER OUTLOOK</span>
        <h2>Weather, district by district.</h2>
        <p>Satellite maps, model rainfall estimates and forecast charts.</p>
      </section>

      <section className="panel">
        <label htmlFor="district">Select district or city</label>
        <select id="district" value={selected} onChange={e => setSelected(e.target.value)}>
          {places.map(p => <option key={p.name} value={p.name}>{p.name} — {p.state}</option>)}
        </select>
        <div className="location-heading">
          <div><span className="eyebrow">{place.state}</span><h2>{place.name}</h2></div>
          <span>📍</span>
        </div>

        {loading && <p className="status">Loading forecast…</p>}
        {error && <p className="status">{error}</p>}

        {weather?.daily && <>
          <div className="metrics">
            <article className="metric"><span>🌧️</span><small>Rain today</small><strong>{weather.daily.precipitation_sum[0]} mm</strong></article>
            <article className="metric"><span>💧</span><small>Rain chance</small><strong>{weather.daily.precipitation_probability_max?.[0] ?? "—"}%</strong></article>
            <article className="metric"><span>🌡️</span><small>Temperature</small><strong>{Math.round(weather.daily.temperature_2m_max[0])}° / {Math.round(weather.daily.temperature_2m_min[0])}°</strong></article>
          </div>
          <h3>7-day forecast</h3>
          <div className="forecast-list">
            {weather.daily.time.map((day, i) => (
              <article className="forecast-row" key={day}>
                <div className="forecast-day">
                  <strong>{new Date(day + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</strong>
                  <small>Precipitation: {weather.daily.precipitation_sum[i]} mm</small>
                </div>
                <div className="forecast-rain"><strong>{weather.daily.precipitation_probability_max?.[i] ?? "—"}%</strong><small>Rain chance</small></div>
                <div className="forecast-temp"><strong>{Math.round(weather.daily.temperature_2m_max[i])}°</strong><small>{Math.round(weather.daily.temperature_2m_min[i])}°</small></div>
              </article>
            ))}
          </div>
        </>}
      </section>

      <section className="panel feature-panel">
        <span className="eyebrow">MAP VIEW</span><h2>Satellite & street map</h2>
        <label htmlFor="mapstyle">Map layer</label>
        <select id="mapstyle" value={mapStyle} onChange={e => setMapStyle(e.target.value)}>
          <option value="satellite">Satellite imagery</option>
          <option value="street">Street map</option>
        </select>
        <div className="map-frame">
          <MapContainer center={[place.lat, place.lon]} zoom={7} scrollWheelZoom>
            <MapCenter place={place} />
            <TileLayer
              key={mapStyle}
              url={tileUrl}
              attribution={mapStyle === "satellite" ? "Tiles © Esri" : "© OpenStreetMap contributors"}
            />
            <Marker position={[place.lat, place.lon]}>
              <Popup>{place.name}, {place.state}</Popup>
            </Marker>
          </MapContainer>
        </div>
        <p className="source-note">Satellite tiles require internet access. Imagery © Esri.</p>
      </section>

      <section className="panel feature-panel">
        <span className="eyebrow">NUMERICAL WEATHER MODELS</span>
        <h2>Rainfall model comparison</h2>
        <p>Forecast accumulation estimates in millimetres.</p>
        <div className="model-grid">
          {models.map(m => {
            const d = modelData[m.id];
            return <button className="model-card" key={m.id} onClick={() => setModel(m.id)}>
              <span>{m.name}</span>
              <strong>{d?.error ? "Unavailable" : d ? `${d.h24.toFixed(1)} mm` : "Loading…"}</strong>
              <small>Next 24 hours</small>
            </button>;
          })}
        </div>
        <label htmlFor="model">Selected model</label>
        <select id="model" value={model} onChange={e => setModel(e.target.value)}>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        {activeModel?.error && <p className="status">This model is unavailable from the provider right now. Try another.</p>}
        {activeModel && !activeModel.error && <>
          <div className="accumulation-grid">
            <article><small>24 hours</small><strong>{activeModel.h24.toFixed(1)} mm</strong></article>
            <article><small>72 hours</small><strong>{activeModel.h72.toFixed(1)} mm</strong></article>
            <article><small>7 days</small><strong>{activeModel.h168.toFixed(1)} mm</strong></article>
          </div>
          <RainChart title={`${activeModel.name} · daily rainfall`} values={activeModel.days} />
          <RainChart title={`${activeModel.name} · hourly rainfall (first 24 hours)`} values={activeModel.hours.slice(0, 24).map((v, i) => ({ label: i % 3 === 0 ? String(i).padStart(2, "0") : "", value: Number(v) || 0 }))} />
        </>}
        <div className="table-scroll">
          <table className="model-table">
            <thead><tr><th>Model</th><th>24 h</th><th>72 h</th><th>7 days</th></tr></thead>
            <tbody>{models.map(m => {
              const d = modelData[m.id];
              return <tr key={m.id}><td>{m.name}</td><td>{d && !d.error ? d.h24.toFixed(1) : "—"}</td><td>{d && !d.error ? d.h72.toFixed(1) : "—"}</td><td>{d && !d.error ? d.h168.toFixed(1) : "—"}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <p className="source-note">Forecast data via Open-Meteo. Model access and coverage vary. A model showing unavailable is not a zero-rain forecast.</p>
      </section>

      {weather?.hourly && <section className="panel feature-panel">
        <span className="eyebrow">HOURLY WEATHER</span><h2>Precipitation and cloud charts</h2>
        <RainChart title="Hourly precipitation (mm)" values={weather.hourly.precipitation.slice(0, 24).map((v, i) => ({ label: i % 3 === 0 ? String(i).padStart(2, "0") : "", value: Number(v) || 0 }))} />
        <RainChart title="Rain probability (%)" values={weather.hourly.precipitation_probability.slice(0, 24).map((v, i) => ({ label: i % 3 === 0 ? String(i).padStart(2, "0") : "", value: Number(v) || 0 }))} />
        <RainChart title="Cloud cover (%)" values={weather.hourly.cloud_cover.slice(0, 24).map((v, i) => ({ label: i % 3 === 0 ? String(i).padStart(2, "0") : "", value: Number(v) || 0 }))} />
      </section>}

      <footer>
        Forecasts are estimates, not official warnings. Data via Open-Meteo.
        Map imagery © Esri; street tiles © OpenStreetMap contributors.
      </footer>
    </main>
  );
}
