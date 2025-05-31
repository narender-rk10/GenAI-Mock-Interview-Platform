import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Typography,
  Button,
  message,
  Spin,
  List,
  Progress,
  Collapse,
  Table,
  Menu,
  Drawer,
  Layout,
} from "antd";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { PlusOutlined, MenuOutlined } from "@ant-design/icons";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const { Title: AntTitle, Text } = Typography;
const { Panel } = Collapse;
const { Sider, Content } = Layout;

const Dashboard = ({ setAuth }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useContext(ThemeContext);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          message.error("Please login to view dashboard");
          setAuth(false);
          navigate("/login");
          return;
        }
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/interview/dashboard`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const sortedSessions = (response.data.sessions || []).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setSessions(sortedSessions);
        if (sortedSessions.length > 0) {
          setSelectedSessionId(sortedSessions[0].session_id);
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        if (error.response?.status === 401) {
          message.error("Session expired. Please login again.");
          localStorage.removeItem("token");
          setAuth(false);
          navigate("/login");
        } else {
          message.error(
            error.response?.data?.detail || "Failed to load dashboard"
          );
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [navigate, setAuth]);

  const selectedSession = sessions.find(
    (s) => s.session_id === selectedSessionId
  );

  const renderScoreChart = (analytics) => {
    if (!analytics?.questions?.length) {
      return null;
    }

    const data = {
      labels: analytics.questions.map((_, i) => `Q${i + 1}`),
      datasets: [
        {
          label: "Score",
          data: analytics.questions.map((q) => q.score || 0),
          backgroundColor: isDarkMode
            ? "rgba(100, 200, 200, 0.6)"
            : "rgba(75, 192, 192, 0.6)",
          borderColor: isDarkMode
            ? "rgba(100, 200, 200, 1)"
            : "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, title: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: isDarkMode ? "#e0e0e0" : "#5c5c5c",
            font: { size: 10 },
          },
          grid: { color: isDarkMode ? "#3a3a3a" : "#e8e8e8" },
        },
        x: {
          ticks: {
            color: isDarkMode ? "#e0e0e0" : "#5c5c5c",
            font: { size: 10 },
          },
          grid: { display: false },
        },
      },
    };

    return (
      <div className="chart-container" style={{ height: "80px" }}>
        <Bar data={data} options={options} />
      </div>
    );
  };

  const renderCommunicationPieChart = (communication) => {
    const strengthsCount = (communication?.strengths || []).length;
    const improvementAreasCount = (communication?.improvementAreas || [])
      .length;
    const total = strengthsCount + improvementAreasCount;

    if (total === 0) return null;

    const data = {
      labels: ["Strengths", "Improvement Areas"],
      datasets: [
        {
          data: [strengthsCount, improvementAreasCount],
          backgroundColor: isDarkMode
            ? ["#2b6cb0", "#c53030"]
            : ["#1890ff", "#ff4d4f"],
          borderColor: isDarkMode
            ? ["#2b6cb0", "#c53030"]
            : ["#1890ff", "#ff4d4f"],
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: isDarkMode ? "#e0e0e0" : "#5c5c5c",
            font: { size: 10 },
          },
        },
      },
    };

    return (
      <div
        className="chart-container"
        style={{ height: "120px", marginTop: "12px" }}
      >
        <Text
          strong
          style={{
            color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
            fontSize: "12px",
          }}
        >
          Communication Breakdown
        </Text>
        <Pie data={data} options={options} />
      </div>
    );
  };

  const renderResponseTimeTimeline = (analytics) => {
    if (!analytics?.questions?.length) {
      return null;
    }

    const totalTime = analytics.questions.reduce(
      (sum, q) => sum + (q.time_consumed_seconds || 0),
      0
    );

    return (
      <div style={{ marginTop: "12px" }}>
        <Text
          strong
          style={{
            color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
            fontSize: "12px",
          }}
        >
          Response Time (Total: {totalTime.toFixed(1)}s)
        </Text>
        {analytics.questions.map((q, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "4px 0",
            }}
          >
            <Text
              style={{
                color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                fontSize: "12px",
              }}
            >
              Q{i + 1}:
            </Text>
            <Progress
              percent={((q.time_consumed_seconds || 0) / totalTime) * 100}
              size="small"
              strokeColor={isDarkMode ? "#2b6cb0" : "#1890ff"}
              showInfo={false}
              style={{ width: "100px" }}
            />
            <Text
              style={{
                color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                fontSize: "12px",
              }}
            >
              {(q.time_consumed_seconds || 0).toFixed(1)}s
            </Text>
          </div>
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: "Question",
      dataIndex: "question",
      key: "question",
      render: (text) => (
        <Text style={{ color: isDarkMode ? "#e0e0e0" : "#1a1a1a" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Answer",
      dataIndex: "answer",
      key: "answer",
      render: (text) => (
        <Text style={{ color: isDarkMode ? "#a0a0a0" : "#5c5c5c" }}>
          {text || "No answer"}
        </Text>
      ),
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      render: (score) => (
        <Text style={{ color: isDarkMode ? "#e0e0e0" : "#1a1a1a" }}>
          {score || 0}
        </Text>
      ),
    },
    {
      title: "Body Language",
      dataIndex: "body_language",
      key: "body_language",
      render: (text) => (
        <Text style={{ color: isDarkMode ? "#a0a0a0" : "#5c5c5c" }}>
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Communication",
      dataIndex: "communication",
      key: "communication",
      render: (text) => (
        <Text style={{ color: isDarkMode ? "#a0a0a0" : "#5c5c5c" }}>
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Time (s)",
      dataIndex: "time_consumed_seconds",
      key: "time",
      render: (time) => (
        <Text style={{ color: isDarkMode ? "#e0e0e0" : "#1a1a1a" }}>
          {(time || 0).toFixed(1)}
        </Text>
      ),
    },
  ];

  const renderInsights = (insights) => (
    <div style={{ marginTop: "12px" }}>
      <Text
        strong
        style={{ color: isDarkMode ? "#e0e0e0" : "#1a1a1a", fontSize: "14px" }}
      >
        Feedback Insights:
      </Text>
      <List
        dataSource={insights || []}
        renderItem={(item) => (
          <List.Item style={{ padding: "4px 0" }}>
            <Text
              style={{
                color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                fontSize: "12px",
              }}
            >
              {item}
            </Text>
          </List.Item>
        )}
      />
    </div>
  );

  const renderCommunicationAnalysis = (communication) => (
    <div style={{ marginTop: "12px" }}>
      <Text
        strong
        style={{ color: isDarkMode ? "#e0e0e0" : "#1a1a1a", fontSize: "14px" }}
      >
        Communication Analysis:
      </Text>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        <Text
          style={{
            color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
            fontSize: "12px",
          }}
        >
          <strong>Score:</strong> {communication.score || 0}/10
        </Text>
        <Text
          style={{
            color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
            fontSize: "12px",
          }}
        >
          <strong>Feedback:</strong>{" "}
          {communication.overallFeedback || "No feedback available."}
        </Text>
        <Text
          strong
          style={{
            color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
            fontSize: "12px",
          }}
        >
          Quotes:
        </Text>
        <List
          dataSource={communication.supportingQuotes || []}
          renderItem={(item) => (
            <List.Item style={{ padding: "4px 0" }}>
              <Text
                style={{
                  color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                  fontSize: "12px",
                }}
              >
                <strong>
                  {item.type === "strength" ? "Strength" : "Improvement"}:
                </strong>{" "}
                "{item.quote}" - {item.analysis}
              </Text>
            </List.Item>
          )}
        />
        <Text
          strong
          style={{
            color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
            fontSize: "12px",
          }}
        >
          Strengths:
        </Text>
        <List
          dataSource={communication.strengths || []}
          renderItem={(item) => (
            <List.Item style={{ padding: "4px 0" }}>
              <Text
                style={{
                  color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                  fontSize: "12px",
                }}
              >
                - {item}
              </Text>
            </List.Item>
          )}
        />
        <Text
          strong
          style={{
            color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
            fontSize: "12px",
          }}
        >
          Improvement Areas:
        </Text>
        <List
          dataSource={communication.improvementAreas || []}
          renderItem={(item) => (
            <List.Item style={{ padding: "4px 0" }}>
              <Text
                style={{
                  color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                  fontSize: "12px",
                }}
              >
                - {item}
              </Text>
            </List.Item>
          )}
        />
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Sider
        width={200}
        style={{
          background: isDarkMode ? "#2a2a2a" : "#f0f2f5",
          borderRight: isDarkMode ? "1px solid #3a3a3a" : "1px solid #e8e8e8",
          display: window.innerWidth <= 768 ? "none" : "block",
        }}
      >
        <div style={{ padding: "16px" }}>
          <AntTitle
            level={4}
            style={{
              color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
              marginBottom: "16px",
            }}
          >
            Sessions
          </AntTitle>
          <Menu
            mode="inline"
            selectedKeys={[selectedSessionId]}
            onClick={({ key }) => setSelectedSessionId(key)}
            style={{ background: "transparent" }}
          >
            {sessions.map((session) => (
              <Menu.Item
                key={session.session_id}
                style={{
                  color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                  fontSize: "12px",
                }}
              >
                {session.session_id.slice(0, 8)}... (
                {new Date(session.created_at).toLocaleDateString()})
              </Menu.Item>
            ))}
          </Menu>
        </div>
      </Sider>
      <Drawer
        title="Sessions"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        bodyStyle={{
          padding: 0,
          background: isDarkMode ? "#2a2a2a" : "#f0f2f5",
        }}
        headerStyle={{
          background: isDarkMode ? "#2a2a2a" : "#f0f2f5",
          color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
        }}
      >
        <Menu
          mode="inline"
          selectedKeys={[selectedSessionId]}
          onClick={({ key }) => {
            setSelectedSessionId(key);
            setDrawerVisible(false);
          }}
          style={{ background: "transparent" }}
        >
          {sessions.map((session) => (
            <Menu.Item
              key={session.session_id}
              style={{
                color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                fontSize: "12px",
              }}
            >
              {session.session_id.slice(0, 8)}... (
              {new Date(session.created_at).toLocaleDateString()})
            </Menu.Item>
          ))}
        </Menu>
      </Drawer>
      <Content style={{ padding: "16px", background: "transparent" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <AntTitle
              level={2}
              style={{
                margin: 0,
                color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
                fontSize: "24px",
              }}
            >
              Interview Dashboard
            </AntTitle>
            <div style={{ display: "flex", gap: "8px" }}>
              {window.innerWidth <= 768 && (
                <Button
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerVisible(true)}
                />
              )}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/interview")}
                style={{ borderRadius: "4px" }}
              >
                Create Interview
              </Button>
            </div>
          </div>
          {loading ? (
            <Spin style={{ display: "block", margin: "40px auto" }} />
          ) : sessions.length === 0 ? (
            <Card
              className="card-content"
              style={{
                textAlign: "center",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            >
              <Text
                style={{
                  color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                  fontSize: "14px",
                }}
              >
                No interviews found. Start a new session!
              </Text>
              <Button
                type="primary"
                style={{ marginTop: "12px" }}
                onClick={() => navigate("/interview")}
              >
                Create Interview
              </Button>
            </Card>
          ) : !selectedSession ? (
            <Card
              className="card-content"
              style={{
                textAlign: "center",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            >
              <Text
                style={{
                  color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                  fontSize: "14px",
                }}
              >
                Select a session from the sidebar to view details.
              </Text>
            </Card>
          ) : (
            <Card
              className="card-content"
              style={{ borderRadius: "8px", padding: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <Text
                  strong
                  style={{
                    color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
                    fontSize: "16px",
                  }}
                >
                  {selectedSession.job_description || "Untitled Session"}
                </Text>
                <Text
                  style={{
                    color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                    fontSize: "12px",
                  }}
                >
                  Created:{" "}
                  {new Date(selectedSession.created_at).toLocaleString()}
                </Text>
                <Text
                  style={{
                    color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                    fontSize: "12px",
                  }}
                >
                  Difficulty: {selectedSession.difficulty || "N/A"}
                </Text>
                <Text
                  style={{
                    color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                    fontSize: "12px",
                  }}
                >
                  Questions: {selectedSession.num_questions || 0}
                </Text>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Text
                    style={{
                      color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                      fontSize: "12px",
                    }}
                  >
                    Overall Score:
                  </Text>
                  <Progress
                    percent={selectedSession.analytics?.overall_score || 0}
                    size="small"
                    strokeColor={isDarkMode ? "#2b6cb0" : "#1890ff"}
                    style={{
                      width: "100px",
                      color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                    }}
                  />
                </div>
                {renderScoreChart(selectedSession.analytics)}
                {selectedSession.video_url && (
                  <div style={{ margin: "12px 0" }}>
                    <video
                      controls
                      src={selectedSession.video_url}
                      className="video-player"
                    />
                  </div>
                )}
                <Collapse
                  style={{ background: "transparent" }}
                  defaultActiveKey={["1"]}
                  className="dark-mode-collapse"
                >
                  <Panel
                    header={
                      <Text
                        style={{
                          color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
                          fontSize: "14px",
                        }}
                      >
                        Detailed Analysis
                      </Text>
                    }
                    key="1"
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <Text
                        strong
                        style={{
                          color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
                          fontSize: "14px",
                        }}
                      >
                        Questions and Responses:
                      </Text>
                      <Table
                        columns={columns}
                        dataSource={selectedSession.analytics?.questions || []}
                        pagination={false}
                        rowKey={(record, index) => index}
                        size="small"
                        className="dark-mode-table"
                      />
                      {renderInsights(selectedSession.analytics?.insights)}
                      {renderCommunicationAnalysis(
                        selectedSession.analytics?.communication || {}
                      )}
                      {renderCommunicationPieChart(
                        selectedSession.analytics?.communication
                      )}
                      {renderResponseTimeTimeline(selectedSession.analytics)}
                    </div>
                  </Panel>
                </Collapse>
              </div>
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default Dashboard;
