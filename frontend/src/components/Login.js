import React, { useState, useContext } from "react";
import { Form, Input, Button, message, Card } from "antd";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

const Login = ({ setAuth }) => {
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      console.log("API URL:", process.env.REACT_APP_API_URL);
      const formData = new URLSearchParams();
      formData.append("username", values.email);
      formData.append("password", values.password);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/token`,
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      localStorage.setItem("token", response.data.access_token);
      setAuth(true);
      message.success("Login successful");
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed";
      if (error.response?.data?.detail) {
        errorMessage = Array.isArray(error.response.data.detail)
          ? error.response.data.detail.map((err) => err.msg).join(", ")
          : error.response.data.detail;
      }
      message.error(errorMessage);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <Card
        style={{ width: "100%", maxWidth: "400px", padding: "24px" }}
        className="card-content"
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "24px",
            color: isDarkMode ? "#fff" : "#000",
          }}
        >
          Login
        </h2>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            name="email"
            label={
              <span style={{ color: isDarkMode ? "#fff" : "#000" }}>Email</span>
            }
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input placeholder="Email" />
          </Form.Item>
          <Form.Item
            name="password"
            label={
              <span style={{ color: isDarkMode ? "#fff" : "#000" }}>
                Password
              </span>
            }
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Login
            </Button>
          </Form.Item>
          <div style={{ textAlign: "center" }}>
            <Button type="link" onClick={() => navigate("/register")}>
              Don't have an account? Register
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
