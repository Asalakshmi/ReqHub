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

const KOCHI = [9.9312, 76.2673];

async function reverseName(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    const a = data.address || {};
    const area =
      a.suburb || a.neighbourhood || a.village || a.hamlet || a.city_district;
    const city = a.city || a.town || a.county || a.state_district;
    const parts = [...new Set([area, city].filter(Boolean))];
    return parts.length ? parts.join(", ") : data.display_name || "";
  } catch {
    return "";
  }
}

function LocationPicker({ initial, onChange }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const coordsRef = useRef({ lat: initial.lat, lng: initial.lng });
  const onChangeRef = useRef(onChange);
  const [query, setQuery] = useState(initial.text || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  function report(text) {
    onChangeRef.current({
      text,
      lat: coordsRef.current.lat,
      lng: coordsRef.current.lng,
    });
  }

  function putMarker(lat, lng, zoom) {
    const map = mapRef.current;
    if (!map) return;
    coordsRef.current = { lat, lng };

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { icon: pin, draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        chooseSpot(p.lat, p.lng);
      });
      markerRef.current = marker;
    }
    if (zoom) map.setView([lat, lng], zoom);
  }

  async function chooseSpot(lat, lng) {
    putMarker(lat, lng);
    setMessage("Finding the place name...");
    const name = await reverseName(lat, lng);
    const text = name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    setQuery(text);
    setMessage("");
    report(text);
  }

  async function search() {
    const text = query.trim();
    if (!text) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=" +
          encodeURIComponent(text)
      );
      const data = await res.json();
      if (!data.length) {
        setMessage("Place not found. Try a more specific name, or click on the map.");
        return;
      }
      putMarker(parseFloat(data[0].lat), parseFloat(data[0].lon), 15);
      report(text);
    } catch {
      setMessage("Search failed. Try again, or click on the map.");
    } finally {
      setBusy(false);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setMessage("Your browser cannot share your location.");
      return;
    }
    setMessage("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        putMarker(latitude, longitude, 15);
        chooseSpot(latitude, longitude);
      },
      () =>
        setMessage(
          "Could not get your location. Allow location access, or search instead."
        ),
      { timeout: 10000 }
    );
  }

  function handleType(value) {
    setQuery(value);
    report(value);
  }

  useEffect(() => {
    const hasPin = initial.lat != null && initial.lng != null;
    const map = L.map(boxRef.current).setView(
      hasPin ? [initial.lat, initial.lng] : KOCHI,
      hasPin ? 15 : 11
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", (e) => chooseSpot(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    if (hasPin) putMarker(initial.lat, initial.lng);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="picker-row">
        <input
          value={query}
          placeholder="Search a place, e.g. Kakkanad, Kochi"
          maxLength={150}
          onChange={(e) => handleType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
        />
        <button type="button" onClick={search} disabled={busy}>
          {busy ? "..." : "Search"}
        </button>
      </div>

      <div className="picker-actions">
        <button type="button" className="ghost-btn" onClick={locateMe}>
          Use my current location
        </button>
      </div>

      {message && <p className="meta">{message}</p>}

      <div ref={boxRef} className="map-box" />
      <p className="meta">
        Search for a place, click the map, or drag the pin to set the exact spot.
      </p>
    </div>
  );
}

export default LocationPicker;