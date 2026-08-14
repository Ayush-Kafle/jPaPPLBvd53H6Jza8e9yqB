# Multi-Select & Archive Implementation

## Overview
This document outlines the design and implementation of the multi-select checkbox feature with batch archiving capability for the Leads application.

## Design Decisions

### 1. Selection Mechanism: Checkboxes
**Choice**: Checkbox-based multi-select rather than click-to-select rows
**Rationale**:
- More intuitive for users accustomed to selection UI patterns
- Clear visual feedback of selection state
- Easier to target specific items without ambiguity
- Standard desktop/mobile UX pattern
- Accessibility advantages (explicit click targets)

### 2. Batch vs. Sequential Archiving
**Choice**: Batch endpoint (`POST /api/items/batch/archive`) instead of calling single-item endpoint for each item
**Rationale**:
- Single network roundtrip for multiple items (better performance)
- Better error reporting (can show which items succeeded/failed)
- Cleaner API design that mirrors the UI intent
- Reduces server load

### 3. Error Handling Strategy
**Partial Success Model**: When archiving multiple items, treat each item independently
- Items that succeed are removed from the list
- Items that fail are shown with specific error codes
- User can retry only the failed items
- Failed items remain in the selection for easy retry

**Benefits**:
- Doesn't lose work when some items succeed
- Clear feedback about what happened
- Recovery path without re-selecting items

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
Returns only non-archived items:
```json
{
  "seed": 6707,
  "items": [
    { "id": 1, "name": "...", "archived": false, ... },
    ...
  ]
}
```

#### POST /api/items/batch/archive
Request:
```json
{ "ids": [1, 2, 3] }
```

Response (always 200 for successful processing):
```json
{
  "succeeded": [
    { "id": 1, "name": "...", "archived": true, ... },
    ...
  ],
  "failed": [
    { "id": 999, "error": { "code": "NOT_FOUND", "message": "..." } }
  ]
}
```

## Error Scenarios Handled

1. **Network Error**: Caught in try/catch, all selected items marked as failed
2. **Server Error** (500): HTTP status check detects non-200, all items marked failed
3. **Invalid Request** (400): API returns error object, handled gracefully
4. **Item Already Archived**: Returns ALREADY_ARCHIVED error code, can be retried
5. **Item Not Found**: Returns NOT_FOUND error code (edge case if item deleted by another user)
6. **Partial Success**: 3 succeed, 2 fail → removes succeeded ones, shows failed with retry option

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
| User deselects all while confirmation dialog is open | Dialog closes (they likely changed their mind) |
| User tries to click Archive button while archiving | Button is disabled |
| User closes browser during archive | Request completes but UI not updated (acceptable) |
| All items archived | Empty state: "No leads to display" |
| Header checkbox when partial selection | Indeterminate state visual indicator |
| User opens DevTools and modifies item | Next refresh fetches fresh data from server |
| Server returns malformed response | Catch block treats it as network error |

## Future Improvements

1. **Undo capability**: Keep history of archived items (30-day recall period)
2. **Selective unarchive**: Add ability to restore archived items
3. **Bulk operations**: Multiple-select actions beyond archive (e.g., tag, assign)
4. **Progress bar**: Show progress when archiving 100+ items
5. **Optimistic updates**: Remove items immediately while request in flight
6. **Export before archive**: Archive while keeping historical record
7. **Redo/Undo**: Ctrl+Z to restore recently archived items
8. **Performance**: Virtual scrolling for 10,000+ items

## Testing

The feature has been tested for:
- ✓ Normal operation (multi-select → archive → removal)
- ✓ Error handling (partial success, retries, network errors)
- ✓ Empty state display
- ✓ Button state management (enabled/disabled)
- ✓ Data consistency (counts match after archiving)
- ✓ API contract validation
- ✓ Server error responses

Run test suite:
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
