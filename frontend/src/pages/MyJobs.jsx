import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";

function MyJobs() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posted, setPosted] = useState([]);
  const [quoted, setQuoted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meRes, mineRes, quotesRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/requests/mine"),
          api.get("/quotes/mine"),
        ]);
        setUser(meRes.data);
        setPosted(mineRes.data);

        const items = await Promise.all(
          quotesRes.data.map(async (q) => {
            const r = await api.get(`/requests/${q.request_id}`);
            return { quote: q, request: r.data };
          })
        );
        setQuoted(items);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setError("Could not load your activity");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  return (
    <>
      <Navbar />
      <div className="page wide">
        <h1>My jobs</h1>
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            {user && (
              <p className="meta">
                {user.name} ·{" "}
                {user.rating_avg
                  ? `★ ${user.rating_avg} average rating`
                  : "No ratings yet"}
              </p>
            )}

            <h2>Requests I posted</h2>
            {posted.length === 0 && <p>You haven't posted any requests.</p>}
            {posted.map((r) => (
              <Link key={r.id} to={`/requests/${r.id}`} className="card">
                <h3>{r.title}</h3>
                <p className="meta">
                  {r.category} · {r.location}
                </p>
                <span className={`badge ${r.status}`}>{r.status}</span>
              </Link>
            ))}

            <h2>Quotes I sent</h2>
            {quoted.length === 0 && <p>You haven't sent any quotes.</p>}
            {quoted.map(({ quote, request }) => (
              <Link
                key={quote.id}
                to={`/requests/${request.id}`}
                className="card"
              >
                <h3>{request.title}</h3>
                <p className="meta">
                  My quote: ₹{quote.price} · Request is {request.status}
                </p>
                <span className={`badge ${quote.status}`}>{quote.status}</span>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  );
}

export default MyJobs;