/**
 * analytics service — OWNER: Member 4 — Notifications & Analytics
 *
 * Business logic + SQL lives here. Always use parameterized queries and
 * always scope queries to the caller's business (req.user.businessId).
 */
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Returns daily sales trends for a retailer or wholesaler.
 * - Retailer: aggregated from retailer's `sales` table (daily revenue & quantities)
 * - Wholesaler: aggregated from non-draft, non-cancelled `orders` (daily ordered totals)
 *
 * @param {string} businessId
 * @param {'RETAILER'|'WHOLESALER'} role
 * @param {object} [options]
 * @param {number|string} [options.days=30] - number of days to look back
 */
export async function getSalesTrend(businessId, role, options = {}) {
  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }

  const daysNum = parseInt(options.days, 10);
  const days = Number.isInteger(daysNum) && daysNum > 0 ? Math.min(daysNum, 365) : 30;

  if (role === 'RETAILER') {
    const sql = `
      with date_series as (
        select to_char(d::date, 'YYYY-MM-DD') as date, d::date as day_date
          from generate_series(
            (current_date - ($2::integer - 1)),
            current_date,
            interval '1 day'
          ) d
      ),
      daily_sales as (
        select to_char(s.sold_at::date, 'YYYY-MM-DD') as date,
               sum(s.quantity * s.unit_price) as total_amount,
               sum(s.quantity) as total_quantity,
               count(*) as transaction_count
          from sales s
         where s.retailer_id = $1
           and s.sold_at >= current_date - ($2::integer - 1)
         group by to_char(s.sold_at::date, 'YYYY-MM-DD')
      )
      select ds.date,
             coalesce(s.total_amount, 0)::numeric(12, 2) as total_amount,
             coalesce(s.total_quantity, 0)::integer as total_quantity,
             coalesce(s.transaction_count, 0)::integer as order_count
        from date_series ds
        left join daily_sales s on s.date = ds.date
       order by ds.day_date asc
    `;

    const { rows } = await query(sql, [businessId, days]);
    return rows.map((r) => ({
      date: r.date,
      totalAmount: Number(r.total_amount),
      totalQuantity: Number(r.total_quantity),
      orderCount: Number(r.order_count),
    }));
  }

  if (role === 'WHOLESALER') {
    const sql = `
      with date_series as (
        select to_char(d::date, 'YYYY-MM-DD') as date, d::date as day_date
          from generate_series(
            (current_date - ($2::integer - 1)),
            current_date,
            interval '1 day'
          ) d
      ),
      daily_orders as (
        select to_char(coalesce(o.submitted_at, o.created_at)::date, 'YYYY-MM-DD') as date,
               sum(o.total_amount) as total_amount,
               count(*) as order_count
          from orders o
         where o.wholesaler_id = $1
           and o.status not in ('DRAFT', 'CANCELLED', 'REJECTED')
           and coalesce(o.submitted_at, o.created_at) >= current_date - ($2::integer - 1)
         group by to_char(coalesce(o.submitted_at, o.created_at)::date, 'YYYY-MM-DD')
      )
      select ds.date,
             coalesce(o.total_amount, 0)::numeric(12, 2) as total_amount,
             coalesce(o.order_count, 0)::integer as order_count
        from date_series ds
        left join daily_orders o on o.date = ds.date
       order by ds.day_date asc
    `;

    const { rows } = await query(sql, [businessId, days]);
    return rows.map((r) => ({
      date: r.date,
      totalAmount: Number(r.total_amount),
      orderCount: Number(r.order_count),
    }));
  }

  throw ApiError.forbidden('Invalid role for sales trend');
}

/**
 * Returns top products (best sellers):
 * - Retailer: top products by retail quantity sold
 * - Wholesaler: top products by ordered quantity
 *
 * @param {string} businessId
 * @param {'RETAILER'|'WHOLESALER'} role
 * @param {object} [options]
 * @param {number|string} [options.limit=10]
 */
export async function getTopProducts(businessId, role, options = {}) {
  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }

  const limitNum = parseInt(options.limit, 10);
  const limit = Number.isInteger(limitNum) && limitNum > 0 ? Math.min(limitNum, 100) : 10;

  if (role === 'RETAILER') {
    const sql = `
      select p.id as product_id,
             p.name as product_name,
             p.sku,
             p.category,
             p.unit,
             p.price,
             w.name as wholesaler_name,
             coalesce(sum(s.quantity), 0)::integer as total_sold,
             coalesce(sum(s.quantity * s.unit_price), 0)::numeric(12, 2) as total_revenue
        from sales s
        join products p on p.id = s.product_id
        join businesses w on w.id = p.wholesaler_id
       where s.retailer_id = $1
       group by p.id, p.name, p.sku, p.category, p.unit, p.price, w.name
       order by total_sold desc
       limit $2
    `;

    const { rows } = await query(sql, [businessId, limit]);
    return rows.map((r) => ({
      productId: r.product_id,
      name: r.product_name,
      sku: r.sku,
      category: r.category,
      unit: r.unit,
      price: Number(r.price),
      wholesalerName: r.wholesaler_name,
      totalSold: Number(r.total_sold),
      totalQuantity: Number(r.total_sold),
      totalRevenue: Number(r.total_revenue),
    }));
  }

  if (role === 'WHOLESALER') {
    const sql = `
      select p.id as product_id,
             p.name as product_name,
             p.sku,
             p.category,
             p.unit,
             p.price,
             p.available_quantity,
             coalesce(sum(oi.quantity), 0)::integer as total_ordered,
             coalesce(sum(oi.quantity * oi.unit_price), 0)::numeric(12, 2) as total_revenue,
             count(distinct o.id)::integer as order_count
        from products p
        join order_items oi on oi.product_id = p.id
        join orders o on o.id = oi.order_id
       where p.wholesaler_id = $1
         and o.status not in ('DRAFT', 'CANCELLED', 'REJECTED')
       group by p.id, p.name, p.sku, p.category, p.unit, p.price, p.available_quantity
       order by total_ordered desc
       limit $2
    `;

    const { rows } = await query(sql, [businessId, limit]);
    return rows.map((r) => ({
      productId: r.product_id,
      name: r.product_name,
      sku: r.sku,
      category: r.category,
      unit: r.unit,
      price: Number(r.price),
      availableQuantity: r.available_quantity,
      totalOrdered: Number(r.total_ordered),
      totalQuantity: Number(r.total_ordered),
      totalRevenue: Number(r.total_revenue),
      orderCount: Number(r.order_count),
    }));
  }

  throw ApiError.forbidden('Invalid role for top products');
}

/**
 * Returns count of orders by status.
 * - Retailer: includes all orders for this retailer (including DRAFT)
 * - Wholesaler: orders for this wholesaler (strictly excluding DRAFT)
 *
 * @param {string} businessId
 * @param {'RETAILER'|'WHOLESALER'} role
 * @param {object} [options]
 * @param {number|string} [options.days] - optional filter for recent orders
 */
export async function getOrdersSummary(businessId, role, options = {}) {
  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }

  const daysNum = options.days ? parseInt(options.days, 10) : null;
  const hasDaysFilter = Number.isInteger(daysNum) && daysNum > 0;

  if (role === 'RETAILER') {
    const whereConditions = ['retailer_id = $1'];
    const params = [businessId];

    if (hasDaysFilter) {
      whereConditions.push(`created_at >= now() - ($2 || ' days')::interval`);
      params.push(daysNum);
    }

    const sql = `
      select status,
             count(*)::integer as count,
             coalesce(sum(total_amount), 0)::numeric(12, 2) as total_amount
        from orders
       where ${whereConditions.join(' and ')}
       group by status
       order by status
    `;

    const { rows } = await query(sql, params);

    const counts = {
      DRAFT: 0,
      SUBMITTED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      DISPATCHED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let totalOrders = 0;
    let totalAmount = 0;

    const byStatus = rows.map((r) => {
      const count = Number(r.count);
      const amount = Number(r.total_amount);
      if (counts[r.status] !== undefined) counts[r.status] = count;
      totalOrders += count;
      totalAmount += amount;
      return {
        status: r.status,
        count,
        totalAmount: amount,
      };
    });

    return {
      totalOrders,
      totalAmount: Number(totalAmount.toFixed(2)),
      counts,
      byStatus,
    };
  }

  if (role === 'WHOLESALER') {
    const whereConditions = ["wholesaler_id = $1", "status <> 'DRAFT'"];
    const params = [businessId];

    if (hasDaysFilter) {
      whereConditions.push(`coalesce(submitted_at, created_at) >= now() - ($2 || ' days')::interval`);
      params.push(daysNum);
    }

    const sql = `
      select status,
             count(*)::integer as count,
             coalesce(sum(total_amount), 0)::numeric(12, 2) as total_amount
        from orders
       where ${whereConditions.join(' and ')}
       group by status
       order by status
    `;

    const { rows } = await query(sql, params);

    const counts = {
      SUBMITTED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      DISPATCHED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let totalOrders = 0;
    let totalAmount = 0;

    const byStatus = rows.map((r) => {
      const count = Number(r.count);
      const amount = Number(r.total_amount);
      if (counts[r.status] !== undefined) counts[r.status] = count;
      totalOrders += count;
      totalAmount += amount;
      return {
        status: r.status,
        count,
        totalAmount: amount,
      };
    });

    return {
      totalOrders,
      totalAmount: Number(totalAmount.toFixed(2)),
      counts,
      byStatus,
    };
  }

  throw ApiError.forbidden('Invalid role for orders summary');
}

// Aliases
export const salesTrend = getSalesTrend;
export const topProducts = getTopProducts;
export const ordersSummary = getOrdersSummary;
