// 局部金额换算，不改变其他页面。
function cents(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
function money(value) {
  return (cents(value) / 100).toFixed(2);
}
function enabled(v) {
  return v === true || v === 1 || v === "1";
}
module.exports = { cents, money, enabled };
