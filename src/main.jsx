
import React from "react";
import { createRoot } from "react-dom/client";
import WeatherApp from "./WeatherApp.jsx";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WeatherApp />
  </React.StrictMode>
);
