import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";

function AdminComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const res = await api.get("/admin/complaints", { params });
      setComplaints(res.data);
      setError("");
    } catch (err) {
      const code = err.response?.status;
      if (code === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else if (code === 403) {
        navigate("/feed");
      } else {
        setError("Could not load complaints");
      }
    } finally {
      setLoading(false);
    }
  }, [filter, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id) {
    try {
      await api.patch(`/admin/complaints/${id}/resolve`);
      await load();
    } catch {
      setError("Could not update the complaint");
    }
  }

  return (
    <>
      <Navbar />
      <div className="page wide">
        <h1>Complaints</h1>

        <div className="filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="">All</option>
          </select>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && complaints.length === 0 && (
          <p>No complaints here.</p>
        )}

        {complaints.map((c) => (
          <div key={c.id} className="quote-card">
            <div className="complaint-head">
              <h3>{c.subject}</h3>
              <span className={`badge ${c.status === "resolved" ? "completed" : "pending"}`}>
                {c.status}
              </span>
            </div>
            <p className="meta">
              From {c.user_name} ({c.user_email}) ·{" "}
              {new Date(c.created_at).toLocaleString()}
            </p>
            {c.request_id && (
              <p className="meta">
                About request{" "}
                <Link to={`/requests/${c.request_id}`}>#{c.request_id}</Link>
              </p>
            )}
            <p className="complaint-body">{c.message}</p>
            {c.status === "open" && (
              <button type="button" onClick={() => resolve(c.id)}>
                Mark as resolved
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default AdminComplaints;