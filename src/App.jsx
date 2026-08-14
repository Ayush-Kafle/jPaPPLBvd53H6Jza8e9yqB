import { useState, useEffect, useRef } from 'react';

export default function App() {
  const [items, setItems] = useState([]);
  const [seed, setSeed] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const tableRef = useRef(null);
  const headerCheckboxRef = useRef(null);

  // Update indeterminate state on header checkbox
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selected.size > 0 && selected.size < items.length;
    }
  }, [selected.size, items.length]);

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/items');
      const data = await res.json();
      setItems(data.items);
      setSeed(data.seed);
    } catch (err) {
      setError(`Failed to load leads: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(items.map(item => item.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Cmd/Ctrl + A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }
      // Escape to deselect all
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items]);

  async function archiveSelected() {
    if (selected.size === 0) return;

    setShowConfirmation(false);
    setArchiving(true);
    setArchiveResult(null);

    try {
      const res = await fetch('/api/items/batch/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });

      const result = await res.json();

      // Handle error responses from the API
      if (!res.ok || result.error) {
        setArchiveResult({
          succeeded: [],
          failed: Array.from(selected).map(id => ({
            id,
            error: result.error || {
              code: 'SERVER_ERROR',
              message: `Server returned status ${res.status}`,
            },
          })),
        });
        setArchiving(false);
        return;
      }

      setArchiveResult(result);
      setArchiving(false);

      // Remove successfully archived items from the list and selection
      if (result.succeeded && result.succeeded.length > 0) {
        const archivedIds = new Set(result.succeeded.map(item => item.id));
        setItems(prev => prev.filter(item => !archivedIds.has(item.id)));
        setSelected(prev => {
          const next = new Set(prev);
          archivedIds.forEach(id => next.delete(id));
          return next;
        });
      }
    } catch (err) {
      setArchiveResult({
        succeeded: [],
        failed: selected.size > 0
          ? Array.from(selected).map(id => ({
              id,
              error: { code: 'NETWORK_ERROR', message: err.message },
            }))
          : [],
      });
      setArchiving(false);
    }
  }

  function retryFailed() {
    if (archiveResult?.failed?.length > 0) {
      const failedIds = archiveResult.failed.map(f => f.id);
      setSelected(new Set(failedIds));
      setShowConfirmation(true);
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="header">
          <h1>Leads</h1>
          {seed !== null && <div className="seed">Seed: {seed}</div>}
        </div>
        <div className="loading">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>Leads</h1>
          {seed !== null && <div className="seed">Seed: {seed}</div>}
        </div>
        <div className="header-actions">
          {selected.size > 0 && (
            <div className="selection-info">
              {selected.size} selected
            </div>
          )}
          <button
            className="archive-btn"
            onClick={() => setShowConfirmation(true)}
            disabled={selected.size === 0 || archiving}
          >
            {archiving ? 'Archiving...' : `Archive Selected (${selected.size})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={fetchItems} className="retry-link">
            Retry
          </button>
        </div>
      )}

      {archiveResult && (
        <div
          className={`result-banner ${
            archiveResult.failed?.length > 0 ? 'partial' : 'success'
          }`}
        >
          <div>
            {archiveResult.succeeded?.length > 0 && (
              <div>
                ✓ Archived {archiveResult.succeeded.length} lead
                {archiveResult.succeeded.length !== 1 ? 's' : ''}
              </div>
            )}
            {archiveResult.failed?.length > 0 && (
              <div>
                ✗ Failed to archive {archiveResult.failed.length} lead
                {archiveResult.failed.length !== 1 ? 's' : ''}
                <button onClick={retryFailed} className="retry-link">
                  Retry failed
                </button>
              </div>
            )}
          </div>
          <button
            className="close-result"
            onClick={() => setArchiveResult(null)}
          >
            ×
          </button>
        </div>
      )}

      {showConfirmation && selected.size > 0 && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h2>Archive {selected.size} lead{selected.size !== 1 ? 's' : ''}?</h2>
            <p>This action cannot be undone.</p>
            <div className="confirmation-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={archiveSelected}
                disabled={archiving}
              >
                {archiving ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && !archiveResult ? (
        <div className="empty-state">No leads to display</div>
      ) : (
        <table ref={tableRef} className="leads-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === items.length}
                  onChange={e => {
                    if (e.target.checked) {
                      selectAll();
                    } else {
                      clearSelection();
                    }
                  }}
                  title="Cmd/Ctrl+A to select all, Escape to deselect"
                />
              </th>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Source</th>
              <th>Owner</th>
              <th>Value</th>
              <th>Last Contact</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                className={`lead-row ${selected.has(item.id) ? 'selected' : ''}`}
              >
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                </td>
                <td>{item.name}</td>
                <td>{item.company}</td>
                <td>{item.email}</td>
                <td>{item.source}</td>
                <td>{item.owner}</td>
                <td>${item.value.toLocaleString()}</td>
                <td>{item.lastContact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
