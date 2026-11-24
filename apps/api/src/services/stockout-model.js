/**
 * Stockout prediction model — pure maths, no database. Explained in docs/STOCKOUT_MODEL.md.
 * Idea: sales in a day follow a Poisson distribution, so we can work out the
 * chance that demand during the supplier's lead time is bigger than our stock.
 */
export const HISTORY_DAYS = 28; // how many days of past sales we look at
const MIN_DAYS_WITH_SALES = 7; // below this we do not trust the average
const round = (number) => Math.round(number * 100) / 100;

// P(demand >= stock) when demand is Poisson with mean lambda.
export function stockoutProbability(stock, lambda) {
  if (stock <= 0) return 1;
  if (lambda <= 0) return 0;

  let term = Math.exp(-lambda); // P(demand = 0)
  let cumulative = term;
  for (let k = 1; k < stock; k += 1) {
    term *= lambda / k; // P(demand = k) from P(demand = k - 1)
    cumulative += term;
  }
  return Math.min(1, Math.max(0, 1 - cumulative));
}

// Turns a stockout probability into a risk label (thresholds from the model doc).
function riskFromProbability(probability) {
  if (probability >= 0.5) return 'HIGH';
  if (probability >= 0.2) return 'MEDIUM';
  return 'LOW';
}

// Fallback for products with too little sales history.
function riskFromThreshold(stock, minStock) {
  if (stock <= minStock) return 'HIGH';
  if (stock <= 1.5 * minStock) return 'MEDIUM';
  return 'LOW';
}

// How many units the retailer should order for a product that is running low.
function suggestedQuantity(item, avgDailyDemand, reliable) {
  let quantity = item.reorder_quantity; // default when we have no reliable sales average
  if (reliable) {
    const coverDays = item.lead_time_days + 7; // lead time plus one week
    const targetStock = Math.ceil(avgDailyDemand * coverDays) + item.min_stock;
    quantity = Math.max(item.reorder_quantity, targetStock - item.stock);
  }
  return Math.min(quantity, item.available_quantity); // wholesaler cannot send more than it has
}

// Builds the prediction for one product from one row of the query in predictions.service.js.
export function predict(item) {
  // Average units sold per day over the history window.
  const avgDailyDemand = item.units_sold / HISTORY_DAYS;
  const reliable = item.days_with_sales >= MIN_DAYS_WITH_SALES;

  // Poisson needs enough history; otherwise fall back to the simple threshold rule.
  let probability = null;
  let risk;
  if (reliable) {
    probability = stockoutProbability(item.stock, avgDailyDemand * item.lead_time_days);
    risk = riskFromProbability(probability);
  } else {
    risk = riskFromThreshold(item.stock, item.min_stock);
  }

  return {
    productId: item.product_id,
    productName: item.product_name,
    wholesalerId: item.wholesaler_id,
    stock: item.stock,
    avgDailyDemand: round(avgDailyDemand),
    leadTimeDays: item.lead_time_days,
    stockoutProbability: probability === null ? null : round(probability),
    risk,
    method: reliable ? 'POISSON' : 'THRESHOLD',
    daysOfStockLeft: avgDailyDemand > 0 ? Math.round(item.stock / avgDailyDemand) : null,
    suggestedQuantity: risk === 'LOW' ? 0 : suggestedQuantity(item, avgDailyDemand, reliable),
  };
}
