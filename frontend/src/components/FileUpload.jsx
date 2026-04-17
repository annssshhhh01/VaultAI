import { useState, useRef } from "react";
import { uploadFile, getFileType } from "../services/api";

const ACCEPT = ".pdf,.mp3,.wav,.mp4,.m4a,.ogg,.webm";

const FILE_TYPE_META = {
  pdf: { icon: "📄", label: "PDF Document", color: "text-red-400" },
  audio: { icon: "🎵", label: "Audio File", color: "text-purple-400" },
  video: { icon: "🎬", label: "Video File", color: "text-blue-400" },
  unknown: { icon: "📁", label: "File", color: "text-gray-400" },
};

export default function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const fileType = file ? getFileType(file) : null;
  const meta = fileType ? FILE_TYPE_META[fileType] : null;

  function handleFileSelect(selected) {
    if (!selected) return;
    setFile(selected);
    setStatus("idle");
    setProgress(0);
    setErrorMsg("");
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      const result = await uploadFile(file, setProgress);
      setStatus("success");
      onUploadSuccess({ file, fileType, url: URL.createObjectURL(file) });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }

  function handleReset() {
    setFile(null);
    setProgress(0);
    setStatus("idle");
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="file-upload-card">
      {/* Drop Zone */}
      <div
        className={`drop-zone ${isDragging ? "drop-zone--active" : ""} ${file ? "drop-zone--has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />

        {!file ? (
          <div className="drop-zone__empty">
            <div className="drop-zone__icon">⬆️</div>
            <p className="drop-zone__title">Drop your file here</p>
            <p className="drop-zone__sub">or click to browse</p>
            <p className="drop-zone__types">PDF · MP3 · WAV · MP4</p>
          </div>
        ) : (
          <div className="drop-zone__file">
            <span className={`drop-zone__file-icon ${meta.color}`}>{meta.icon}</span>
            <div className="drop-zone__file-info">
              <p className="drop-zone__file-name">{file.name}</p>
              <p className="drop-zone__file-meta">
                {meta.label} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {status !== "uploading" && (
              <button className="drop-zone__clear-btn" onClick={(e) => { e.stopPropagation(); handleReset(); }}>
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {status === "uploading" && (
        <div className="upload-progress">
          <div className="upload-progress__bar">
            <div className="upload-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="upload-progress__label">{progress}% uploaded…</p>
        </div>
      )}

      {/* Success / Error Banner */}
      {status === "success" && (
        <div className="upload-banner upload-banner--success">
          ✅ File uploaded successfully! You can now ask questions about it.
        </div>
      )}
      {status === "error" && (
        <div className="upload-banner upload-banner--error">
          ❌ {errorMsg}
        </div>
      )}

      {/* Action Buttons */}
      <div className="upload-actions">
        <button
          className="btn btn--upload"
          onClick={handleUpload}
          disabled={!file || status === "uploading" || status === "success"}
        >
          {status === "uploading" ? "Uploading…" : status === "success" ? "Uploaded ✓" : "Upload File"}
        </button>
        {status === "success" && (
          <button className="btn btn--reset" onClick={handleReset}>
            Upload another
          </button>
        )}
      </div>
    </div>
  );
}
