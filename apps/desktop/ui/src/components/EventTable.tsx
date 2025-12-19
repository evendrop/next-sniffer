import React from 'react';
import { Event } from '../lib/types';

interface EventTableProps {
  events: Event[];
  selectedEventId: number | null;
  onSelectEvent: (event: Event) => void;
  visibleColumns: string[];
}

const COLUMN_DEFINITIONS = {
  time: { label: 'Time', key: 'time' },
  phase: { label: 'Phase', key: 'phase' },
  method: { label: 'Method', key: 'method' },
  host: { label: 'Host', key: 'host' },
  path: { label: 'Path', key: 'path' },
  status: { label: 'Status', key: 'status' },
  duration: { label: 'Duration', key: 'duration' },
  service: { label: 'Service', key: 'service' },
  error: { label: 'Error', key: 'error' },
} as const;

export function EventTable({ events, selectedEventId, onSelectEvent, visibleColumns }: EventTableProps) {
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

  const renderCell = (columnKey: string, event: Event) => {
    switch (columnKey) {
      case 'time':
        return <td key={columnKey}>{formatTime(event.ts)}</td>;
      case 'phase':
        return (
          <td key={columnKey}>
            <span className="event-phase-badge" data-phase={event.phase}>
              {event.phase}
            </span>
          </td>
        );
      case 'method':
        return <td key={columnKey}>{event.method || '-'}</td>;
      case 'host':
        return <td key={columnKey}>{event.host || '-'}</td>;
      case 'path':
        return <td key={columnKey} className="event-table-path">{shortenPath(event.path)}</td>;
      case 'status':
        return (
          <td key={columnKey}>
            <span
              className="event-status-badge"
              style={{ color: getStatusColor(event.status, event.phase) }}
            >
              {event.status || (event.phase === 'error' ? 'Error' : '-')}
            </span>
          </td>
        );
      case 'duration':
        return <td key={columnKey}>{formatDuration(event.duration_ms)}</td>;
      case 'service':
        return <td key={columnKey}>{event.service || '-'}</td>;
      case 'error':
        return (
          <td key={columnKey} className="event-table-error">
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
        );
      default:
        return null;
    }
  };

  const columnCount = visibleColumns.length || 9;

  return (
    <div className="event-table-container">
      <table className="event-table">
        <thead>
          <tr>
            {visibleColumns.map((col) => (
              <th key={col}>{COLUMN_DEFINITIONS[col as keyof typeof COLUMN_DEFINITIONS]?.label || col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="event-table-empty">
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
                {visibleColumns.map((col) => renderCell(col, event))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

