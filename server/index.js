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

// POST /api/items/batch/archive - Archive multiple items (must come BEFORE parameterized route)
app.post('/api/items/batch/archive', (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'ids must be an array',
      },
    });
  }

  const results = {
    succeeded: [],
    failed: [],
  };

  for (const id of ids) {
    const item = items.find(i => i.id === id);

    if (!item) {
      results.failed.push({
        id,
        error: { code: 'NOT_FOUND', message: 'Item not found' },
      });
    } else if (item.archived) {
      results.failed.push({
        id,
        error: { code: 'ALREADY_ARCHIVED', message: 'Item is already archived' },
      });
    } else {
      item.archived = true;
      results.succeeded.push(item);
    }
  }

  res.json(results);
});

// POST /api/items/:id/archive - Archive a single item (comes after batch route)
app.post('/api/items/:id/archive', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = items.find(i => i.id === id);

  if (!item) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Item not found',
        id,
      },
    });
  }

  if (item.archived) {
    return res.status(409).json({
      error: {
        code: 'ALREADY_ARCHIVED',
        message: 'Item is already archived',
        id,
      },
    });
  }

  item.archived = true;
  res.json({ item });
});

app.listen(PORT, () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`  Seed: ${SEED}\n`);
});
