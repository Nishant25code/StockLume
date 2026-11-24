import { sendSuccess } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';
import * as ordersService from '../services/orders.service.js';

// Controllers only check the request and call the service; the real work is in orders.service.js.
export async function suggest(req, res) {
  return sendSuccess(res, await ordersService.suggest(req.user));
}

export async function list(req, res) {
  return sendSuccess(res, await ordersService.list(req.user, req.query.status));
}

export async function getById(req, res) {
  return sendSuccess(res, await ordersService.getById(req.user, req.params.id));
}

export async function create(req, res) {
  const { wholesalerId, notes } = req.body;
  if (!wholesalerId) throw ApiError.badRequest('wholesalerId is required', { field: 'wholesalerId' });

  return sendSuccess(res, await ordersService.create(req.user, { wholesalerId, notes }), 201);
}

export async function replaceItems(req, res) {
  const { items } = req.body;
  if (!Array.isArray(items)) throw ApiError.badRequest('items must be an array', { field: 'items' });

  // Every item needs a product and a whole-number quantity above zero.
  const isValid = items.every((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0);
  if (!isValid) throw ApiError.badRequest('each item needs a productId and a positive whole-number quantity', { field: 'items' });

  // The same product twice in one order would be ambiguous, so refuse it.
  const hasDuplicates = new Set(items.map((item) => item.productId)).size !== items.length;
  if (hasDuplicates) throw ApiError.badRequest('each product can only appear once', { field: 'items' });

  return sendSuccess(res, await ordersService.replaceItems(req.user, req.params.id, items));
}

export async function submit(req, res) {
  return sendSuccess(res, await ordersService.submit(req.user, req.params.id));
}

export async function cancel(req, res) {
  return sendSuccess(res, await ordersService.cancel(req.user, req.params.id));
}

export async function accept(req, res) {
  return sendSuccess(res, await ordersService.accept(req.user, req.params.id));
}

export async function reject(req, res) {
  // A rejection must explain itself to the retailer.
  const reason = req.body.reason?.trim();
  if (!reason) throw ApiError.badRequest('reason is required', { field: 'reason' });

  return sendSuccess(res, await ordersService.reject(req.user, req.params.id, reason));
}

export async function dispatch(req, res) {
  return sendSuccess(res, await ordersService.dispatch(req.user, req.params.id));
}

export async function deliver(req, res) {
  return sendSuccess(res, await ordersService.deliver(req.user, req.params.id));
}
