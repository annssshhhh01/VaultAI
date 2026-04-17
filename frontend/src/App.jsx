import { useState, useRef, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import MediaPlayer from "./components/MediaPlayer";
import MessageBubble from "./components/MessageBubble";
import { askQuestion } from "./services/api";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [seekTo, setSeekTo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleUploadSuccess(info) {
    setMediaInfo(info);
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        text: `"${info.file.name}" ready. Ask me anything about it.`,
      },
    ]);
  }

  async function handleSend() {
    const q = question.trim();
    if (!q || loading) return;

    setQuestion("");
    // Re-focus immediately for better UX
    setTimeout(() => inputRef.current?.focus(), 0);

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const data = await askQuestion(q);
      const isSummary = q.toLowerCase().includes("summarize") || q.toLowerCase().includes("summary");

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

  const hasMedia = mediaInfo && (mediaInfo.fileType === "audio" || mediaInfo.fileType === "video");

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#logo-grad)"/>
              <defs>
                <linearGradient id="logo-grad" x1="2" y1="2" x2="22" y2="22">
                  <stop stopColor="#A78BFA" />
                  <stop offset="1" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
            <span className="sidebar__logo-text">RAG Nova</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <div className="sidebar__section">
          <p className="sidebar__section-label">Source Document</p>
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>

        {hasMedia && (
          <div className="sidebar__section">
            <p className="sidebar__section-label">Media Player</p>
            <MediaPlayer
              mediaFile={{ ...mediaInfo.file, url: mediaInfo.url, name: mediaInfo.file.name, type: mediaInfo.file.type }}
              seekTo={seekTo}
              onSeekConsumed={() => setSeekTo(null)}
            />
          </div>
        )}
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="main">
        <header className="topbar">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="topbar__title">
            <h1>Intelligence Engine</h1>
          </div>
          <button className="topbar__clear-btn" onClick={() => setMessages([])} title="Clear Chat">
            New Chat
          </button>
        </header>

        <div className="chat-area">
          {messages.length === 0 && (
            <div className="chat-empty">
              <h2 className="chat-empty__title">How can I help you today?</h2>
              <p className="chat-empty__sub">Upload a document to the workspace, then ask questions or request a summary.</p>
              <div className="chat-empty__tips">
                <span>✦ Summarize this document</span>
                <span>✦ What are the key points?</span>
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
               <div className="message-avatar message-avatar--ai">
                 <div className="loading-indicator">
                    <span className="loading-indicator__circle"></span>
                    <span className="loading-indicator__circle"></span>
                    <span className="loading-indicator__circle"></span>
                 </div>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* ── Gemini/ChatGPT Style Input ── */}
        <div className="input-container">
          <div className="input-box">
            <textarea
              ref={inputRef}
              placeholder="Ask anything about the document..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={loading || !question.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <p className="input-footer">AI can make mistakes. Consider verifying important information.</p>
        </div>
      </main>
    </div>
  );
}
