import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <span className="brand">ReqHub</span>
      <div className="nav-links">
        <Link to="/feed">Feed</Link>
        <Link to="/post">Post a Need</Link>
        <Link to="/my">My Jobs</Link>
        {user && user.role !== "provider" && (
          <Link to="/complaint">Complaint</Link>
        )}
        {user && user.is_admin && <Link to="/admin/complaints">Admin</Link>}
        <button onClick={logout}>Log out</button>
      </div>
    </nav>
  );
}

export default Navbar;