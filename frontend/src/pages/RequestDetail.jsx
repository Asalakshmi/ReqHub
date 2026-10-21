import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";
import Chat from "../components/Chat";
import RatingBox from "../components/RatingBox";

function errorText(err, fallback) {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail[0].msg;
  return fallback;
}

function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [request, setRequest] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [myQuote, setMyQuote] = useState(null);
  const [form, setForm] = useState({ price: "", eta: "", message: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [meRes, reqRes] = await Promise.all([
        api.get("/auth/me"),
        api.get(`/requests/${id}`),
      ]);
      const me = meRes.data;
      const req = reqRes.data;
      setUser(me);
      setRequest(req);

      if (req.requester_id === me.id) {
        const q = await api.get(`/requests/${id}/quotes`);
        setQuotes(q.data);
      } else {
        const mine = await api.get("/quotes/mine");
        setMyQuote(mine.data.find((q) => q.request_id === req.id) || null);
      }
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else if (err.response?.status === 404) {
        setError("Request not found");
      } else {
        setError("Could not load this request");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submitQuote(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/requests/${id}/quotes`, {
        price: Number(form.price),
        eta: form.eta || null,
        message: form.message || null,
      });
      setForm({ price: "", eta: "", message: "" });
      await load();
    } catch (err) {
      setError(errorText(err, "Could not send the quote"));
    }
  }

  async function acceptQuote(quoteId) {
    setError("");
    try {
      await api.patch(`/quotes/${quoteId}/accept`);
      await load();
    } catch (err) {
      setError(errorText(err, "Could not accept the quote"));
    }
  }

  async function completeJob() {
    if (!window.confirm("Mark this job as completed?")) return;
    setError("");
    try {
      await api.patch(`/requests/${id}/complete`);
      await load();
    } catch (err) {
      setError(errorText(err, "Could not mark the job complete"));
    }
  }

  if (loading) return <p>Loading...</p>;

  if (!request) {
    return (
      <>
        <Navbar />
        <div className="page wide">
          <p className="error">{error || "Request not found"}</p>
          <Link to="/feed">Back to feed</Link>
        </div>
      </>
    );
  }

  const isOwner = user.id === request.requester_id;
  const canQuote = user.role === "provider" || user.role === "both";

  const acceptedQuote = isOwner
    ? quotes.find((q) => q.status === "accepted")
    : myQuote && myQuote.status === "accepted"
      ? myQuote
      : null;

  const inJob =
    acceptedQuote &&
    (request.status === "accepted" || request.status === "completed");

  return (
    <>
      <Navbar />
      <div className="page wide">
        <Link to="/feed" className="back">
          ← Back to feed
        </Link>

        <h1>{request.title}</h1>
        <p>
          <span className={`badge ${request.status}`}>{request.status}</span>
        </p>
        <p className="meta">
          {request.category} · {request.location}
        </p>
        <p className="meta">
          Expires: {new Date(request.expiry_time).toLocaleString()}
        </p>
        {request.description && <p>{request.description}</p>}

        {error && <p className="error">{error}</p>}

        {isOwner ? (
          <div className="section">
            <h2>Quotes ({quotes.length})</h2>
            {quotes.length === 0 && <p>No quotes yet. Check back soon.</p>}

            {quotes.map((q) => (
              <div
                key={q.id}
                className={`quote-card ${q.status === "accepted" ? "accepted" : ""}`}
              >
                <p className="price">₹{q.price}</p>
                <p>
                  <strong>{q.provider.name}</strong>
                  {" · "}
                  {q.provider.rating_avg
                    ? `★ ${q.provider.rating_avg}`
                    : "No ratings yet"}
                </p>
                {q.eta && <p className="meta">Arrives: {q.eta}</p>}
                {q.message && <p>{q.message}</p>}
                <span className={`badge ${q.status}`}>{q.status}</span>
                {request.status === "open" && q.status === "pending" && (
                  <button
                    className="accept-btn"
                    onClick={() => acceptQuote(q.id)}
                  >
                    Accept this quote
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="section">
            {myQuote ? (
              <>
                <h2>Your quote</h2>
                <div
                  className={`quote-card ${myQuote.status === "accepted" ? "accepted" : ""}`}
                >
                  <p className="price">₹{myQuote.price}</p>
                  {myQuote.eta && <p className="meta">Arrives: {myQuote.eta}</p>}
                  {myQuote.message && <p>{myQuote.message}</p>}
                  <span className={`badge ${myQuote.status}`}>
                    {myQuote.status}
                  </span>
                </div>
              </>
            ) : !canQuote ? (
              <p>Only provider accounts can send quotes.</p>
            ) : request.status !== "open" ? (
              <p>This request is no longer open.</p>
            ) : (
              <>
                <h2>Send a quote</h2>
                <form onSubmit={submitQuote}>
                  <label>Price (₹)</label>
                  <input
                    name="price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    required
                  />

                  <label>Arrival time</label>
                  <input
                    name="eta"
                    placeholder="e.g. 45 mins"
                    value={form.eta}
                    onChange={handleChange}
                  />

                  <label>Message</label>
                  <textarea
                    name="message"
                    rows={3}
                    value={form.message}
                    onChange={handleChange}
                  />

                  <button type="submit">Send quote</button>
                </form>
              </>
            )}
          </div>
        )}

        {inJob && request.status === "accepted" && (
          <div className="section">
            <h2>Job in progress</h2>
            {isOwner ? (
              <>
                <p>
                  When the work is finished, mark it complete so you can both
                  leave a rating.
                </p>
                <button onClick={completeJob}>Mark as complete</button>
              </>
            ) : (
              <p>
                The requester will mark this job complete once the work is done.
              </p>
            )}
          </div>
        )}

        {inJob && <Chat requestId={request.id} userId={user.id} />}

        {inJob && request.status === "completed" && (
          <RatingBox
            requestId={request.id}
            personLabel={
              isOwner ? acceptedQuote.provider.name : "the requester"
            }
          />
        )}
      </div>
    </>
  );
}

export default RequestDetail;