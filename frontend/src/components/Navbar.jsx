import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

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
        <button onClick={logout}>Log out</button>
      </div>
    </nav>
  );
}

export default Navbar;