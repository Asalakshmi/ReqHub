import { useState } from "react";
import api from "../api";

function Reviews({ userId, label = "See reviews" }) {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState("");

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (reviews !== null) return;
    try {
      const res = await api.get(`/users/${userId}/reviews`);
      setReviews(res.data);
    } catch {
      setError("Could not load reviews");
    }
  }

  return (
    <div>
      <button type="button" className="link-btn" onClick={toggle}>
        {open ? "Hide reviews" : label}
      </button>

      {open && (
        <div className="reviews">
          {error && <p className="error">{error}</p>}
          {!error && reviews === null && <p className="meta">Loading...</p>}
          {reviews && reviews.length === 0 && (
            <p className="meta">No reviews yet.</p>
          )}
          {reviews &&
            reviews.map((r) => (
              <div key={r.id} className="review">
                <p>
                  <span className="stars">
                    {"★".repeat(r.stars)}
                    {"☆".repeat(5 - r.stars)}
                  </span>{" "}
                  <strong>{r.reviewer_name}</strong>
                </p>
                {r.comment && <p>{r.comment}</p>}
                <p className="meta">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default Reviews;