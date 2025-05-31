import React, { useContext } from "react";
import { Button, Switch } from "antd";
import { useNavigate, Link } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";

const Navbar = ({ setAuth, auth }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuth(false);
    navigate("/login");
  };

  return (
    <nav className="navbar" style={{ width: "100%", padding: "10px 0" }}>
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Left Section */}
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "20px",
              color: isDarkMode ? "#e0e0e0" : "#1890ff",
            }}
          >
            AI Mock Interview
          </h1>
        </div>

        {/* Center Section */}
        <div
          style={{
            flex: 2,
            display: "flex",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          {auth ? (
            <>
              <Link
                to="/dashboard"
                style={{
                  color: isDarkMode ? "#69c0ff" : "#1890ff",
                  textDecoration: "none",
                  fontSize: "16px",
                }}
              >
                Dashboard
              </Link>
              <Link
                to="/interview"
                style={{
                  color: isDarkMode ? "#69c0ff" : "#1890ff",
                  textDecoration: "none",
                  fontSize: "16px",
                }}
              >
                Interview
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: isDarkMode ? "#69c0ff" : "#1890ff",
                  textDecoration: "none",
                  fontSize: "16px",
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  color: isDarkMode ? "#69c0ff" : "#1890ff",
                  textDecoration: "none",
                  fontSize: "16px",
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Right Section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Switch
            checked={isDarkMode}
            onChange={toggleDarkMode}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            size="default"
            style={{ background: isDarkMode ? "#4a4a4a" : "#d9d9d9" }}
          />
          {auth && (
            <Button type="primary" size="middle" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
