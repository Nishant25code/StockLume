import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'anon-key-test';

const pg = (await import('pg')).default;
const inventory = await import('../src/services/inventory.service.js');

const BUSINESS_ID = '11111111-0000-0000-0000-000000000001';
const PRODUCT_ID = '22222222-0000-0000-0000-000000000002';
const INVENTORY_ID = '33333333-0000-0000-0000-000000000003';

const retailer = {
  id: 'user-1',
  businessId: BUSINESS_ID,
  role: 'RETAILER',
};

describe('Inventory service', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      queries: [],
      clientQueries: [],
      queryHandler: null,
      clientHandler: null,
    };

    pg.Pool.prototype.query = async function (text, params) {
      mockDb.queries.push({ text, params });
      return mockDb.queryHandler
        ? mockDb.queryHandler(text, params)
        : { rows: [], rowCount: 0 };
    };

    pg.Pool.prototype.connect = async function () {
      return {
        query: async (text, params) => {
          mockDb.clientQueries.push({ text, params });
          return mockDb.clientHandler
            ? mockDb.clientHandler(text, params)
            : { rows: [], rowCount: 0 };
        },
        release() {},
      };
    };
  });

  describe('addInventoryItem', () => {
    it('rejects a product that does not exist', async () => {
      mockDb.queryHandler = async () => ({ rows: [], rowCount: 0 });

      await assert.rejects(
        inventory.addInventoryItem(retailer, { productId: PRODUCT_ID }),
        (err) => err.statusCode === 404,
      );
    });

    it('rejects an inactive product', async () => {
      mockDb.queryHandler = async () => ({
        rows: [{
          id: PRODUCT_ID,
          name: 'Rice',
          sku: 'RICE-01',
          is_active: false,
          has_active_connection: true,
        }],
        rowCount: 1,
      });

      await assert.rejects(
        inventory.addInventoryItem(retailer, { productId: PRODUCT_ID }),
        (err) => err.statusCode === 400,
      );
    });

    it('rejects a product without an active connection', async () => {
      mockDb.queryHandler = async () => ({
        rows: [{
          id: PRODUCT_ID,
          name: 'Rice',
          sku: 'RICE-01',
          is_active: true,
          has_active_connection: false,
        }],
        rowCount: 1,
      });

      await assert.rejects(
        inventory.addInventoryItem(retailer, { productId: PRODUCT_ID }),
        (err) => err.statusCode === 403,
      );
    });

    it('rejects a product already in inventory', async () => {
      mockDb.queryHandler = async (text) => {
        if (text.includes('FROM products')) {
          return {
            rows: [{
              id: PRODUCT_ID,
              name: 'Rice',
              sku: 'RICE-01',
              is_active: true,
              has_active_connection: true,
            }],
            rowCount: 1,
          };
        }

        if (text.includes('FROM inventory')) {
          return { rows: [{ id: INVENTORY_ID, quantity: 10 }], rowCount: 1 };
        }

        return { rows: [], rowCount: 0 };
      };

      await assert.rejects(
        inventory.addInventoryItem(retailer, { productId: PRODUCT_ID }),
        (err) => err.statusCode === 409,
      );

      assert.equal(mockDb.clientQueries.length, 0);
    });

    it('inserts inventory and an initial stock movement in one transaction', async () => {
      mockDb.queryHandler = async (text) => {
        if (text.includes('FROM products')) {
          return {
            rows: [{
              id: PRODUCT_ID,
              name: 'Rice',
              sku: 'RICE-01',
              is_active: true,
              has_active_connection: true,
            }],
            rowCount: 1,
          };
        }

        return { rows: [], rowCount: 0 };
      };

      mockDb.clientHandler = async (text) => {
        if (text.includes('INSERT INTO inventory')) {
          return {
            rows: [{
              id: INVENTORY_ID,
              business_id: BUSINESS_ID,
              product_id: PRODUCT_ID,
              quantity: 15,
              created_at: '2026-11-24T00:00:00Z',
              updated_at: '2026-11-24T00:00:00Z',
            }],
            rowCount: 1,
          };
        }

        return { rows: [], rowCount: 1 };
      };

      const result = await inventory.addInventoryItem(retailer, {
        productId: PRODUCT_ID,
        quantity: 15,
      });

      assert.equal(result.id, INVENTORY_ID);
      assert.equal(result.quantity, 15);
      assert.equal(
        mockDb.clientQueries.filter((q) => q.text.includes('INSERT INTO')).length,
        2,
      );
    });
  });

  describe('adjustInventoryQuantity', () => {
    it('rejects an adjustment that would make stock negative', async () => {
      mockDb.clientHandler = async (text) => {
        if (text.includes('UPDATE inventory')) {
          return { rows: [], rowCount: 0 };
        }

        if (text.includes('SELECT id, quantity FROM inventory')) {
          return { rows: [{ id: INVENTORY_ID, quantity: 5 }], rowCount: 1 };
        }

        return { rows: [], rowCount: 0 };
      };

      await assert.rejects(
        inventory.adjustInventoryQuantity(retailer, {
          inventoryId: INVENTORY_ID,
          change: -8,
        }),
        (err) => err.statusCode === 409,
      );

      assert.equal(
        mockDb.clientQueries.some((q) => q.text.includes('INSERT INTO stock_movements')),
        false,
      );
    });

    it('returns 404 when the inventory record does not belong to the caller', async () => {
      mockDb.clientHandler = async () => ({ rows: [], rowCount: 0 });

      await assert.rejects(
        inventory.adjustInventoryQuantity(retailer, {
          inventoryId: INVENTORY_ID,
          change: 5,
        }),
        (err) => err.statusCode === 404,
      );
    });

    it('updates stock and records a movement on success', async () => {
      mockDb.clientHandler = async (text) => {
        if (text.includes('UPDATE inventory')) {
          return {
            rows: [{
              id: INVENTORY_ID,
              business_id: BUSINESS_ID,
              product_id: PRODUCT_ID,
              quantity: 12,
            }],
            rowCount: 1,
          };
        }

        return { rows: [], rowCount: 1 };
      };

      const result = await inventory.adjustInventoryQuantity(retailer, {
        inventoryId: INVENTORY_ID,
        change: 2,
        note: 'Restocked',
      });

      assert.equal(result.quantity, 12);
      assert.equal(result.adjustment, 2);
      assert.equal(
        mockDb.clientQueries.some((q) => q.text.includes('INSERT INTO stock_movements')),
        true,
      );
    });
  });
});
