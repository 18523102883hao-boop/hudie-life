const LOCATION_KEY = 'foodmap_location';
const LOCATION_TTL = 30 * 60 * 1000;
let chosenOrigin = null;

function point(value) {
  if (!value) return null;
  const lat = Number(value.lat === undefined ? value.latitude : value.lat);
  const lng = Number(value.lng === undefined ? value.longitude : value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {lat, lng};
}
function location() {
  let saved;
  try { saved = wx.getStorageSync(LOCATION_KEY); } catch (e) { return null; }
  return saved && saved.coord === 'gcj02' && saved.expire_time > Date.now() &&
    saved.expire_time <= Date.now() + LOCATION_TTL && point(saved) ? saved : null;
}
function origin() {
  if (chosenOrigin && chosenOrigin.expire_time > Date.now()) return chosenOrigin;
  chosenOrigin = null;
  return location();
}
function chooseOrigin(value) {
  const result = point(value);
  if (!result) return null;
  chosenOrigin = Object.assign(result, {name: value.name || value.address || '所选地址', manual: true, expire_time: Date.now() + LOCATION_TTL});
  return chosenOrigin;
}
function clearChosenOrigin() { chosenOrigin = null; }
function locate() {
  return new Promise((resolve, reject) => {
    function acquire() {
      wx.getLocation({type: 'gcj02', success(value) {
        const result = point(value);
        if (!result) { reject(new Error('定位坐标无效，请重试')); return; }
        const saved = Object.assign(result, {coord: 'gcj02', expire_time: Date.now() + LOCATION_TTL});
        wx.setStorageSync(LOCATION_KEY, saved);
        resolve(saved);
      }, fail() { reject(new Error('未能获取定位，可按行政区浏览或选择地址')); }});
    }
    wx.getSetting({success(value) {
      if (value.authSetting['scope.userLocation']) { acquire(); return; }
      wx.authorize({scope: 'scope.userLocation', success: acquire,
        fail() { reject(new Error('未开启定位，可按行政区浏览或选择地址')); }});
    }, fail() { reject(new Error('读取定位权限失败，请重试')); }});
  });
}
function request(url, data) {
  return new Promise((resolve, reject) => getApp().util.request({url, data, method: 'post', publicBrowse: true, noCache: true,
    success(response) {
      const body = response && response.data;
      if (!body || body.code != 0) { reject(new Error(body && body.msg || '加载失败，请重试')); return; }
      resolve(body.data);
    }, fail() { reject(new Error('网络异常，请重试')); }}));
}
function money(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') : '--';
}
function distanceText(meters) {
  if (!Number.isFinite(meters) || meters >= 2000000) return '--';
  if (meters < 100) return '< 100m';
  return meters >= 1000 ? Number((meters / 1000).toFixed(2)) + 'km' : Math.floor(meters) + 'm';
}
function distance(a, b) {
  a = point(a); b = point(b);
  if (!a || !b) return null;
  const rad = Math.PI / 180, dy = (b.lat - a.lat) * rad, dx = (b.lng - a.lng) * rad;
  const h = Math.sin(dy / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dx / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function card(value, hasOrigin) {
  const result = Object.assign({}, value);
  result.priceText = money(result.price);
  result.marketPriceText = money(result.market_price);
  result.discount = Number(result.market_price) > Number(result.price) && Number(result.price) >= 0 ?
    (Number(result.price) / Number(result.market_price) * 10).toFixed(1).replace(/\.0$/, '') + '折' : '';
  result.distanceText = hasOrigin && point(result) ? (result.distance || '--') : '';
  result.key = result.type + '_' + result.id;
  return result;
}
function remaining(endTime, now) {
  let seconds = Math.max(0, Math.floor(Number(endTime) - (now || Date.now()) / 1000));
  if (!seconds) return '已结束';
  const days = Math.floor(seconds / 86400); seconds %= 86400;
  const hours = Math.floor(seconds / 3600); seconds %= 3600;
  const pad = value => String(value).padStart(2, '0');
  return '距结束' + (days ? days + '天' : '') + pad(hours) + ':' + pad(Math.floor(seconds / 60)) + ':' + pad(seconds % 60);
}
function detail(item) {
  const routes = {1: 'goods/index', 2: 'product/info', 3: 'goods_group/info'};
  const route = item && routes[Number(item.type)], id = Number(item && item.id);
  if (!route || !Number.isInteger(id) || id <= 0) return false;
  wx.navigateTo({url: '/pages/' + route + '?scene=' + id + '_0'});
  return true;
}
function navigate(store) {
  const target = point(store);
  if (!target) { wx.showToast({title: '门店暂无有效坐标', icon: 'none'}); return false; }
  wx.openLocation({latitude: target.lat, longitude: target.lng, name: store.name || '', address: store.address || '', scale: 16});
  return true;
}
function phone(value) {
  if (!value) { wx.showToast({title: '暂无联系电话', icon: 'none'}); return; }
  wx.makePhoneCall({phoneNumber: String(value)});
}
module.exports = {LOCATION_KEY, LOCATION_TTL, point, location, origin, chooseOrigin, clearChosenOrigin, locate,
  request, money, distanceText, distance, card, remaining, detail, navigate, phone};
