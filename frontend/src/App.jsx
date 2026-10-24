import { Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import PostNeed from "./pages/PostNeed";
import MyJobs from "./pages/MyJobs";
import RequestDetail from "./pages/RequestDetail";
import Complaint from "./pages/Complaint";
import AdminComplaints from "./pages/AdminComplaints";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/post"
        element={
          <ProtectedRoute>
            <PostNeed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my"
        element={
          <ProtectedRoute>
            <MyJobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <ProtectedRoute>
            <RequestDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaint"
        element={
          <ProtectedRoute>
            <Complaint />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/complaints"
        element={
          <ProtectedRoute>
            <AdminComplaints />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;