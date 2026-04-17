/**
 * Displays a summary of the uploaded content in the sidebar.
 */
export default function ContentSummary({ summary }) {
  if (!summary) return null;

  return (
    <div className="content-summary">
      <p className="content-summary__title">
        <span>✦</span> Document Overview
      </p>
      <p className="content-summary__text">{summary}</p>
    </div>
  );
}
