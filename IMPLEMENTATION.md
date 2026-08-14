# Multi-Select & Archive Implementation

## Overview
Multi-select checkbox feature with batch archiving capability for the Leads application. The implementation handles real-world API behavior including network delays, concurrent access locks, and backend service failures.

## Key Features

✓ **Checkbox-based multi-select** - Clear visual feedback, intuitive UI  
✓ **Confirmation dialog** - Prevents accidental archiving  
✓ **Partial success handling** - Some items can fail while others succeed  
✓ **Detailed error reporting** - Shows specific error codes and messages  
✓ **Retry capability** - Retry only failed items without re-selecting  
✓ **Keyboard shortcuts** - Cmd/Ctrl+A to select all, Escape to deselect  
✓ **Real-world simulation** - Intentional failures and network delays

## Design Decisions

### 1. Selection Mechanism: Checkboxes
**Choice**: Checkbox-based multi-select  
**Rationale**: Clear visual feedback, standard UX pattern, accessibility advantages

### 2. Sequential Single-Item Archiving
**Choice**: Call `POST /api/items/:id/archive` for each selected item sequentially  
**Rationale**: Matches the actual API specification (no batch endpoint exists)  
**Benefits**:
- Accurate error reporting per item
- Partial success handling (some items fail, others succeed)
- Shows realistic real-world behavior
- Easy retry of only failed items

### 3. Real-World Error Scenarios
**Implementation**: Server intentionally produces realistic failures
- **`archive_failed` (500)**: Items 3, 7, 15 consistently fail (70% of the time)
- **`record_locked` (409)**: Randomly simulates concurrent access (15% of the time)
- **`not_found` (404)**: When item doesn't exist
- **Network delays**: 20-500ms random delay on every request (realistic latency)

**Frontend handles each error with**:
- Specific error code display
- User-friendly error message from API
- Partial success: succeeded items are removed, failed items stay selected
- Retry button allows retrying only failed items

### 4. Confirmation Dialog
**Choice**: Always show confirmation before archiving
**Rationale**:
- Archiving is destructive ("This action cannot be undone")
- Small UX friction is worth the safety
- Users typically select multiple items intentionally, so confirmation feels appropriate

### 5. Keyboard Shortcuts
**Implemented**:
- `Cmd/Ctrl + A`: Select all items in table
- `Escape`: Clear all selections

**Rationale**:
- Power users expect these shortcuts
- Improves workflow when archiving large batches
- Standard patterns that don't conflict with browser defaults

## Technical Implementation

### State Management
```javascript
const [selected, setSelected] = useState(new Set()); // Set for O(1) lookups
const [archiving, setArchiving] = useState(false);   // Prevents duplicate requests
const [archiveResult, setArchiveResult] = useState(null); // Tracks success/failure
```

### API Contract

#### GET /api/items
Returns only non-archived items (seeded randomly):
```json
{
  "seed": 5144,
  "items": [
    { "id": 1, "name": "Michael Garcia", "company": "Digital Ventures", 
      "email": "user1@example.com", "source": "Inbound", "owner": "Bob",
      "value": 65463, "lastContact": "2026-07-18", "archived": false },
    ...
  ]
}
```

#### POST /api/items/:id/archive
Archives a single lead. Response on success (200):
```json
{
  "item": {
    "id": 1, 
    "name": "Michael Garcia",
    "archived": true,
    ...
  }
}
```

Response on error:
```json
{
  "error": {
    "code": "record_locked",  // or "archive_failed", "not_found"
    "message": "This lead is currently being edited by another user. Please try again.",
    "id": 1
  }
}
```

| Status | Code | Meaning |
|--------|------|---------|
| 409 | `record_locked` | Another user holds a lock / concurrent access |
| 500 | `archive_failed` | Upstream archive service failure |
| 404 | `not_found` | Lead does not exist |

**Behavior**: 
- Intentionally slow (20-500ms per request)
- Intentionally unreliable (some records fail consistently)
- Simulates real-world backend conditions

#### POST /api/reset
Resets dataset to initial state (useful for testing):
```json
{
  "message": "Dataset reset",
  "count": 20
}
```

## Error Scenarios Handled

| Scenario | Behavior |
|----------|----------|
| **Archive succeeds** | Item removed from list, count updates |
| **record_locked error** | Item shown as failed, stays selected for retry |
| **archive_failed error** | Item shown as failed with "service encountered error", retry option |
| **not_found error** | Unlikely (edge case), shown with clear message |
| **Network error** | All items in batch marked failed, full retry available |
| **Partial success** | Succeeded items removed; failed items shown with details + retry button |
| **User retries failed items** | Only failed items re-attempted, user doesn't re-select |
| **Retry succeeds** | Item removed from list, update count |
| **Retry still fails** | Item shown as still failed, can retry again |
| **User closes error banner** | Errors dismissed, but data correctly updated |
| **All items archived** | Empty state displays: "No leads to display" |

## UX Flow

### Happy Path
1. User selects items (checkboxes get checked)
2. User clicks "Archive Selected" button
3. Confirmation dialog appears
4. User confirms
5. Dialog closes, button shows "Archiving..."
6. Success banner appears: "✓ Archived 5 leads"
7. Items disappear from table
8. User clicks close on success banner

### Error Recovery Path
1. User selects items and tries to archive
2. Network error occurs
3. Banner shows: "✗ Failed to archive 5 leads [Retry failed]"
4. User clicks "Retry failed" button
5. Confirmation dialog reopens with same items
6. Retry succeeds
7. Success banner appears

### Partial Success Path
1. User selects 5 items (IDs: 1,2,3,4,5)
2. Archive request sent
3. Items 1,2,3 succeed; items 4,5 fail (already archived by another user)
4. Banner shows: "✓ Archived 3 leads" and "✗ Failed to archive 2 leads [Retry failed]"
5. Items 1,2,3 removed from table and selection
6. Selection now contains only [4,5]
7. User can retry or dismiss

## Accessibility Features

- ✓ Checkbox labels are properly associated
- ✓ Button text clearly describes action
- ✓ Error messages use symbols (✓/✗) + color + text
- ✓ Keyboard navigation fully supported
- ✓ Loading state visible (button text changes)
- ✓ Confirmation dialog has clear warning text
- ✓ Header checkbox has indeterminate state when partial selection

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User deselects all while confirmation is open | Dialog closes, selection clears |
| User tries to click Archive while archiving | Button disabled (shows "Archiving...") |
| Request takes 500ms+ | Button shows loading state, prevents duplicate requests |
| Some items fail randomly (record_locked) | Those items stay selected for easy retry |
| Items 3, 7, 15 consistently fail | User sees which items problematic, can retry or skip |
| User retries after partial failure | Only failed items re-sent, not entire selection |
| All items in batch fail | Full error details shown, retry available |
| Browser closed during archive | Request may complete server-side (data safe), UI reflects on reload |
| API returns malformed response | Caught, treated as network error |
| Items changed by another user | Next fetch gets fresh data from server |
| Header checkbox with partial selection | Indeterminate state correctly displayed |

## Future Improvements

1. **Optimistic updates**: Remove items immediately, rollback on error
2. **Progress bar**: Show visual progress when archiving 10+ items
3. **Undo capability**: Keep history of archived items for 30-day recall
4. **Bulk operations**: Multiple actions beyond archive (tag, assign, etc.)
5. **Virtual scrolling**: Handle 10,000+ items efficiently
6. **Unarchive**: Add ability to restore archived items
7. **Export**: Archive while keeping historical record in exports
8. **Persist selection**: Save multi-select state to localStorage
9. **Keyboard: Delete to archive**: Alternative to button click
10. **Analytics**: Track archive success/failure rates for monitoring

## Testing

The feature has been tested for:
- ✓ Multi-select (checkbox checking/unchecking)
- ✓ Select all / deselect all functionality
- ✓ Keyboard shortcuts (Cmd/Ctrl+A, Escape)
- ✓ Confirmation dialog appears and works
- ✓ Sequential archive requests (one per item)
- ✓ Partial success handling (some fail, some succeed)
- ✓ Error code display (`record_locked`, `archive_failed`, `not_found`)
- ✓ Retry button functionality
- ✓ Empty state display
- ✓ Data consistency (counts match)
- ✓ Network error handling
- ✓ Malformed response handling

**Real-world workflow test:**
```bash
./test-real-world.sh
```

Example output showing partial success:
```
✓ Archived 4 leads (IDs: 1, 2, 4, 5)
✗ Failed to archive 1 lead
  ID 3: Failed to archive lead. The archive service encountered an error.
[Retry failed]
```

**Comprehensive test suite:**
```bash
./test.sh
```

## Code Quality

- React hooks for clean state management
- Proper error handling with specific error codes
- CSS Grid for responsive table layout
- Accessible color contrast (WCAG AA compliant)
- No external dependencies beyond React (keeps bundle small)
- Event listener cleanup in useEffect
- Proper indeterminate checkbox handling via ref
