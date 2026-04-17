import { useState, useEffect } from "react";

/**
 * Formats seconds → MM:SS display
 */
function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined) return "";
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function MessageBubble({ message, onPlayTimestamp }) {
  const { role, text, isSummary, timestamp, sources } = message;
  const isUser = role === "user";
  const isSystem = role === "system";

  // Typewriter streaming state for AI messages
  const [displayedText, setDisplayedText] = useState(
    isUser || isSystem ? text : ""
  );
  const [isTyping, setIsTyping] = useState(!isUser && !isSystem);

  useEffect(() => {
    if (isUser || isSystem) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    let i = 0;
    setIsTyping(true);
    setDisplayedText("");

    const intervalId = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) {
        clearInterval(intervalId);
        setIsTyping(false);
      }
    }, 8);

    return () => clearInterval(intervalId);
  }, [text, isUser, isSystem]);

  // ── System Message ──
  if (isSystem) {
    return (
      <div className="system-message">
        <div className="system-message__inner">
          <span className="system-message__icon">✦</span>
          {text}
        </div>
      </div>
    );
  }

  // ── User / AI Message ──
  return (
    <div
      className={`message-row ${
        isUser ? "message-row--user" : "message-row--ai"
      } ${isSummary ? "message-bubble--summary" : ""}`}
    >
      <div className="message-inner">
        {/* Avatar */}
        <div
          className={`message-avatar ${
            isUser ? "message-avatar--user" : "message-avatar--ai"
          }`}
        >
          {isUser ? (
            "U"
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
                fill="#fff"
              />
            </svg>
          )}
        </div>

        {/* Body */}
        <div className="message-body">
          <p className={`message-role ${!isUser ? "message-role--ai" : ""}`}>
            {isUser ? "You" : "RAG Nova"}
          </p>

          {isSummary && (
            <div className="message-summary-badge">
              <span className="sparkle-icon">✦</span> Summary
            </div>
          )}

          <div className="message-text">
            {displayedText}
            {isTyping && <span className="typing-cursor"></span>}
          </div>

          {/* Timestamp + Play Button */}
          {!isUser &&
            timestamp !== undefined &&
            timestamp !== null &&
            !isTyping && (
              <div className="message-actions">
                <button
                  className="action-btn action-btn--play"
                  onClick={() => onPlayTimestamp?.(timestamp)}
                  title={`Jump to ${formatTimestamp(timestamp)}`}
                >
                  <span className="action-btn__icon">▶</span>
                  Play at {formatTimestamp(timestamp)}
                </button>
              </div>
            )}

          {/* Sources */}
          {!isUser && sources && sources.length > 0 && !isTyping && (
            <div className="message-sources">
              {sources.map((src, i) => (
                <span key={i} className="source-tag">
                  {typeof src === "string"
                    ? src
                    : src.source || src.page || "Doc"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
