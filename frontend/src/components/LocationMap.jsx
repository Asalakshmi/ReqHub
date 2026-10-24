import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const pin = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function LocationMap({ location, lat, lng }) {
  const boxRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let map = null;
    let cancelled = false;

    function draw(la, lo) {
      map = L.map(boxRef.current).setView([la, lo], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      L.marker([la, lo], { icon: pin }).addTo(map);
      setStatus("ready");
    }

    async function showMap() {
      try {
        if (lat != null && lng != null) {
          draw(lat, lng);
          return;
        }

        const url =
          "https://nominatim.openstreetmap.org/search?format=json&limit=1" +
          "&countrycodes=in&q=" +
          encodeURIComponent(location);
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;

        if (!data.length) {
          setStatus("notfound");
          return;
        }
        draw(parseFloat(data[0].lat), parseFloat(data[0].lon));
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    showMap();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [location, lat, lng]);

  const failed = status === "notfound" || status === "error";

  return (
    <div className="section">
      <h2>Location</h2>
      {status === "loading" && <p className="meta">Loading map...</p>}
      {status === "notfound" && (
        <p className="meta">Could not find "{location}" on the map.</p>
      )}
      {status === "error" && <p className="meta">The map is unavailable right now.</p>}

      <div ref={boxRef} className={`map-box ${failed ? "hidden" : ""}`} />

      <p className="meta">
        <a
          href={
            lat != null && lng != null
              ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
          }
          target="_blank"
          rel="noreferrer"
        >
          Open in Google Maps
        </a>
      </p>
    </div>
  );
}

export default LocationMap;