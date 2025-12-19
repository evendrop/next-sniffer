import React, { useState } from 'react';
import { Event } from '../lib/types';
import { JsonViewer } from './JsonViewer';
import { generateCurlCommand } from '../lib/api';

interface EventDetailProps {
  event: Event | null;
}

export function EventDetail({ event }: EventDetailProps) {
  const [activeTab, setActiveTab] = useState<'headers' | 'request' | 'response' | 'raw'>('headers');

  if (!event) {
    return (
      <div className="event-detail-empty">
        <p>Select an event to view details</p>
      </div>
    );
  }

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const handleExport = async () => {
    if (window.electronAPI) {
      await window.electronAPI.exportEvent(event);
    }
  };

  const handleCopyCurl = async () => {
    const curl = generateCurlCommand(event);
    await navigator.clipboard.writeText(curl);
    alert('cURL command copied to clipboard!');
  };

  return (
    <div className="event-detail">
      <div className="event-detail-header">
        <div className="event-detail-summary">
          <h3>{event.method || 'N/A'} {event.url}</h3>
          <div className="event-detail-meta">
            <span>Status: {event.status || 'N/A'}</span>
            <span>Duration: {event.duration_ms ? `${event.duration_ms}ms` : 'N/A'}</span>
            <span>Time: {formatTime(event.ts)}</span>
            {event.truncated === 1 && <span className="event-detail-truncated">⚠️ Truncated</span>}
          </div>
        </div>
        <div className="event-detail-actions">
          <button onClick={handleExport} className="btn btn-secondary">
            Export JSON
          </button>
          <button onClick={handleCopyCurl} className="btn btn-secondary">
            Copy as cURL
          </button>
        </div>
      </div>

      <div className="event-detail-tabs">
        <button
          className={activeTab === 'headers' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('headers')}
        >
          Headers
        </button>
        <button
          className={activeTab === 'request' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('request')}
        >
          Request Body
        </button>
        <button
          className={activeTab === 'response' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('response')}
        >
          Response Body
        </button>
        <button
          className={activeTab === 'raw' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('raw')}
        >
          Raw JSON
        </button>
      </div>

      <div className="event-detail-content">
        {activeTab === 'headers' && (
          <div className="event-detail-headers">
            <div className="event-detail-headers-section">
              <h4>Request Headers</h4>
              {event.req_headers ? (
                <table className="headers-table">
                  <tbody>
                    {Object.entries(event.req_headers).map(([key, value]) => (
                      <tr key={key}>
                        <td className="header-key">{key}</td>
                        <td className="header-value">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No request headers</p>
              )}
            </div>
            <div className="event-detail-headers-section">
              <h4>Response Headers</h4>
              {event.res_headers ? (
                <table className="headers-table">
                  <tbody>
                    {Object.entries(event.res_headers).map(([key, value]) => (
                      <tr key={key}>
                        <td className="header-key">{key}</td>
                        <td className="header-value">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No response headers</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'request' && (
          <JsonViewer data={event.request_body} truncated={event.truncated === 1} />
        )}

        {activeTab === 'response' && (
          <JsonViewer data={event.response_body} truncated={event.truncated === 1} />
        )}

        {activeTab === 'raw' && <JsonViewer data={event} />}
      </div>
    </div>
  );
}

