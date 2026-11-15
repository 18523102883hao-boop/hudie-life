// 套餐旧接口缺少展示金额时，按元单位补齐；零元及负金额按原口径保留。
function amount(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeSpecs(list) {
  if (!Array.isArray(list)) return [];
  return list.map(function (item) {
    const result = Object.assign({}, item);
    const price = amount(result.price);
    const maximum = amount(result.max_commission);
    const commission = amount(result.commission);
    const saving = maximum !== null ? maximum : (commission !== null ? commission : 0);
    const subsidized = amount(result.subsidy_price);
    if (maximum === null) result.max_commission = saving;
    // 先换算成整数分做减法，避免旧接口金额相减出现浮点尾数。
    result.subsidy_price = subsidized !== null ? subsidized : (price !== null ? (Math.round(price * 100) - Math.round(saving * 100)) / 100 : null);
    return result;
  });
}

module.exports = { normalizeSpecs };
