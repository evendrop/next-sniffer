import React, { useEffect, useState } from 'react';
import { EventFilters } from '../lib/types';
import { fetchHosts } from '../lib/api';
import { Multiselect } from './Multiselect';

interface FiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
}

export function Filters({ filters, onFiltersChange, visibleColumns, onVisibleColumnsChange }: FiltersProps) {
  const [hosts, setHosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHosts()
      .then(setHosts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateFilter = <K extends keyof EventFilters>(key: K, value: EventFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="filters">
      <div className="filters-row">
        <div className="filter-group filter-group-search">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search URL or error message..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group filter-group-right">
          <label>Columns</label>
          <Multiselect
            options={['time', 'phase', 'method', 'host', 'path', 'status', 'duration', 'service', 'error']}
            selected={visibleColumns}
            onChange={onVisibleColumnsChange}
            placeholder="All columns"
            className="filter-multiselect"
          />
        </div>

        <div className="filter-group filter-group-right">
          <label>Method</label>
          <Multiselect
            options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH']}
            selected={filters.methods}
            onChange={(methods) => updateFilter('methods', methods)}
            placeholder="All methods"
            className="filter-multiselect"
          />
        </div>

        <div className="filter-group filter-group-right">
          <label>Status</label>
          <select
            value={filters.statusCategory}
            onChange={(e) => updateFilter('statusCategory', e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="2xx">2xx</option>
            <option value="3xx">3xx</option>
            <option value="4xx">4xx</option>
            <option value="5xx">5xx</option>
            <option value="errors">Errors</option>
          </select>
        </div>

        <div className="filter-group filter-group-right">
          <label>Phase</label>
          <select
            value={filters.phase}
            onChange={(e) => updateFilter('phase', e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="request">Request</option>
            <option value="response">Response</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="filter-group filter-group-right">
          <label>Host</label>
          <select
            value={filters.host}
            onChange={(e) => updateFilter('host', e.target.value)}
            className="filter-select"
            disabled={loading}
          >
            <option value="all">All</option>
            {hosts.map((host) => (
              <option key={host} value={host}>
                {host}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-group-right">
          <label>Time Range</label>
          <select
            value={filters.timeRange}
            onChange={(e) => updateFilter('timeRange', e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
          </select>
        </div>
      </div>
    </div>
  );
}

