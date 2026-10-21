import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";

const CATEGORIES = [
  "Home Repair",
  "Food & Catering",
  "Electronics",
  "Rentals",
  "Services",
];

function Feed() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category) params.category = category;
    if (location) params.location = location;

    api
      .get("/requests/", { params })
      .then((res) => {
        setRequests(res.data);
        setError("");
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setError("Could not load requests");
        }
      })
      .finally(() => setLoading(false));
  }, [category, location, navigate]);

  return (
    <>
      <Navbar />
      <div className="page wide">
        <h1>Open requests</h1>

        <div className="filters">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            placeholder="Filter by location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && requests.length === 0 && (
          <p>No open requests found.</p>
        )}

        {requests.map((r) => (
          <Link key={r.id} to={`/requests/${r.id}`} className="card">
            <h3>{r.title}</h3>
            <p className="meta">
              {r.category} · {r.location}
            </p>
            <p className="meta">
              Expires: {new Date(r.expiry_time).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

export default Feed;