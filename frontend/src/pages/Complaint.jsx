import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";

function Complaint() {
  const navigate = useNavigate();
  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState({ subject: "", message: "", request_id: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/requests/mine")
      .then((res) => setMyRequests(res.data))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      });
  }, [navigate]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/complaints", {
        subject: form.subject,
        message: form.message,
        request_id: form.request_id ? Number(form.request_id) : null,
      });
      setSent(true);
      setForm({ subject: "", message: "", request_id: "" });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail[0].msg);
      } else {
        setError("Could not send your complaint");
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <>
        <Navbar />
        <div className="page">
          <h1>Complaint sent</h1>
          <p>Thank you. The admin will look into it.</p>
          <p>
            <button type="button" onClick={() => setSent(false)}>
              Send another
            </button>{" "}
            <Link to="/feed">Back to feed</Link>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Complaint box</h1>
        <p className="meta">
          Something went wrong with a provider or a job? Tell us. Only the admin
          can read your complaint.
        </p>
        <form onSubmit={handleSubmit}>
          <label>Subject</label>
          <input
            name="subject"
            value={form.subject}
            onChange={handleChange}
            minLength={3}
            maxLength={200}
            required
          />

          <label>Related request (optional)</label>
          <select
            name="request_id"
            value={form.request_id}
            onChange={handleChange}
          >
            <option value="">Not about a specific request</option>
            {myRequests.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} - {r.title}
              </option>
            ))}
          </select>

          <label>What happened?</label>
          <textarea
            name="message"
            rows={6}
            value={form.message}
            onChange={handleChange}
            minLength={10}
            maxLength={2000}
            required
          />

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Sending..." : "Send complaint"}
          </button>
        </form>
      </div>
    </>
  );
}

export default Complaint;