import { sendSuccess } from '../utils/response.js';
import * as predictionsService from '../services/predictions.service.js';

export async function stockout(req, res) {
  return sendSuccess(res, await predictionsService.getPredictions(req.user.businessId));
}

export async function lowStock(req, res) {
  return sendSuccess(res, await predictionsService.getLowStockItems(req.user.businessId));
}
