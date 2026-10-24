import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const CATEGORIES = [
  "Home Repair",
  "Food & Catering",
  "Electronics",
  "Rentals",
  "Services",
];

function errorText(err, fallback) {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail[0].msg;
  return fallback;
}

function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    code: "",
    password: "",
    role: "both",
    phone: "",
    location: "",
    category: "",
  });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function sendCode(e) {
    if (e) e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await api.post("/auth/send-code", { email: form.email });
      setStep(2);
      setCooldown(60);
      setInfo(
        `We sent a 6-digit code to ${form.email}. If you cannot see it, check your spam folder.`
      );
    } catch (err) {
      setError(errorText(err, "Could not send the code"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/register", {
        ...form,
        phone: form.phone || null,
        location: form.location || null,
        category: form.category || null,
      });
      navigate("/login");
    } catch (err) {
      setError(errorText(err, "Registration failed. Check your details."));
    } finally {
      setBusy(false);
    }
  }

  function changeEmail() {
    setStep(1);
    setForm({ ...form, code: "" });
    setInfo("");
    setError("");
    setCooldown(0);
  }

  if (step === 1) {
    return (
      <div className="page">
        <h1>Create account</h1>
        <p className="meta">
          First, verify your email. We will send you a 6-digit code.
        </p>
        <form onSubmit={sendCode}>
          <label>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Sending..." : "Send verification code"}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Create account</h1>
      {info && <p className="info">{info}</p>}

      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input name="email" type="email" value={form.email} disabled />

        <label>Verification code</label>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="6-digit code"
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: e.target.value.replace(/\D/g, "") })
          }
          required
        />
        <p>
          <button
            type="button"
            className="text-btn"
            onClick={sendCode}
            disabled={busy || cooldown > 0}
          >
            {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
          </button>
          <button type="button" className="text-btn" onClick={changeEmail}>
            Change email
          </button>
        </p>

        <label>Name</label>
        <input name="name" value={form.name} onChange={handleChange} required />

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
        <button type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create account"}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default Register;