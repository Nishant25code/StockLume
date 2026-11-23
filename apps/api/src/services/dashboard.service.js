/**
 * dashboard service — OWNER: Member 4 — Notifications & Analytics
 *
 * Business logic + SQL lives here. Always use parameterized queries and
 * always scope queries to the caller's business (req.user.businessId).
 */
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { formatNotification } from './notifications.service.js';

/**
 * Returns KPI metrics and summary data for a retailer:
 * - stockValue: total valuation of current inventory (quantity * product price)
 * - lowStockCount: count of inventory items at or below reorder threshold (min_stock)
 * - openOrders: count of active placed purchase orders (SUBMITTED, ACCEPTED, DISPATCHED)
 * - sales7d: total sales revenue in the last 7 days
 * - lowStockAlerts: preview list of items needing reorder
 * - recentNotifications: latest notifications
 *
 * @param {string} businessId
 */
export async function getRetailerDashboard(businessId) {
  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }

  const stockValuationSql = `
    select coalesce(sum(i.quantity * p.price), 0)::numeric(12, 2) as stock_value,
           coalesce(sum(i.quantity), 0)::integer as total_items
      from inventory i
      join products p on p.id = i.product_id
     where i.business_id = $1
  `;

  const lowStockCountSql = `
    select count(*)::integer as low_stock_count
      from inventory i
      left join reorder_rules r on r.retailer_id = i.business_id and r.product_id = i.product_id
     where i.business_id = $1
       and i.quantity <= coalesce(r.min_stock, 10)
  `;

  const openOrdersSql = `
    select count(*)::integer as open_orders,
           coalesce(sum(total_amount), 0)::numeric(12, 2) as open_orders_value
      from orders
     where retailer_id = $1
       and status in ('SUBMITTED', 'ACCEPTED', 'DISPATCHED')
  `;

  const sales7dSql = `
    select coalesce(sum(quantity * unit_price), 0)::numeric(12, 2) as sales_7d,
           coalesce(sum(quantity), 0)::integer as items_sold_7d
      from sales
     where retailer_id = $1
       and sold_at >= now() - interval '7 days'
  `;

  const lowStockAlertsSql = `
    select p.id as product_id,
           p.name as product_name,
           p.sku,
           i.quantity,
           coalesce(r.min_stock, 10)::integer as min_stock,
           w.name as wholesaler_name
      from inventory i
      join products p on p.id = i.product_id
      join businesses w on w.id = p.wholesaler_id
      left join reorder_rules r on r.retailer_id = i.business_id and r.product_id = i.product_id
     where i.business_id = $1
       and i.quantity <= coalesce(r.min_stock, 10)
     order by i.quantity asc
     limit 5
  `;

  const recentNotificationsSql = `
    select id, business_id, type, title, message, related_order_id, related_product_id, is_read, created_at
      from notifications
     where business_id = $1
     order by is_read asc, created_at desc
     limit 5
  `;

  const [
    stockResult,
    lowStockResult,
    openOrdersResult,
    salesResult,
    lowStockAlertsResult,
    notificationsResult,
  ] = await Promise.all([
    query(stockValuationSql, [businessId]),
    query(lowStockCountSql, [businessId]),
    query(openOrdersSql, [businessId]),
    query(sales7dSql, [businessId]),
    query(lowStockAlertsSql, [businessId]),
    query(recentNotificationsSql, [businessId]),
  ]);

  const stockValue = Number(stockResult.rows[0]?.stock_value ?? 0);
  const lowStockCount = Number(lowStockResult.rows[0]?.low_stock_count ?? 0);
  const openOrders = Number(openOrdersResult.rows[0]?.open_orders ?? 0);
  const sales7d = Number(salesResult.rows[0]?.sales_7d ?? 0);

  const lowStockAlerts = lowStockAlertsResult.rows.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    quantity: row.quantity,
    minStock: row.min_stock,
    wholesalerName: row.wholesaler_name,
  }));

  const recentNotifications = notificationsResult.rows.map(formatNotification);

  return {
    stockValue,
    lowStockCount,
    lowStockItems: lowStockCount,
    openOrders,
    sales7d,
    salesThisWeek: sales7d,
    recentSales: sales7d,
    kpis: {
      stockValue,
      lowStockCount,
      openOrders,
      sales7d,
    },
    lowStockAlerts,
    recentNotifications,
  };
}

/**
 * Returns KPI metrics and summary data for a wholesaler:
 * - pendingOrders: count of orders awaiting wholesaler acceptance (SUBMITTED)
 * - revenue: total revenue from accepted, dispatched, or delivered orders
 * - connectedRetailers: count of active connected retailers
 * - topProducts: top ordered products
 * - pendingOrdersList: preview list of orders awaiting review
 * - recentNotifications: latest notifications
 *
 * @param {string} businessId
 */
export async function getWholesalerDashboard(businessId) {
  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }

  const pendingOrdersSql = `
    select count(*)::integer as pending_orders,
           coalesce(sum(total_amount), 0)::numeric(12, 2) as pending_orders_value
      from orders
     where wholesaler_id = $1
       and status = 'SUBMITTED'
  `;

  const revenueSql = `
    select coalesce(sum(total_amount), 0)::numeric(12, 2) as total_revenue
      from orders
     where wholesaler_id = $1
       and status in ('ACCEPTED', 'DISPATCHED', 'DELIVERED')
  `;

  const connectionsSql = `
    select count(*)::integer as connected_retailers
      from business_connections
     where wholesaler_id = $1
       and status = 'ACTIVE'
  `;

  const topProductsSql = `
    select p.id as product_id,
           p.name as product_name,
           p.sku,
           p.price,
           p.available_quantity,
           coalesce(sum(oi.quantity), 0)::integer as total_ordered,
           coalesce(sum(oi.quantity * oi.unit_price), 0)::numeric(12, 2) as total_revenue
      from products p
      left join order_items oi on oi.product_id = p.id
      left join orders o on o.id = oi.order_id and o.status not in ('DRAFT', 'CANCELLED', 'REJECTED')
     where p.wholesaler_id = $1
       and p.is_active = true
     group by p.id, p.name, p.sku, p.price, p.available_quantity
     order by total_ordered desc
     limit 5
  `;

  const pendingOrdersListSql = `
    select o.id,
           o.order_number,
           o.total_amount,
           o.submitted_at,
           b.name as retailer_name
      from orders o
      join businesses b on b.id = o.retailer_id
     where o.wholesaler_id = $1
       and o.status = 'SUBMITTED'
     order by o.submitted_at desc
     limit 5
  `;

  const recentNotificationsSql = `
    select id, business_id, type, title, message, related_order_id, related_product_id, is_read, created_at
      from notifications
     where business_id = $1
     order by is_read asc, created_at desc
     limit 5
  `;

  const [
    pendingResult,
    revenueResult,
    connectionsResult,
    topProductsResult,
    pendingOrdersListResult,
    notificationsResult,
  ] = await Promise.all([
    query(pendingOrdersSql, [businessId]),
    query(revenueSql, [businessId]),
    query(connectionsSql, [businessId]),
    query(topProductsSql, [businessId]),
    query(pendingOrdersListSql, [businessId]),
    query(recentNotificationsSql, [businessId]),
  ]);

  const pendingOrders = Number(pendingResult.rows[0]?.pending_orders ?? 0);
  const revenue = Number(revenueResult.rows[0]?.total_revenue ?? 0);
  const connectedRetailers = Number(connectionsResult.rows[0]?.connected_retailers ?? 0);

  const topProducts = topProductsResult.rows.map((row) => ({
    productId: row.product_id,
    name: row.product_name,
    sku: row.sku,
    price: Number(row.price),
    availableQuantity: row.available_quantity,
    totalOrdered: Number(row.total_ordered),
    totalRevenue: Number(row.total_revenue),
  }));

  const pendingOrdersList = pendingOrdersListResult.rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    totalAmount: Number(row.total_amount),
    submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : row.submitted_at,
    retailerName: row.retailer_name,
  }));

  const recentNotifications = notificationsResult.rows.map(formatNotification);

  return {
    pendingOrders,
    revenue,
    totalRevenue: revenue,
    connectedRetailers,
    kpis: {
      pendingOrders,
      revenue,
      connectedRetailers,
    },
    topProducts,
    pendingOrdersList,
    recentNotifications,
  };
}

// Aliases
export const retailerDashboard = getRetailerDashboard;
export const wholesalerDashboard = getWholesalerDashboard;
