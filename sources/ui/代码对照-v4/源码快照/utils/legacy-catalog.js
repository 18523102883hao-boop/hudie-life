const city = require('./city');
const catalog = require('./catalog');
const protocol = require('./catalog-protocol');
// 只读页面直接使用已有身份；私有页面仍由原登录守卫负责。
function browse(callback) { callback(); }
function enhance(definition, app, options) {
  definition.data.page = 1;
  const originalLoad = definition.onLoad;
  const originalShow = definition.onShow;
  const originalUnload = definition.onUnload;
  const originalArea = definition.selArea;
  function invalidate(page) {
    page._legacyVersion = (page._legacyVersion || 0) + 1;
    page.setData({page: 1, list: [], is_end: 0, loading: false});
  }
  ['search', 'searchCate', 'cateSel', 'setLocation', 'onPullDownRefresh'].forEach(name => {
    const original = definition[name];
    if (typeof original === 'function') definition[name] = function(...args) { invalidate(this); return original.apply(this, args); };
  });
  definition.selArea = function(event) {
    if (!protocol.enabledState() && originalArea) { invalidate(this); return originalArea.call(this, event); }
    const name = event.currentTarget.dataset.city;
    if (!name) { app.util.showToast('请选择具体城市'); return; }
    city.select(name); this._legacyCity = name;
    this.setData({city: name, county: event.currentTarget.dataset.county || '', province: '', showArea: 0});
    invalidate(this); return this[options.method || 'getGoodsList']();
  };
  // 统一走 catalog.location()：写缓存、失败降级到历史坐标，并在被拒后引导一次设置。
  definition.getLocation = function() {
    const method = options.method || 'getGoodsList';
    return catalog.location().then(pos => {
      if (this._legacyDisposed) return;
      this.setData({location: pos && Number(pos.lat) && Number(pos.lng) ? pos : {lng: 0, lat: 0}});
      const pending = this[method]();
      if (!options.method && this.getItemGoods) this.getItemGoods();
      return pending;
    });
  };
  definition[options.method || 'getGoodsList'] = function() {
    if (this._legacyDisposed || this.data.loading || this.data.is_end) return;
    const version = this._legacyVersion || 0;
    const page = this.data.page;
    const data = this.data;
    const pos = data.location || {};
    const params = Object.assign({page, limit: data.limit || 10, city: data.city || '', province: data.province || '', county: data.county || '',
      cate: options.cate || (['全部', '全部类目'].includes(data.cate) ? '' : data.cate || ''),
      title: data.keywords || '', lng: Number(pos.lng) || 0, lat: Number(pos.lat) || 0}, options.params || {});
    if (options.scene === 'new') params.get_cut_goods = data.get_cut_goods || 0;
    const url = options.scene === 'new' && data.act === 'offline' ? 'goods/getOfflineList' : options.url;
    this.setData({loading: true, catalogError: ''});
    const alive = () => !this._legacyDisposed && version === (this._legacyVersion || 0);
    const done = () => { if (alive()) this.setData({loading: false}); };
    return protocol.prepare({url, method: 'post', data: params,
      success: res => {
        if (!alive()) return;
        if (res.data && res.data.code == 0) {
          const rows = catalog.normalizeGoods(res.data.data);
          this.setData({page: page + 1, list: page === 1 ? rows : this.data.list.concat(rows), is_end: rows.length < params.limit ? 1 : 0});
        } else { const message = res.data && res.data.msg || '加载失败，请重试'; this.setData({catalogError: message}); app.util.showToast(message); }
      },
      fail: () => { if (alive()) { this.setData({catalogError: '网络异常，请重试'}); app.util.showToast('网络异常，请重试'); } },
      complete: done
    }, option => app.util.request(option)).then(prepared => {
      if (!alive()) return;
      this._legacyCity = prepared.data.city;
      if (prepared.data.contract_version == 2) this.setData({city: prepared.data.city, province: ''});
      return app.util.request(prepared);
    }).catch(error => { if (alive()) { this.setData({catalogError: error.message}); app.util.showToast(error.message); done(); } });
  };
  definition.onLoad = function(...args) { this._legacyDisposed = false; if (originalLoad) return originalLoad.apply(this, args); };
  definition.onShow = function(...args) {
    this.setData({now_time: Math.floor(Date.now() / 1000)});
    const selected = city.read();
    if (protocol.enabledState() && selected && this._legacyCity && selected.city !== this._legacyCity) {
      this._legacyCity = selected.city; this.setData({city: selected.city, county: ''}); invalidate(this); this[options.method || 'getGoodsList']();
    }
    // 部分旧列表的 onShow 同时查询私人付款队列，匿名浏览不进入该守卫。
    if (originalShow && ((wx.getStorageSync('userinfo') || {}).id > 0 || !String(originalShow).includes('checkLogin'))) return originalShow.apply(this, args);
  };
  definition.onUnload = function(...args) { this._legacyDisposed = true; this._legacyVersion = (this._legacyVersion || 0) + 1; if (originalUnload) originalUnload.apply(this, args); };
  return definition;
}
module.exports = {browse, enhance};
