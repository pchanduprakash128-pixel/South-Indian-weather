
import React, { useEffect, useState } from "react";

const districts = [
  { name: "Rayachoti", state: "Andhra Pradesh", lat: 14.05, lon: 78.75 },
  { name: "Kadapa", state: "Andhra Pradesh", lat: 14.47, lon: 78.82 },
  { name: "Anantapur", state: "Andhra Pradesh", lat: 14.68, lon: 77.60 },
  { name: "Chittoor", state: "Andhra Pradesh", lat: 13.22, lon: 79.10 },
  { name: "Tirupati", state: "Andhra Pradesh", lat: 13.63, lon: 79.42 },
  { name: "Nellore", state: "Andhra Pradesh", lat: 14.44, lon: 79.99 },
  { name: "Kurnool", state: "Andhra Pradesh", lat: 15.83, lon: 78.04 },
  { name: "Guntur", state: "Andhra Pradesh", lat: 16.31, lon: 80.44 },
  { name: "Bengaluru Urban", state: "Karnataka", lat: 12.97, lon: 77.59 },
  { name: "Mysuru", state: "Karnataka", lat: 12.30, lon: 76.64 },
  { name: "Mangaluru", state: "Karnataka", lat: 12.87, lon: 74.88 },
  { name: "Shivamogga", state: "Karnataka", lat: 13.93, lon: 75.57 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.08, lon: 80.27 },
  { name: "Coimbatore", state: "Tamil Nadu", lat: 11.02, lon: 76.96 },
  { name: "Madurai", state: "Tamil Nadu", lat: 9.93, lon: 78.12 },
  { name: "Thiruvananthapuram", state: "Kerala", lat: 8.52, lon: 76.94 },
  { name: "Kochi", state: "Kerala", lat: 9.93, lon: 76.27 },
  { name: "Kozhikode", state: "Kerala", lat: 11.26, lon: 75.78 },
  { name: "Hyderabad", state: "Telangana", lat: 17.39, lon: 78.49 },
  { name: "Warangal", state: "Telangana", lat: 17.97, lon: 79.59 }
];

function weatherLabel(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow / ice";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Variable conditions";
}

function weatherIcon(code) {
  if ([95, 96, 99].includes(code)) return "⛈️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([1, 2, 3].includes(code)) return "⛅";
  return "☀️";
}

export default function WeatherApp() {
  const [selected, setSelected] = useState("Rayachoti");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const place = districts.find((d) => d.name === selected) || districts[0];

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      setLoading(true);
      setError("");
      setWeather(null);

      try {
        const params = new URLSearchParams({
          latitude: place.lat,
          longitude: place.lon,
          daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "wind_speed_10m_max"
          ].join(","),
          forecast_days: "7",
          timezone: "auto"
        });

        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params}`
        );

        if (!response.ok) throw new Error("Forecast service is unavailable.");

        const data = await response.json();
        if (!data.daily) throw new Error("No forecast data was returned.");

        if (!cancelled) setWeather(data.daily);
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load the forecast. Check your internet and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, [place.lat, place.lon]);

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-icon">🌦️</div>
        <div>
          <h1>South India Weather</h1>
          <p>District Forecast Centre</p>
        </div>
      </header>

      <section className="hero">
        <span className="eyebrow">REGIONAL WEATHER OUTLOOK</span>
        <h2>Weather, district by district.</h2>
        <p>Rainfall, temperatures and thunderstorm outlooks across South India.</p>
      </section>

      <section className="panel">
        <label htmlFor="district">Select a district or city</label>
        <select
          id="district"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {districts.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} — {d.state}
            </option>
          ))}
        </select>

        <div className="location-heading">
          <div>
            <span className="eyebrow">{place.state}</span>
            <h2>{place.name}</h2>
          </div>
          <span className="location-icon">📍</span>
        </div>

        {loading && <p className="status">Loading forecast data…</p>}
        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => setSelected("")}>
              Refresh by selecting a location
            </button>
          </div>
        )}

        {weather && (
          <>
            <div className="metrics">
              <article className="metric">
                <span>🌧️</span>
                <small>Rain today</small>
                <strong>{weather.precipitation_sum[0]} mm</strong>
              </article>
              <article className="metric">
                <span>💧</span>
                <small>Rain chance</small>
                <strong>
                  {weather.precipitation_probability_max?.[0] ?? "—"}%
                </strong>
              </article>
              <article className="metric">
                <span>🌡️</span>
                <small>Temperature</small>
                <strong>
                  {Math.round(weather.temperature_2m_max[0])}° /{" "}
                  {Math.round(weather.temperature_2m_min[0])}°
                </strong>
              </article>
            </div>

            <h3>7-day forecast</h3>
            <div className="forecast-list">
              {weather.time.map((day, i) => (
                <article className="forecast-row" key={day}>
                  <div className="forecast-day">
                    <strong>
                      {new Date(day + "T12:00:00").toLocaleDateString(
                        "en-IN",
                        { weekday: "short", day: "numeric", month: "short" }
                      )}
                    </strong>
                    <small>{weatherLabel(weather.weather_code[i])}</small>
                  </div>
                  <span className="forecast-icon">
                    {weatherIcon(weather.weather_code[i])}
                  </span>
                  <div className="forecast-rain">
                    <strong>{weather.precipitation_sum[i]} mm</strong>
                    <small>
                      {weather.precipitation_probability_max?.[i] ?? "—"}% chance
                    </small>
                  </div>
                  <div className="forecast-temp">
                    <strong>{Math.round(weather.temperature_2m_max[i])}°</strong>
                    <small>{Math.round(weather.temperature_2m_min[i])}°</small>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <footer>
        Forecast data: Open-Meteo · Model output may change with each update.
        <br />
        For official warnings, follow the relevant national and state weather
        authorities.
      </footer>
    </main>
  );
}
