import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Interview from "./components/Interview";
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";
import { Layout } from "antd";

const { Content } = Layout;

const App = () => {
  const [auth, setAuth] = useState(!!localStorage.getItem("token"));

  return (
    <Router>
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        <Navbar setAuth={setAuth} auth={auth} />
        <Content className="content">
          <Routes>
            <Route
              path="/login"
              element={
                auth ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Login setAuth={setAuth} />
                )
              }
            />
            <Route
              path="/register"
              element={
                auth ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Register setAuth={setAuth} />
                )
              }
            />
            <Route
              path="/interview"
              element={auth ? <Interview /> : <Navigate to="/login" />}
            />
            <Route
              path="/dashboard"
              element={
                auth ? (
                  <Dashboard setAuth={setAuth} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/"
              element={<Navigate to={auth ? "/dashboard" : "/login"} />}
            />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
};

export default App;
