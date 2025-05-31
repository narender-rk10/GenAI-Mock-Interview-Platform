import React, { useState, useContext, useRef, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Select,
  message,
  Card,
  Slider,
  Typography,
} from "antd";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const Interview = () => {
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const { isDarkMode } = useContext(ThemeContext);

  useEffect(() => {
    // Cleanup stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    // Draw video and text overlay on canvas
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !video || !ctx) {
      console.error("Canvas or video not ready:", { canvas, video, ctx });
      return;
    }

    let animationFrameId;

    const drawCanvas = () => {
      if (video.videoWidth && video.videoHeight) {
        // Set canvas size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw question overlay
        if (showQuestions) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.9)"; // High-contrast black background
          ctx.fillRect(10, 10, 200, 50); // Larger rectangle
          ctx.font = "bold 30px Arial"; // Larger, bold font
          ctx.fillStyle = "#FFFFFF"; // White text
          ctx.fillText(`Question ${currentQuestionIndex + 1}`, 20, 40);
          console.log(`Drawing overlay: Question ${currentQuestionIndex + 1}`);
        }
      } else {
        console.warn("Video dimensions not ready:", {
          width: video.videoWidth,
          height: video.videoHeight,
        });
      }

      if (recording) {
        animationFrameId = requestAnimationFrame(drawCanvas);
      }
    };

    const checkVideoReady = () => {
      if (video.readyState >= 2 && video.videoWidth) {
        console.log(
          "Video ready, starting canvas draw, readyState:",
          video.readyState
        );
        drawCanvas();
      } else {
        console.log("Video not ready, retrying:", {
          readyState: video.readyState,
          width: video.videoWidth,
        });
        setTimeout(checkVideoReady, 100);
      }
    };

    if (recording) {
      checkVideoReady();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [recording, showQuestions, currentQuestionIndex, isDarkMode]);

  const startRecording = async () => {
    console.log("Starting recording...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("Camera stream acquired:", stream);
      setStream(stream);

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("Video srcObject set");
        // Wait for video metadata
        await new Promise((resolve, reject) => {
          videoRef.current.onloadedmetadata = () => {
            console.log("Video metadata loaded:", {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            });
            resolve();
          };
          videoRef.current.onerror = () => {
            console.error("Video error");
            reject(new Error("Video failed to load"));
          };
        });
        videoRef.current
          .play()
          .catch((e) => console.error("Video play error:", e));
      } else {
        console.error("videoRef is null");
      }

      // Start recording canvas stream
      if (canvasRef.current) {
        const canvasStream = canvasRef.current.captureStream(30); // 30 FPS
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
          console.log("Audio track added to canvas stream");
        }
        recordedChunks.current = [];
        mediaRecorderRef.current = new MediaRecorder(canvasStream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.current.push(event.data);
            console.log("Data chunk recorded:", event.data.size);
          }
        };
        mediaRecorderRef.current.start();
        setRecording(true);
        console.log("Recording started, recording state:", true);
      } else {
        console.error("canvasRef is null");
      }
    } catch (error) {
      console.error("Recording error:", error);
      message.error(
        `Failed to start recording: ${error.message}. Please allow camera and microphone access and ensure you're using a secure context (HTTPS or localhost).`
      );
      setShowQuestions(false);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && stream) {
      console.log("Stopping recording...");
      return new Promise((resolve, reject) => {
        mediaRecorderRef.current.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
          setRecording(false);
          console.log("Recording stopped, stream cleared");

          const blob = new Blob(recordedChunks.current, { type: "video/webm" });
          const formData = new FormData();
          formData.append("file", blob, "interview.webm");
          formData.append("session_id", sessionId);

          try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
              `${process.env.REACT_APP_API_URL}/interview/upload-video`,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "multipart/form-data",
                },
              }
            );
            message.success("Video uploaded and analyzed successfully");
            console.log("Upload response:", response.data);
            resolve(response.data);
          } catch (error) {
            console.error("Upload error:", error);
            message.error(
              error.response?.data?.detail || "Failed to upload video"
            );
            reject(error);
          }
        };
        mediaRecorderRef.current.stop();
      });
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    console.log("Form submitted:", values);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/interview/generate-questions`,
        values,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuestions(response.data.questions || []);
      setSessionId(response.data.session_id);
      setShowQuestions(true);
      setCurrentQuestionIndex(0);
      console.log("Questions generated:", response.data.questions);
      message.success("Questions generated. Recording started for Q1.");
      await startRecording();
    } catch (error) {
      console.error("Generate questions error:", error);
      message.error(
        error.response?.data?.detail || "Failed to generate questions"
      );
    }
    setLoading(false);
  };

  const handleNextQuestion = async () => {
    console.log("Next question, current index:", currentQuestionIndex);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setLoading(true);
      try {
        await stopRecording();
        setShowQuestions(false);
        setQuestions([]);
        setSessionId(null);
        setCurrentQuestionIndex(0);
      } catch (error) {
        // Error handled in stopRecording
      }
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "transparent",
      }}
    >
      <Card
        style={{ width: "100%", maxWidth: "600px", padding: "16px" }}
        className="card-content"
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "16px",
            color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
          }}
        >
          Start Interview
        </h2>
        {!showQuestions ? (
          <Form onFinish={onFinish} layout="vertical">
            <Form.Item
              name="job_description"
              label={
                <span style={{ color: isDarkMode ? "#e0e0e0" : "#1a1a1a" }}>
                  Job Description
                </span>
              }
              rules={[
                {
                  required: true,
                  message: "Please input the job description!",
                },
              ]}
            >
              <TextArea
                placeholder="e.g., Software Engineer with 5 years of experience in Python and React"
                rows={5}
              />
            </Form.Item>
            <Form.Item
              name="difficulty"
              label={
                <span style={{ color: isDarkMode ? "#e0e0e0" : "#1a1a1a" }}>
                  Difficulty
                </span>
              }
              rules={[{ required: true, message: "Please select difficulty!" }]}
            >
              <Select
                placeholder="Select difficulty"
                className="dark-mode-select"
              >
                <Option value="easy">Easy</Option>
                <Option value="medium">Medium</Option>
                <Option value="hard">Hard</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="num_questions"
              label={
                <span style={{ color: isDarkMode ? "#e0e0e0" : "#1a1a1a" }}>
                  Number of Questions
                </span>
              }
              rules={[
                {
                  required: true,
                  message: "Please select number of questions!",
                },
              ]}
            >
              <Slider
                min={2}
                max={10}
                step={1}
                marks={{
                  2: {
                    style: { color: isDarkMode ? "#e0e0e0" : "#1a1a1a" },
                    label: "2",
                  },
                  10: {
                    style: { color: isDarkMode ? "#e0e0e0" : "#1a1a1a" },
                    label: "10",
                  },
                }}
                className="dark-mode-slider"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Generate Questions
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Text
              strong
              style={{
                color: isDarkMode ? "#e0e0e0" : "#1a1a1a",
                fontSize: "16px",
              }}
            >
              Question {currentQuestionIndex + 1} of {questions.length}
            </Text>
            <Card
              style={{
                background: isDarkMode ? "#2a2a2a" : "#ffffff",
                borderColor: isDarkMode ? "#3a3a3a" : "#d9d9d9",
              }}
            >
              <Text
                style={{
                  color: isDarkMode ? "#a0a0a0" : "#5c5c5c",
                  fontSize: "14px",
                }}
              >
                {currentQuestionIndex + 1}. {questions[currentQuestionIndex]}
              </Text>
            </Card>
            <video
              ref={videoRef}
              autoPlay
              muted
              style={{
                position: "absolute",
                visibility: "hidden", // Hidden but renders
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                maxWidth: "400px",
                borderRadius: "4px",
                border: isDarkMode ? "1px solid #3a3a3a" : "1px solid #d9d9d9",
                background: isDarkMode ? "#1a1a1a" : "#f0f2f5",
                alignSelf: "center",
              }}
            />
            <Button
              type="primary"
              onClick={handleNextQuestion}
              loading={loading}
              style={{ alignSelf: "flex-end" }}
            >
              {currentQuestionIndex < questions.length - 1
                ? "Next"
                : "Submit Video"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Interview;
