import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const CATEGORIES = [
  "Home Repair",
  "Food & Catering",
  "Electronics",
  "Rentals",
  "Services",
];

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "both",
    phone: "",
    location: "",
    category: "",
  });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", {
        ...form,
        phone: form.phone || null,
        location: form.location || null,
        category: form.category || null,
      });
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Registration failed. Check your details."
      );
    }
  }

  return (
    <div className="page">
      <h1>Create account</h1>
      <form onSubmit={handleSubmit}>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handleChange} required />

        <label>Email</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label>Password (6+ characters)</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          minLength={6}
          required
        />

        <label>I want to</label>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="requester">Post requests (requester)</option>
          <option value="provider">Send quotes (provider)</option>
          <option value="both">Both</option>
        </select>

        <label>Phone</label>
        <input name="phone" value={form.phone} onChange={handleChange} />

        <label>Location</label>
        <input
          name="location"
          placeholder="e.g. Kakkanad, Kochi"
          value={form.location}
          onChange={handleChange}
        />

        {form.role !== "requester" && (
          <>
            <label>Service category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default Register;