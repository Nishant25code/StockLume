import { sendSuccess } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';
import * as salesService from '../services/sales.service.js';

// Small input checks used below.
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isBadDate = (value) => value !== undefined && Number.isNaN(Date.parse(value));

export async function list(req, res) {
  const { productId, from, to } = req.query;
  if (isBadDate(from) || isBadDate(to)) throw ApiError.badRequest('from and to must be valid dates');

  return sendSuccess(res, await salesService.list(req.user.businessId, { productId, from, to }));
}

export async function create(req, res) {
  const { productId, quantity, unitPrice } = req.body;
  if (!productId) throw ApiError.badRequest('productId is required', { field: 'productId' });
  if (!isPositiveInteger(quantity)) throw ApiError.badRequest('quantity must be a positive integer', { field: 'quantity' });
  if (unitPrice !== undefined && !(unitPrice >= 0)) throw ApiError.badRequest('unitPrice must be 0 or more', { field: 'unitPrice' });

  return sendSuccess(res, await salesService.create(req.user, { productId, quantity, unitPrice }), 201);
}

export async function simulate(req, res) {
  const days = req.body.days ?? 7; // default: one week of demo sales
  if (!isPositiveInteger(days) || days > 60) throw ApiError.badRequest('days must be a whole number from 1 to 60', { field: 'days' });

  return sendSuccess(res, await salesService.simulate(req.user, days), 201);
}
