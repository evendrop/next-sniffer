import React, { useState, useEffect, useCallback } from 'react';
import { IconTerminal, IconBellOff, IconDownload, IconRefresh } from '@tabler/icons-react';
import { Event, EventFilters } from './lib/types';
import { fetchEvents, clearEvents, createEventStream } from './lib/api';
import { EventTable } from './components/EventTable';
import { Filters } from './components/Filters';
import { EventDetail } from './components/EventDetail';
import { Toast } from './components/Toast';
import './App.css';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    methods: [],
    statusCategory: 'all',
    phase: 'all',
    host: 'all',
    timeRange: 'all',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'time', 'phase', 'method', 'host', 'path', 'status', 'duration', 'service', 'error'
  ]);
  const [errorNotifications, setErrorNotifications] = useState(true);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<{
    status: string;
    version?: string;
    progress?: number;
    message?: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchEvents(filters, page);
      setEvents(response.events);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      console.error('Failed to load events:', error);
      setServerError(error.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load settings and app version on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((settings) => {
        setErrorNotifications(settings.errorNotifications);
      });
      window.electronAPI.getAppVersion().then((version) => {
        setAppVersion(version);
      });
      // Listen for update status
      window.electronAPI.onUpdateStatus((status: any) => {
        setUpdateStatus(status);
      });
    }
  }, []);

  useEffect(() => {
    if (!liveUpdates) return;

    const eventSource = createEventStream((newEvent) => {
      // Add new event to the list if it matches current filters
      setEvents((prev) => {
        // Check if event matches filters
        const matches = (event: Event) => {
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            if (
              !event.url.toLowerCase().includes(searchLower) &&
              !(event.error_message?.toLowerCase().includes(searchLower) ?? false)
            ) {
              return false;
            }
          }
          if (filters.methods.length > 0 && !filters.methods.includes(event.method || '')) {
            return false;
          }
          if (filters.phase !== 'all' && event.phase !== filters.phase) {
            return false;
          }
          if (filters.host !== 'all' && event.host !== filters.host) {
            return false;
          }
          if (filters.statusCategory !== 'all') {
            const status = event.status || 0;
            switch (filters.statusCategory) {
              case '2xx':
                if (status < 200 || status >= 300) return false;
                break;
              case '3xx':
                if (status < 300 || status >= 400) return false;
                break;
              case '4xx':
                if (status < 400 || status >= 500) return false;
                break;
              case '5xx':
                if (status < 500 || status >= 600) return false;
                break;
              case 'errors':
                if (!event.error_message && status < 400) return false;
                break;
            }
          }
          return true;
        };

        if (matches(newEvent)) {
          return [newEvent, ...prev].slice(0, 100); // Keep latest 100
        }
        return prev;
      });
    });

    return () => {
      eventSource.close();
    };
  }, [liveUpdates, filters]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onServerError((error: any) => {
        setServerError(error.message || 'Server error');
      });
    }
  }, []);

  const handleClearEvents = async () => {
    if (!clearConfirm) {
      // First click - enter confirm mode
      setClearConfirm(true);
      // Reset after 3 seconds if not clicked again
      setTimeout(() => {
        setClearConfirm(false);
      }, 3000);
      return;
    }

    // Second click - actually clear events
    try {
      await clearEvents();
      setEvents([]);
      setSelectedEvent(null);
      setPage(1);
      setClearConfirm(false);
      showToast('All events cleared', 'success');
      
      // Clear error badge
      if (window.electronAPI) {
        await window.electronAPI.clearErrorBadge();
      }
    } catch (error: any) {
      setClearConfirm(false);
      showToast('Failed to clear events: ' + error.message, 'error');
    }
  };

  const handleToggleErrorNotifications = async (enabled: boolean) => {
    setErrorNotifications(enabled);
    if (window.electronAPI) {
      await window.electronAPI.updateSettings({ errorNotifications: enabled });
      // Clear badge if disabling
      if (!enabled) {
        await window.electronAPI.clearErrorBadge();
      }
    }
  };

  const handleCheckForUpdates = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.success) {
        showToast(result.message || 'Failed to check for updates', 'error');
      }
    }
  };

  const handleDownloadUpdate = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.downloadUpdate();
      if (result.success) {
        showToast('Downloading update...', 'info');
      } else {
        showToast(result.message || 'Failed to download update', 'error');
      }
    }
  };

  const handleInstallUpdate = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.installUpdate();
      if (result.success) {
        showToast('Installing update and restarting...', 'info');
      } else {
        showToast(result.message || 'Failed to install update', 'error');
      }
    }
  };

  if (serverError) {
    return (
      <div className="app-error">
        <h1>Server Error</h1>
        <p>{serverError}</p>
        <p>Port 9432 may be in use. Please close the application using that port and restart.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1>NextJS Sniffer</h1>
          {appVersion && (
            <span className="app-version">v{appVersion}</span>
          )}
        </div>
        <div className="app-header-actions">
          {updateStatus && updateStatus.status === 'available' && (
            <button
              onClick={handleDownloadUpdate}
              className="btn btn-secondary"
              title="Download Update"
            >
              <IconDownload size={16} />
              Update Available
            </button>
          )}
          {updateStatus && updateStatus.status === 'downloading' && (
            <button
              className="btn btn-secondary"
              disabled
              title="Downloading Update"
            >
              <IconDownload size={16} />
              Downloading {updateStatus.progress}%
            </button>
          )}
          {updateStatus && updateStatus.status === 'downloaded' && (
            <button
              onClick={handleInstallUpdate}
              className="btn btn-primary"
              title="Install and Restart"
            >
              <IconRefresh size={16} />
              Install Update
            </button>
          )}
          {(!updateStatus || (updateStatus.status !== 'available' && updateStatus.status !== 'downloading' && updateStatus.status !== 'downloaded')) && (
            <button
              onClick={handleCheckForUpdates}
              className="btn btn-secondary"
              title="Check for Updates"
            >
              <IconRefresh size={16} />
              Check Updates
            </button>
          )}
          <label className="live-updates-toggle">
            <input
              type="checkbox"
              checked={liveUpdates}
              onChange={(e) => setLiveUpdates(e.target.checked)}
            />
            Live Updates
          </label>
          <label className="live-updates-toggle">
            <input
              type="checkbox"
              checked={errorNotifications}
              onChange={(e) => handleToggleErrorNotifications(e.target.checked)}
            />
            Error Alerts
          </label>
          <button 
            onClick={async () => {
              if (window.electronAPI) {
                await window.electronAPI.clearErrorBadge();
                showToast('Error badge cleared', 'success');
              }
            }}
            className="btn btn-secondary"
            title="Clear Error Badge"
          >
            <IconBellOff size={16} />
            Clear Badge
          </button>
          <button 
            onClick={async () => {
              if (window.electronAPI) {
                await window.electronAPI.toggleDevTools();
              }
            }}
            className="btn btn-secondary"
            title="Toggle Developer Tools"
          >
            <IconTerminal size={16} />
            Console
          </button>
          <button 
            onClick={handleClearEvents} 
            className={`btn btn-danger ${clearConfirm ? 'btn-confirm' : ''}`}
          >
            {clearConfirm ? 'Confirm Clear' : 'Clear Events'}
          </button>
        </div>
      </div>

      <Filters 
        filters={filters} 
        onFiltersChange={setFilters}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
      />

      <div className="app-content">
        <div className="app-content-left">
          <EventTable
            events={events}
            selectedEventId={selectedEvent?.id || null}
            onSelectEvent={setSelectedEvent}
            visibleColumns={visibleColumns}
          />
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </div>
        <div className="app-content-right">
          <EventDetail event={selectedEvent} onShowToast={showToast} />
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;

