import { useState, useRef, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import MediaPlayer from "./components/MediaPlayer";
import MessageBubble from "./components/MessageBubble";
import ContentSummary from "./components/ContentSummary";
import { askQuestion } from "./services/api";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [seekTo, setSeekTo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedSummary, setUploadedSummary] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 180) + "px";
    }
  }, [question]);

  function handleUploadSuccess(info) {
    setMediaInfo(info);
    setUploadedSummary(info.summary || null);
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        text: `"${info.file.name}" uploaded and processed. Ask me anything about it.`,
      },
    ]);
  }

  function handleTipClick(text) {
    setQuestion(text);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleSend() {
    const q = question.trim();
    if (!q || loading) return;

    setQuestion("");
    setTimeout(() => textareaRef.current?.focus(), 0);

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const data = await askQuestion(q);
      const isSummary =
        q.toLowerCase().includes("summarize") ||
        q.toLowerCase().includes("summary");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          timestamp: data.timestamp ?? null,
          sources: data.sources ?? [],
          isSummary,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: `Error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleNewChat() {
    setMessages([]);
    setUploadedSummary(null);
  }

  const hasMedia =
    mediaInfo &&
    (mediaInfo.fileType === "audio" || mediaInfo.fileType === "video");

  return (
    <div className="app">
      {/* ── Mobile Overlay ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
                  fill="#fff"
                />
              </svg>
            </div>
            <span className="sidebar__logo-text">
              RAG <span>Nova</span>
            </span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <div className="sidebar__body">
          <div>
            <button className="sidebar__new-chat-btn" onClick={handleNewChat}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Chat
            </button>
          </div>

          <div>
            <p className="sidebar__section-label">Upload Document</p>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>

          {uploadedSummary && (
            <div>
              <p className="sidebar__section-label">Content Summary</p>
              <ContentSummary summary={uploadedSummary} />
            </div>
          )}

          {hasMedia && (
            <div>
              <p className="sidebar__section-label">Media Player</p>
              <MediaPlayer
                mediaFile={{
                  ...mediaInfo.file,
                  url: mediaInfo.url,
                  name: mediaInfo.file.name,
                  type: mediaInfo.file.type,
                }}
                seekTo={seekTo}
                onSeekConsumed={() => setSeekTo(null)}
              />
            </div>
          )}
        </div>

        <div className="sidebar__footer">
          <div className="sidebar__footer-avatar">A</div>
          <div className="sidebar__footer-info">
            <p className="sidebar__footer-name">User</p>
            <p className="sidebar__footer-plan">RAG Nova Pro</p>
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div className="topbar__title">
              <h1>RAG Nova</h1>
              <span className="topbar__model-badge">AI Engine</span>
            </div>
          </div>
          <button
            className="topbar__clear-btn"
            onClick={handleNewChat}
            title="Start new chat"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Chat
          </button>
        </header>

        <div className="chat-area">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty__logo">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
                    fill="#fff"
                  />
                </svg>
              </div>
              <h2 className="chat-empty__title">
                What can I help you with?
              </h2>
              <p className="chat-empty__sub">
                Upload a PDF, audio, or video file — then ask questions, request
                summaries, or explore specific topics.
              </p>
              <div className="chat-empty__tips">
                <div
                  className="chat-empty__tip"
                  onClick={() => handleTipClick("Summarize this document")}
                >
                  <span className="chat-empty__tip-icon">✦</span>
                  Summarize this document
                </div>
                <div
                  className="chat-empty__tip"
                  onClick={() => handleTipClick("What are the key points?")}
                >
                  <span className="chat-empty__tip-icon">✦</span>
                  What are the key points?
                </div>
                <div
                  className="chat-empty__tip"
                  onClick={() =>
                    handleTipClick("What topics are discussed at what timestamps?")
                  }
                >
                  <span className="chat-empty__tip-icon">✦</span>
                  Find topics by timestamp
                </div>
                <div
                  className="chat-empty__tip"
                  onClick={() =>
                    handleTipClick("Explain the main conclusions")
                  }
                >
                  <span className="chat-empty__tip-icon">✦</span>
                  Explain main conclusions
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              onPlayTimestamp={hasMedia ? setSeekTo : null}
            />
          ))}

          {loading && (
            <div className="message-row message-row--ai">
              <div className="message-inner">
                <div className="message-avatar message-avatar--ai">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
                      fill="#fff"
                    />
                  </svg>
                </div>
                <div className="message-body">
                  <p className="message-role message-role--ai">RAG Nova</p>
                  <div className="loading-dots">
                    <span className="loading-dots__dot"></span>
                    <span className="loading-dots__dot"></span>
                    <span className="loading-dots__dot"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div className="input-container">
          <div className="input-box">
            <textarea
              ref={textareaRef}
              placeholder="Message RAG Nova..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={loading || !question.trim()}
              aria-label="Send message"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <p className="input-footer">
            RAG Nova can make mistakes. Consider verifying important information.
          </p>
        </div>
      </main>
    </div>
  );
}
