/**
 * FilterBar.jsx
 * Purpose: Classification, status, and date-range controls. Location waits for Card 12.
 */
import { EMPTY_FILTERS } from '../lib/filters.js';

const CLASSIFICATIONS = ['Class I', 'Class II', 'Class III'];
const STATUSES = ['Ongoing', 'Completed', 'Terminated'];

export default function FilterBar({ filters, onChange, dateRangeError = false }) {
  function update(patch) {
    onChange({ ...filters, ...patch });
  }

  return (
    <fieldset className="filter-bar">
      <legend>Filters</legend>

      <div className="filter-row">
        <label htmlFor="filter-classification">
          Classification
          <select
            id="filter-classification"
            value={filters.classification}
            onChange={(event) => update({ classification: event.target.value })}
          >
            <option value="">Any</option>
            {CLASSIFICATIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="filter-status">
          Status
          <select
            id="filter-status"
            value={filters.status}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="">Any</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="filter-date-from">
          From
          <input
            id="filter-date-from"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => update({ dateFrom: event.target.value })}
          />
        </label>

        <label htmlFor="filter-date-to">
          To
          <input
            id="filter-date-to"
            type="date"
            value={filters.dateTo}
            onChange={(event) => update({ dateTo: event.target.value })}
          />
        </label>

        <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS })}>
          Clear
        </button>
      </div>

      {dateRangeError ? (
        <p className="filter-error" role="alert">
          The start date must be on or before the end date.
        </p>
      ) : null}
    </fieldset>
  );
}
