import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";

const CATEGORIES = [
  "Home Repair",
  "Food & Catering",
  "Electronics",
  "Rentals",
  "Services",
];

function PostNeed() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Home Repair",
    location: "",
    expiry: "",
  });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/requests/", {
        title: form.title,
        description: form.description || null,
        category: form.category,
        location: form.location,
        // converts your local time into UTC so the server reads it correctly
        expiry_time: new Date(form.expiry).toISOString(),
      });
      navigate("/feed");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail[0].msg);
      } else {
        setError("Could not post the request");
      }
    }
  }

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Post a need</h1>
        <form onSubmit={handleSubmit}>
          <label>Title</label>
          <input
            name="title"
            placeholder="e.g. Need AC repair today"
            value={form.title}
            onChange={handleChange}
            minLength={3}
            required
          />

          <label>Details (optional)</label>
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
          />

          <label>Category</label>
          <select name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label>Location</label>
          <input
            name="location"
            placeholder="e.g. Kakkanad, Kochi"
            value={form.location}
            onChange={handleChange}
            required
          />

          <label>Needed by</label>
          <input
            name="expiry"
            type="datetime-local"
            value={form.expiry}
            onChange={handleChange}
            required
          />

          {error && <p className="error">{error}</p>}
          <button type="submit">Post request</button>
        </form>
      </div>
    </>
  );
}

export default PostNeed;