// Database columns are snake_case, the API speaks camelCase (see docs/API.md).
export function toCamel(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  return result;
}
