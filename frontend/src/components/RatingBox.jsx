import { useState } from "react";
import api from "../api";

function RatingBox({ requestId, personLabel }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/requests/${requestId}/rate`, {
        stars: Number(stars),
        comment: comment || null,
      });
      setDone(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === "You already rated this job") {
        setDone(true);
      } else {
        setError(typeof detail === "string" ? detail : "Could not save rating");
      }
    }
  }

  if (done) {
    return (
      <div className="section">
        <h2>Rating</h2>
        <p>Thanks! Your rating for this job is saved.</p>
      </div>
    );
  }

  return (
    <div className="section">
      <h2>Rate {personLabel}</h2>
      <form onSubmit={submit}>
        <label>Stars</label>
        <select value={stars} onChange={(e) => setStars(e.target.value)}>
          <option value={5}>5 - Excellent</option>
          <option value={4}>4 - Good</option>
          <option value={3}>3 - Okay</option>
          <option value={2}>2 - Poor</option>
          <option value={1}>1 - Terrible</option>
        </select>

        <label>Comment (optional)</label>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {error && <p className="error">{error}</p>}
        <button type="submit">Submit rating</button>
      </form>
    </div>
  );
}

export default RatingBox;