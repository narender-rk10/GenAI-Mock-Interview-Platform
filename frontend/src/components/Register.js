import React, { useState, useContext } from "react";
import { Form, Input, Button, message, Card } from "antd";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";

const Register = ({ setAuth }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useContext(ThemeContext);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      console.log("API URL:", process.env.REACT_APP_API_URL);
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/register`, {
        email: values.email,
        password: values.password,
      });
      message.success("Registration successful. Please log in.");
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);
      let errorMessage = "Registration failed";
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
          Register
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
              Register
            </Button>
          </Form.Item>
          <div style={{ textAlign: "center" }}>
            <Button type="link" onClick={() => navigate("/login")}>
              Already have an account? Login
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
