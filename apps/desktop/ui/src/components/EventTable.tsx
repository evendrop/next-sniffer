import React from 'react';
import { Event } from '../lib/types';

interface EventTableProps {
  events: Event[];
  selectedEventId: number | null;
  onSelectEvent: (event: Event) => void;
}

export function EventTable({ events, selectedEventId, onSelectEvent }: EventTableProps) {
  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString();
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    return `${ms}ms`;
  };

  const getStatusColor = (status: number | null, phase: string) => {
    if (phase === 'error') return '#dc3545';
    if (status === null) return '#6c757d';
    if (status >= 200 && status < 300) return '#28a745';
    if (status >= 300 && status < 400) return '#ffc107';
    if (status >= 400 && status < 500) return '#fd7e14';
    if (status >= 500) return '#dc3545';
    return '#6c757d';
  };

  const shortenPath = (path: string | null, maxLength: number = 50) => {
    if (!path) return '-';
    return path.length > maxLength ? path.substring(0, maxLength) + '...' : path;
  };

  return (
    <div className="event-table-container">
      <table className="event-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Phase</th>
            <th>Method</th>
            <th>Host</th>
            <th>Path</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Service</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={9} className="event-table-empty">
                No events found
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <tr
                key={event.id}
                className={selectedEventId === event.id ? 'event-table-row-selected' : 'event-table-row'}
                onClick={() => onSelectEvent(event)}
              >
                <td>{formatTime(event.ts)}</td>
                <td>
                  <span className="event-phase-badge" data-phase={event.phase}>
                    {event.phase}
                  </span>
                </td>
                <td>{event.method || '-'}</td>
                <td>{event.host || '-'}</td>
                <td className="event-table-path">{shortenPath(event.path)}</td>
                <td>
                  <span
                    className="event-status-badge"
                    style={{ color: getStatusColor(event.status, event.phase) }}
                  >
                    {event.status || (event.phase === 'error' ? 'Error' : '-')}
                  </span>
                </td>
                <td>{formatDuration(event.duration_ms)}</td>
                <td>{event.service || '-'}</td>
                <td className="event-table-error">
                  {event.error_message ? (
                    <span title={event.error_message}>
                      {event.error_message.length > 30
                        ? event.error_message.substring(0, 30) + '...'
                        : event.error_message}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

