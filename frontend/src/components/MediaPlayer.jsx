import { useRef, useEffect } from "react";

export default function MediaPlayer({ mediaFile, seekTo, onSeekConsumed }) {
  const playerRef = useRef(null);

  // When seekTo changes, jump the player to that time and play
  useEffect(() => {
    if (seekTo !== null && playerRef.current) {
      playerRef.current.currentTime = seekTo;
      playerRef.current.play().catch(() => {});
      onSeekConsumed?.();
    }
  }, [seekTo]);

  if (!mediaFile) return null;

  const isAudio = mediaFile.type.startsWith("audio/");
  const isVideo = mediaFile.type.startsWith("video/");

  if (!isAudio && !isVideo) return null;

  return (
    <div className="media-player">
      <div className="media-player__header">
        <span className="media-player__icon">{isAudio ? "🎵" : "🎬"}</span>
        <div>
          <p className="media-player__title">{mediaFile.name}</p>
          <p className="media-player__subtitle">
            Click timestamps in chat to seek
          </p>
        </div>
      </div>

      {isAudio ? (
        <audio
          ref={playerRef}
          src={mediaFile.url}
          controls
          className="media-player__element media-player__element--audio"
        />
      ) : (
        <video
          ref={playerRef}
          src={mediaFile.url}
          controls
          className="media-player__element media-player__element--video"
        />
      )}
    </div>
  );
}
