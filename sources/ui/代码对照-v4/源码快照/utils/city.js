// 城市缓存只允许由本工具维护；合法的旧城市不因当前无供给被覆盖。
const KEY = 'mall_selected_city';
let pending = null;
function read() {
  let value;
  try { value = wx.getStorageSync(KEY); } catch (e) { return null; }
  return value && typeof value === 'object' && typeof value.city === 'string' &&
    value.city.trim() && value.city.length <= 100 &&
    Number.isFinite(value.ts) && value.ts > 0 ? {city: value.city, ts: value.ts} : null;
}
function select(city) {
  if (typeof city !== 'string' || !city.trim() || city.length > 100) throw new Error('请选择有效城市');
  const value = {city, ts: Date.now()};
  wx.setStorageSync(KEY, value);
  return value;
}
function initialize(request) {
  if (pending) return pending;
  pending = new Promise(resolve => {
    request({url: 'goods/getCities', method: 'post', noCache: true, publicBrowse: true,
      data: {contract_version: 2},
      success(res) {
        if (!res.data || res.data.code != 0 || !Array.isArray(res.data.data)) {
          resolve({status: 'error', selection: read(), cities: [], message: '城市加载失败，请重试'}); return;
        }
        const cities = res.data.data.filter(item => item && typeof item.city === 'string' && item.city.trim());
        // 请求期间用户主动切换时，以最新缓存为准。
        let selection = read();
        if (!selection && cities.length) selection = select(cities[0].city);
        const supplied = selection && cities.some(item => item.city === selection.city);
        resolve({status: supplied ? 'ready' : selection ? 'unavailable' : 'empty', selection, cities});
      },
      fail() { resolve({status: 'error', selection: read(), cities: [], message: '城市加载失败，请重试'}); }
    });
  }).then(result => { pending = null; return result; }, error => { pending = null; throw error; });
  return pending;
}
module.exports = {read, select, initialize};
