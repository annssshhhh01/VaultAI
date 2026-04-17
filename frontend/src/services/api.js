const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Detects whether a file is audio, video, or pdf
 */
export function getFileType(file) {
  const type = file.type;
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  return "unknown";
}

/**
 * Uploads a PDF to /upload
 * Uploads audio/video to /upload/media
 * Returns { success, message }
 */
export async function uploadFile(file, onProgress) {
  const fileType = getFileType(file);
  const endpoint = fileType === "pdf" ? "/upload" : "/upload/media";

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ success: true, data });
        } catch {
          resolve({ success: true, data: {} });
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", `${API_URL}${endpoint}`);
    xhr.send(formData);
  });
}

/**
 * Sends a question to /ask
 * Returns { answer, timestamp?, sources? }
 */
export async function askQuestion(question) {
  const res = await fetch(`${API_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error (${res.status})`);
  }

  return res.json();
}
