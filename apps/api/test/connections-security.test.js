/**
 * Automated test suite for Connections backend security, transitions, and concurrency.
 * Uses Node.js native test runner (node:test, node:assert/strict).
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Set environment variables before module imports
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'anon-key-test';

const pg = (await import('pg')).default;

// Dynamic imports to use mocked pg environment
const { ApiError } = await import('../src/utils/ApiError.js');
const connectionsService = await import('../src/services/connections.service.js');
const connectionsController = await import('../src/controllers/connections.controller.js');

// Constants for test fixtures
const RETAILER_ID = '11111111-0000-0000-0000-000000000001';
const WHOLESALER_ID = '22222222-0000-0000-0000-000000000002';
const THIRD_PARTY_ID = '33333333-0000-0000-0000-000000000003';
const CONNECTION_ID = '44444444-0000-0000-0000-000000000004';

const retailerUser = {
  id: 'u-1',
  businessId: RETAILER_ID,
  businessName: 'Fresh Mart',
  role: 'RETAILER',
};

const wholesalerUser = {
  id: 'u-2',
  businessId: WHOLESALER_ID,
  businessName: 'Metro Wholesalers',
  role: 'WHOLESALER',
};

const thirdPartyUser = {
  id: 'u-3',
  businessId: THIRD_PARTY_ID,
  businessName: 'Other Store',
  role: 'RETAILER',
};

describe('Connections Security & Transition Rules', () => {
  let mockDb;

  beforeEach(() => {
    // Reset DB mock state
    mockDb = {
      queries: [],
      clientQueries: [],
      queryHandler: null,
      clientHandler: null,
    };

    pg.Pool.prototype.query = async function (text, params) {
      mockDb.queries.push({ text, params });
      if (mockDb.queryHandler) {
        return mockDb.queryHandler(text, params);
      }
      return { rows: [], rowCount: 0 };
    };

    pg.Pool.prototype.connect = async function () {
      return {
        query: async (text, params) => {
          mockDb.clientQueries.push({ text, params });
          if (mockDb.clientHandler) {
            return mockDb.clientHandler(text, params);
          }
          return { rows: [], rowCount: 0 };
        },
        release: () => {},
      };
    };
  });

  describe('Rule 1 & 8: Connection Creation / Request', () => {
    it('prevents a non-retailer (wholesaler) from initiating a connection request', async () => {
      await assert.rejects(
        async () => {
          await connectionsService.createConnection(wholesalerUser, {
            partnerId: RETAILER_ID,
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Only retailers can initiate connection requests/);
          return true;
        },
      );
    });

    it('rejects client attempting to create an immediately ACTIVE connection', async () => {
      await assert.rejects(
        async () => {
          await connectionsService.createConnection(retailerUser, {
            partnerId: WHOLESALER_ID,
            status: 'ACTIVE',
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Retailers cannot create an immediately ACTIVE connection/);
          return true;
        },
      );
    });

    it('rejects client attempting to supply invalid status on creation', async () => {
      await assert.rejects(
        async () => {
          await connectionsService.createConnection(retailerUser, {
            partnerId: WHOLESALER_ID,
            status: 'INACTIVE',
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Connection requests must have status PENDING/);
          return true;
        },
      );
    });

    it('creates a new connection with status PENDING and sends CONNECTION_REQUEST notification', async () => {
      // Mock partner lookup
      mockDb.queryHandler = async (text, params) => {
        if (text.includes('FROM businesses WHERE id = $1')) {
          return { rows: [{ id: WHOLESALER_ID, name: 'Metro Wholesalers', type: 'WHOLESALER' }] };
        }
        return { rows: [] };
      };

      // Mock transaction queries: SELECT existing (none) -> INSERT connection -> INSERT notification
      mockDb.clientHandler = async (text, params) => {
        if (text.includes('SELECT id, status FROM business_connections')) {
          return { rows: [] };
        }
        if (text.includes('INSERT INTO business_connections')) {
          return {
            rows: [
              {
                id: CONNECTION_ID,
                retailer_id: RETAILER_ID,
                wholesaler_id: WHOLESALER_ID,
                status: 'PENDING',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('INSERT INTO notifications')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      };

      const result = await connectionsService.createConnection(retailerUser, {
        partnerId: WHOLESALER_ID,
      });

      assert.strictEqual(result.status, 'PENDING');
      assert.strictEqual(result.retailerId, RETAILER_ID);
      assert.strictEqual(result.wholesalerId, WHOLESALER_ID);

      // Verify notification query was dispatched with CONNECTION_REQUEST to the wholesaler
      const notifQuery = mockDb.clientQueries.find((q) => q.text.includes('INSERT INTO notifications'));
      assert.ok(notifQuery, 'Notification must be inserted');
      assert.strictEqual(notifQuery.params[0], WHOLESALER_ID);
      assert.strictEqual(notifQuery.text.includes('CONNECTION_REQUEST'), true);
    });

    it('rejects connection creation if partner is not a WHOLESALER', async () => {
      mockDb.queryHandler = async () => ({
        rows: [{ id: THIRD_PARTY_ID, name: 'Another Retailer', type: 'RETAILER' }],
      });

      await assert.rejects(
        async () => {
          await connectionsService.createConnection(retailerUser, {
            partnerId: THIRD_PARTY_ID,
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Connections can only be formed with a Wholesaler/);
          return true;
        },
      );
    });
  });

  describe('Rule 4: Inactive Connection Reactivation via Fresh Request', () => {
    it('resets an INACTIVE connection to PENDING (never directly ACTIVE) upon fresh request', async () => {
      mockDb.queryHandler = async () => ({
        rows: [{ id: WHOLESALER_ID, name: 'Metro Wholesalers', type: 'WHOLESALER' }],
      });

      mockDb.clientHandler = async (text, params) => {
        if (text.includes('FROM business_connections') && text.includes('retailer_id = $1')) {
          return { rows: [{ id: CONNECTION_ID, status: 'INACTIVE' }], rowCount: 1 };
        }
        if (text.includes('UPDATE business_connections')) {
          return {
            rows: [
              {
                id: CONNECTION_ID,
                retailer_id: RETAILER_ID,
                wholesaler_id: WHOLESALER_ID,
                status: 'PENDING',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('INSERT INTO notifications')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      };

      const result = await connectionsService.createConnection(retailerUser, {
        partnerId: WHOLESALER_ID,
      });

      assert.strictEqual(result.status, 'PENDING');

      // Verify that notification was sent for the fresh request
      const notifQuery = mockDb.clientQueries.find((q) => q.text.includes('INSERT INTO notifications'));
      assert.ok(notifQuery, 'Must send notification on fresh request');
      assert.strictEqual(notifQuery.params[0], WHOLESALER_ID);
    });

    it('rejects fresh request if an ACTIVE connection already exists', async () => {
      mockDb.queryHandler = async () => ({
        rows: [{ id: WHOLESALER_ID, name: 'Metro Wholesalers', type: 'WHOLESALER' }],
      });

      mockDb.clientHandler = async (text) => {
        if (text.includes('FROM business_connections') && text.includes('retailer_id = $1')) {
          return { rows: [{ id: CONNECTION_ID, status: 'ACTIVE' }], rowCount: 1 };
        }
        return { rows: [] };
      };

      await assert.rejects(
        async () => {
          await connectionsService.createConnection(retailerUser, {
            partnerId: WHOLESALER_ID,
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 409);
          assert.match(err.message, /active connection with this business already exists/);
          return true;
        },
      );
    });

    it('rejects fresh request if a PENDING connection already exists', async () => {
      mockDb.queryHandler = async () => ({
        rows: [{ id: WHOLESALER_ID, name: 'Metro Wholesalers', type: 'WHOLESALER' }],
      });

      mockDb.clientHandler = async (text) => {
        if (text.includes('FROM business_connections') && text.includes('retailer_id = $1')) {
          return { rows: [{ id: CONNECTION_ID, status: 'PENDING' }], rowCount: 1 };
        }
        return { rows: [] };
      };

      await assert.rejects(
        async () => {
          await connectionsService.createConnection(retailerUser, {
            partnerId: WHOLESALER_ID,
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 409);
          assert.match(err.message, /connection request is already pending/);
          return true;
        },
      );
    });
  });

  describe('Rule 2, 3, 4, 5: Status Transitions via updateConnectionStatus', () => {
    function setupExistingConnection(status) {
      mockDb.clientHandler = async (text, params) => {
        if (text.includes('SELECT c.id, c.retailer_id, c.wholesaler_id, c.status')) {
          return {
            rows: [
              {
                id: CONNECTION_ID,
                retailer_id: RETAILER_ID,
                wholesaler_id: WHOLESALER_ID,
                status,
                retailer_name: 'Fresh Mart',
                wholesaler_name: 'Metro Wholesalers',
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('UPDATE business_connections')) {
          return {
            rows: [
              {
                id: CONNECTION_ID,
                retailer_id: RETAILER_ID,
                wholesaler_id: WHOLESALER_ID,
                status: params[1], // target status
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('INSERT INTO notifications')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      };
    }

    it('allows wholesaler to accept PENDING request (PENDING -> ACTIVE) with notification to retailer', async () => {
      setupExistingConnection('PENDING');

      const result = await connectionsService.updateConnectionStatus(wholesalerUser, CONNECTION_ID, 'ACTIVE');
      assert.strictEqual(result.status, 'ACTIVE');

      // Verify CONNECTION_ACCEPTED notification sent to retailer
      const notifQuery = mockDb.clientQueries.find((q) => q.text.includes('CONNECTION_ACCEPTED'));
      assert.ok(notifQuery, 'Must send CONNECTION_ACCEPTED notification');
      assert.strictEqual(notifQuery.params[0], RETAILER_ID);
    });

    it('allows wholesaler to reject PENDING request (PENDING -> INACTIVE) without inventing notification enum', async () => {
      setupExistingConnection('PENDING');

      const result = await connectionsService.updateConnectionStatus(wholesalerUser, CONNECTION_ID, 'INACTIVE');
      assert.strictEqual(result.status, 'INACTIVE');

      // Schema has no CONNECTION_REJECTED enum; verify no notification was inserted
      const notifQuery = mockDb.clientQueries.find((q) => q.text.includes('INSERT INTO notifications'));
      assert.strictEqual(notifQuery, undefined, 'No invalid notification enum should be inserted');
    });

    it('forbids retailer from accepting a PENDING connection', async () => {
      setupExistingConnection('PENDING');

      await assert.rejects(
        async () => {
          await connectionsService.updateConnectionStatus(retailerUser, CONNECTION_ID, 'ACTIVE');
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Only the wholesaler receiving a pending request can accept or reject it/);
          return true;
        },
      );
    });

    it('forbids retailer from rejecting a PENDING connection', async () => {
      setupExistingConnection('PENDING');

      await assert.rejects(
        async () => {
          await connectionsService.updateConnectionStatus(retailerUser, CONNECTION_ID, 'INACTIVE');
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Only the wholesaler receiving a pending request can accept or reject it/);
          return true;
        },
      );
    });

    it('allows retailer to deactivate an ACTIVE connection (ACTIVE -> INACTIVE)', async () => {
      setupExistingConnection('ACTIVE');

      const result = await connectionsService.updateConnectionStatus(retailerUser, CONNECTION_ID, 'INACTIVE');
      assert.strictEqual(result.status, 'INACTIVE');
    });

    it('allows wholesaler to deactivate an ACTIVE connection (ACTIVE -> INACTIVE)', async () => {
      setupExistingConnection('ACTIVE');

      const result = await connectionsService.updateConnectionStatus(wholesalerUser, CONNECTION_ID, 'INACTIVE');
      assert.strictEqual(result.status, 'INACTIVE');
    });

    it('forbids direct reactivation of an INACTIVE connection via update (INACTIVE -> ACTIVE)', async () => {
      setupExistingConnection('INACTIVE');

      await assert.rejects(
        async () => {
          await connectionsService.updateConnectionStatus(wholesalerUser, CONNECTION_ID, 'ACTIVE');
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /An INACTIVE connection cannot be directly reactivated/);
          return true;
        },
      );
    });

    it('rejects transitioning ACTIVE connection to PENDING', async () => {
      setupExistingConnection('ACTIVE');

      await assert.rejects(
        async () => {
          await connectionsService.updateConnectionStatus(retailerUser, CONNECTION_ID, 'PENDING');
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Connections cannot be transitioned to PENDING via PATCH/);
          return true;
        },
      );
    });

    it('rejects same-status transitions (ACTIVE -> ACTIVE)', async () => {
      setupExistingConnection('ACTIVE');

      await assert.rejects(
        async () => {
          await connectionsService.updateConnectionStatus(retailerUser, CONNECTION_ID, 'ACTIVE');
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Connection is already ACTIVE/);
          return true;
        },
      );
    });

    it('forbids non-participants from updating connection status', async () => {
      setupExistingConnection('ACTIVE');

      await assert.rejects(
        async () => {
          await connectionsService.updateConnectionStatus(thirdPartyUser, CONNECTION_ID, 'INACTIVE');
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /You are not a participant in this connection/);
          return true;
        },
      );
    });
  });

  describe('Concurrency & Race Condition Handling', () => {
    it('detects concurrent status modification and throws 409 Conflict', async () => {
      mockDb.clientHandler = async (text) => {
        if (text.includes('SELECT c.id, c.retailer_id, c.wholesaler_id, c.status')) {
          return {
            rows: [
              {
                id: CONNECTION_ID,
                retailer_id: RETAILER_ID,
                wholesaler_id: WHOLESALER_ID,
                status: 'PENDING',
                retailer_name: 'Fresh Mart',
                wholesaler_name: 'Metro Wholesalers',
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('UPDATE business_connections')) {
          // Simulate conditional update matching 0 rows because another worker already changed status
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      };

      await assert.rejects(
        async () => {
          await connectionsService.updateConnectionStatus(wholesalerUser, CONNECTION_ID, 'ACTIVE');
        },
        (err) => {
          assert.strictEqual(err.statusCode, 409);
          assert.match(err.message, /Connection status was modified concurrently/);
          return true;
        },
      );
    });
  });

  describe('Controller Input Validation', () => {
    it('rejects create when user role is WHOLESALER', async () => {
      const req = {
        user: wholesalerUser,
        body: { partnerId: RETAILER_ID },
      };
      const res = {};

      await assert.rejects(
        async () => {
          await connectionsController.create(req, res);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Only retailers can initiate connection requests/);
          return true;
        },
      );
    });

    it('rejects create when status: "ACTIVE" is submitted by retailer', async () => {
      const req = {
        user: retailerUser,
        body: { partnerId: WHOLESALER_ID, status: 'ACTIVE' },
      };
      const res = {};

      await assert.rejects(
        async () => {
          await connectionsController.create(req, res);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Retailers cannot create an immediately ACTIVE connection/);
          return true;
        },
      );
    });

    it('rejects updateStatus when status: "PENDING" is submitted', async () => {
      const req = {
        user: wholesalerUser,
        params: { id: CONNECTION_ID },
        body: { status: 'PENDING' },
      };
      const res = {};

      await assert.rejects(
        async () => {
          await connectionsController.updateStatus(req, res);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Connections cannot be transitioned to PENDING via PATCH/);
          return true;
        },
      );
    });

    it('rejects updateStatus with invalid UUID', async () => {
      const req = {
        user: wholesalerUser,
        params: { id: 'invalid-id' },
        body: { status: 'ACTIVE' },
      };
      const res = {};

      await assert.rejects(
        async () => {
          await connectionsController.updateStatus(req, res);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Invalid connection ID format/);
          return true;
        },
      );
    });
  });
});
