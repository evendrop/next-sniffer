import React from 'react';

interface JsonViewerProps {
  data: any;
  truncated?: boolean;
}

export function JsonViewer({ data, truncated }: JsonViewerProps) {
  if (data === null || data === undefined) {
    return <div className="json-viewer-empty">No data</div>;
  }

  let jsonStr: string;
  let parseError: string | null = null;

  try {
    if (typeof data === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(data);
        jsonStr = JSON.stringify(parsed, null, 2);
      } catch {
        jsonStr = data;
      }
    } else {
      jsonStr = JSON.stringify(data, null, 2);
    }
  } catch (error: any) {
    parseError = error.message;
    jsonStr = String(data);
  }

  return (
    <div className="json-viewer">
      {truncated && (
        <div className="json-viewer-truncated">
          ⚠️ Content truncated (max 200KB)
        </div>
      )}
      {parseError && (
        <div className="json-viewer-error">
          Parse error: {parseError}
        </div>
      )}
      <pre className="json-viewer-content">
        <code>{jsonStr}</code>
      </pre>
    </div>
  );
}

