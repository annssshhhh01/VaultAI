import { useState, useEffect } from "react";

/**
 * Formats seconds → MM:SS display
 */
function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined) return "";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MessageBubble({ message, onPlayTimestamp }) {
  const { role, text, isSummary, timestamp, sources } = message;
  const isUser = role === "user";
  const isSystem = role === "system";

  // Typewriter streaming state for AI messages
  const [displayedText, setDisplayedText] = useState(isUser || isSystem ? text : "");
  const [isTyping, setIsTyping] = useState(!isUser && !isSystem);

  useEffect(() => {
    if (isUser || isSystem) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // Streaming simulation
    let i = 0;
    setIsTyping(true);
    setDisplayedText("");
    
    // Quick interval for fast streaming
    const intervalId = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) {
        clearInterval(intervalId);
        setIsTyping(false);
      }
    }, 10); // 10ms per character = extremely fast streaming

    return () => clearInterval(intervalId);
  }, [text, isUser, isSystem]);

  if (isSystem) {
    return (
      <div className="system-message">
        <span className="system-message__icon">✨</span> {text}
      </div>
    );
  }

  return (
    <div className={`message-row ${isUser ? "message-row--user" : "message-row--ai"}`}>
      {!isUser && (
        <div className="message-avatar message-avatar--ai">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#sparkle-gradient)"/>
            <defs>
              <linearGradient id="sparkle-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A78BFA" />
                <stop offset="1" stopColor="#60A5FA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      <div className={`message-bubble ${isUser ? "message-bubble--user" : "message-bubble--ai"} ${isSummary ? "message-bubble--summary" : ""}`}>
        {isSummary && (
          <div className="message-summary-badge">
            <span className="sparkle-icon">✦</span> Summary generated
          </div>
        )}

        <div className="message-text">
          {displayedText}
          {isTyping && <span className="typing-cursor"></span>}
        </div>

        {/* Timestamp + Play */}
        {!isUser && timestamp !== undefined && timestamp !== null && !isTyping && (
          <div className="message-actions">
            <button
              className="action-btn action-btn--play"
              onClick={() => onPlayTimestamp(timestamp)}
              title={`Jump to ${formatTimestamp(timestamp)}`}
            >
              ▶ Play Audio ({formatTimestamp(timestamp)})
            </button>
          </div>
        )}

        {/* Sources */}
        {!isUser && sources && sources.length > 0 && !isTyping && (
          <div className="message-sources">
            {sources.map((src, i) => (
              <span key={i} className="source-tag">
                {typeof src === "string" ? src : src.source || src.page || "Doc"}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
