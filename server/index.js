import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 8787;

// Get seed from environment or generate one
const SEED = process.env.SEED || Math.floor(Math.random() * 10000);

// Simple seeded random number generator
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  choice(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const rng = new SeededRandom(SEED);

// Sample data for seeding
const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Lisa'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const companies = ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Digital Ventures', 'Cloud Systems'];
const sources = ['LinkedIn', 'Referral', 'Cold Call', 'Trade Show', 'Inbound'];
const owners = ['Alice', 'Bob', 'Charlie', 'Diana'];

function generateLead(id) {
  return {
    id,
    name: `${rng.choice(firstNames)} ${rng.choice(lastNames)}`,
    company: rng.choice(companies),
    email: `user${id}@example.com`,
    source: rng.choice(sources),
    owner: rng.choice(owners),
    value: Math.floor(rng.next() * 100000) + 10000,
    lastContact: new Date(Date.now() - Math.floor(rng.next() * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
    archived: false,
  };
}

// In-memory data store
let items = Array.from({ length: 20 }, (_, i) => generateLead(i + 1));
const initialState = JSON.parse(JSON.stringify(items));

// Track which items are locked (simulating real-world concurrent access)
const lockedItems = new Set();

// Simulate realistic failures: some items fail consistently
const failingItems = new Set([3, 7, 15]); // These will fail with archive_failed

app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// GET /api/items
app.get('/api/items', (req, res) => {
  const activeItems = items.filter(item => !item.archived);
  res.json({
    seed: SEED,
    items: activeItems,
  });
});

// POST /api/items/:id/archive - Archive a single lead
// Intentionally slow and unreliable to simulate real-world conditions
app.post('/api/items/:id/archive', (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  // Simulate network delay (20-500ms)
  const delay = Math.floor(Math.random() * 480) + 20;
  
  setTimeout(() => {
    const item = items.find(i => i.id === id);

    // Not found
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Lead does not exist',
          id,
        },
      });
    }

    // Already archived
    if (item.archived) {
      return res.status(409).json({
        error: {
          code: 'record_locked',
          message: 'This lead is currently locked. Another user may be editing it.',
          id,
        },
      });
    }

    // Simulate realistic failure: some items consistently fail
    // (representing downstream service failures)
    if (failingItems.has(id) && Math.random() > 0.3) {
      return res.status(500).json({
        error: {
          code: 'archive_failed',
          message: 'Failed to archive lead. The archive service encountered an error.',
          id,
        },
      });
    }

    // Simulate occasional record lock (concurrent access)
    if (Math.random() > 0.85) {
      return res.status(409).json({
        error: {
          code: 'record_locked',
          message: 'This lead is currently being edited by another user. Please try again.',
          id,
        },
      });
    }

    // Success: archive the item
    item.archived = true;
    res.json({ item });
  }, delay);
});

// POST /api/reset - Reset dataset to initial state
app.post('/api/reset', (req, res) => {
  items = JSON.parse(JSON.stringify(initialState));
  lockedItems.clear();
  res.json({ message: 'Dataset reset', count: items.length });
});

app.listen(PORT, () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`  Seed: ${SEED}\n`);
});
