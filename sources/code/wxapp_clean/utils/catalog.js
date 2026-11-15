const city = require('./city');
const protocol = require('./catalog-protocol');
function request(app, url, data) {
  return new Promise((resolve, reject) => app.util.request({url, data: Object.assign({contract_version: 2}, data),
    method: 'post', noCache: true, publicBrowse: true,
    success(res) { res.data && res.data.code == 0 ? resolve(res.data.data) : reject(new Error(res.data && res.data.msg || '加载失败，请重试')); },
    fail() { reject(new Error('网络异常，请重试')); }
  }));
}
function tree(app) { return request(app, 'index/getCate', {}).then(rows => (Array.isArray(rows) ? rows : []).filter(row => Number(row.id) > 0).map(row => Object.assign({}, row, {children: Array.isArray(row.children) ? row.children : []}))); }
const LOCATION_TTL = 30 * 60 * 1000;
// 距离展示依赖坐标：缓存过期也要留作降级，避免列表在有历史定位时反而丢距离。
function cachedLocation() {
  let saved;
  try { saved = wx.getStorageSync('location'); } catch (e) { return null; }
  return saved && Number(saved.lat) && Number(saved.lng) ? saved : null;
}
// 仅在用户明确拒绝过定位时引导一次，系统级关闭定位不打扰。
function guideLocationSetting() {
  let last = 0;
  try { last = Number(wx.getStorageSync('location_guide_ts')) || 0; } catch (e) { last = 0; }
  if (last && Date.now() - last < 7 * 86400000) return;
  wx.getSetting({
    success(res) {
      if (!res.authSetting || res.authSetting['scope.userLocation'] !== false) return;
      wx.setStorageSync('location_guide_ts', Date.now());
      wx.showModal({
        title: '未开启位置权限', content: '开启后可以查看商品距离', confirmText: '去设置',
        success(r) { if (r.confirm) wx.openSetting(); }
      });
    },
    fail() {}
  });
}
function location() {
  const saved = cachedLocation();
  if (saved && Number(saved.expire_time) > Date.now()) return Promise.resolve(saved);
  return new Promise(resolve => wx.getLocation({type: 'gcj02',
    success(value) {
      const pos = {lat: value.latitude, lng: value.longitude, expire_time: Date.now() + LOCATION_TTL};
      try { wx.setStorageSync('location', pos); } catch (e) {}
      resolve(pos);
    },
    fail() { guideLocationSetting(); resolve(saved); }
  }));
}
function normalizeGoods(rows) {
  return (Array.isArray(rows) ? rows : []).map(item => Object.assign({}, item, {
    sale_price: (Number(item.price || 0) - Number(item.cut_amount || 0)).toFixed(2).replace(/\.00$/, ''),
    tag: Array.isArray(item.tag) ? item.tag : String(item.tag || '').split(' ').filter(Boolean)
  }));
}
const initial = {home_catalog_enable: false, city: '', cityLabel: '选择城市', area_width: 156, cityStatus: 'loading', cityChoices: [], cityDialog: false,
  categories: [], categoryOptions: [], primaryId: '', categoryId: '', county: '', districts: [],
  order: 'smart', orderChosen: false, page: 1, limit: 10, loading: false, is_end: 0, list: [], error: '', ready: false};
function controller(app, categoryPage) {
  return {
    async prepareCatalog() {
      if (this._catalogInit) return this._catalogInit;
      const pending = (async () => {
        const version = this._catalogVersion || 0;
        this.setData({error: ''});
        try {
          const result = await city.initialize(options => app.util.request(options));
          if (this._catalogDisposed || version !== (this._catalogVersion || 0)) return;
          const name = result.selection ? result.selection.city : '';
          const label = name.replace(/市$/, '') || '选择城市';
          const changed = this.data.city !== name;
          if (changed) { this._filterVersion = (this._filterVersion || 0) + 1; this.invalidateCatalog(); this.setData({ready: false}); }
          this.setData({city: name, cityLabel: label, cityStatus: result.status,
            cityChoices: result.cities.map(item => Object.assign({}, item, {label: item.city.replace(/市$/, '')})),
            area_width: Math.max(126, Math.min(180, (label.length * 15 + 18) * 2)), error: result.message || ''});
          if (result.status !== 'ready') { this._catalogLoaded = false; this.invalidateCatalog(); return; }
          // 先取定位再拉列表，否则后端收不到经纬度会返回 distant=-1，列表不显示距离。
          const pos = await location();
          if (this._catalogDisposed || version !== (this._catalogVersion || 0)) return;
          if (pos && Number(pos.lat) && Number(pos.lng)) this.setData({location: pos});
          const categories = await tree(app);
          if (this._catalogDisposed || version !== (this._catalogVersion || 0)) return;
          let primary = categories.find(item => String(item.id) === String(this.data.primaryId || this._entryPrimary));
          if (!primary && this._entryName) primary = categories.find(item => item.name === this._entryName);
          if (categoryPage && !primary) primary = categories[0];
          const primaryChanged = categoryPage && this.data.primaryId !== (primary ? String(primary.id) : '');
          this.setData({categories, primaryId: categoryPage ? (primary ? String(primary.id) : '') : this.data.primaryId,
            categoryOptions: categoryPage ? (primary ? primary.children : []) : categories, ready: true});
          if (changed) this.setData({county: '', categoryId: ''});
          // 区县选项是附加筛选，不能阻塞城市商品列表请求。
          this.loadDistricts();
          if (changed || primaryChanged || !this._catalogLoaded) this.resetCatalog();
          if (changed && this.refreshCatalogFeed) this.refreshCatalogFeed();
        } catch (error) {
          if (!this._catalogDisposed && version === (this._catalogVersion || 0)) {
            this._catalogLoaded = false; this.setData({error: error.message, ready: false});
          }
        }
      })().finally(() => { if (this._catalogInit === pending) this._catalogInit = null; });
      this._catalogInit = pending;
      return pending;
    },
    async loadDistricts() {
      const name = this.data.city;
      try {
        const rows = await request(app, 'goods/getDistricts', {city: name});
        if (!this._catalogDisposed && name === this.data.city) this.setData({districts: Array.isArray(rows) ? rows : [], districtError: ''});
      } catch (error) { if (!this._catalogDisposed && name === this.data.city) this.setData({districts: [], districtError: error.message}); }
    },
    invalidateCatalog() {
      this._requestVersion = (this._requestVersion || 0) + 1;
      this.setData({page: 1, list: [], is_end: 0, loading: false});
    },
    resetCatalog() { this.invalidateCatalog(); return this.getGoodsList(); },
    getGoodsList() {
      if (this._catalogDisposed || !this.data.ready || this.data.cityStatus !== 'ready' || !this.data.city ||
        (categoryPage && !this.data.primaryId) || this.data.loading || this.data.is_end) return Promise.resolve();
      const version = this._requestVersion || 0;
      const page = this.data.page;
      const params = {city: this.data.city, county: this.data.county, order: this.data.order,
        cate_ids: categoryPage ? this.data.primaryId : this.data.categoryId, cate_second_ids: categoryPage ? this.data.categoryId : '',
        page, limit: this.data.limit, title: this.data.keywords || ''};
      if (categoryPage) params.list_scene = 'category';
      const pos = this.data.location;
      if (pos && Number(pos.lat) && Number(pos.lng)) Object.assign(params, {lng: pos.lng, lat: pos.lat});
      this.setData({loading: true, error: ''});
      this._catalogLoaded = true;
      return request(app, 'goods/getListAll', params).then(rows => {
        if (this._catalogDisposed || version !== (this._requestVersion || 0)) return;
        const list = normalizeGoods(rows);
        this.setData({list: page === 1 ? list : this.data.list.concat(list), page: page + 1, is_end: list.length < this.data.limit ? 1 : 0});
      }).catch(error => {
        if (!this._catalogDisposed && version === (this._requestVersion || 0)) this.setData({error: error.message});
      }).finally(() => {
        if (!this._catalogDisposed && version === (this._requestVersion || 0)) this.setData({loading: false});
      });
    },
    async filterChange(event) {
      const {field, value} = event.detail;
      if (!['categoryId', 'county', 'order'].includes(field)) return;
      this._filterVersion = (this._filterVersion || 0) + 1;
      let selected = value;
      if (field === 'order') {
        if (!['smart', 'distance', 'sale'].includes(value)) return;
        this._filterVersion = (this._filterVersion || 0) + 1;
        const filterVersion = this._filterVersion;
        if (value === 'distance') {
          const pos = await location();
          if (this._catalogDisposed || filterVersion !== this._filterVersion) return;
          if (!pos) { selected = 'smart'; wx.showToast({title: '未获取定位，已使用智能排序', icon: 'none'}); }
          else this.setData({location: pos});
        }
        this.setData({orderChosen: true});
      }
      this.setData({[field]: selected}); this.resetCatalog();
    },
    selectPrimary(event) {
      this._filterVersion = (this._filterVersion || 0) + 1;
      const id = String(event.currentTarget.dataset.id);
      const selected = this.data.categories.find(item => String(item.id) === id);
      if (!selected || id === this.data.primaryId) return;
      this.setData({primaryId: id, categoryId: '', categoryOptions: selected.children}); this.resetCatalog();
    },
    clearCatalogFilters() { this._filterVersion = (this._filterVersion || 0) + 1; this.setData({categoryId: '', county: '', order: 'smart', orderChosen: false}); this.resetCatalog(); },
    retryCatalog() {
      if (categoryPage && this.data.configError) return this.loadCatalogConfig();
      if (this.data.cityStatus !== 'ready' || !this.data.ready) return this.prepareCatalog();
      if (this.data.districtError) this.loadDistricts();
      return this.getGoodsList();
    },
    searchAddress() { this.setData({cityDialog: true}); },
    closeCity() { this.setData({cityDialog: false}); },
    noop() {},
    async selectCity(event) {
      this._filterVersion = (this._filterVersion || 0) + 1;
      const name = event.currentTarget.dataset.city;
      if (!this.data.cityChoices.some(item => item.city === name)) return;
      city.select(name);
      this._catalogVersion = (this._catalogVersion || 0) + 1;
      this._catalogInit = null;
      // 主动选择城市后已清空列表，同城重选也必须重新请求商品。
      this._catalogLoaded = false;
      this.setData({cityDialog: false, county: '', categoryId: '', ready: false});
      this.invalidateCatalog();
      await this.prepareCatalog();
      if (this.refreshCatalogFeed) this.refreshCatalogFeed();
    },
    selArea(event) {
      const name = event.currentTarget.dataset.city;
      if (!name) return;
      city.select(name); this.setData({showArea: 0, county: event.currentTarget.dataset.county || ''});
      this._catalogLoaded = false; this.prepareCatalog();
    },
    search() { this.resetCatalog(); },
    async searchCate(event) {
      if (!this.data.home_catalog_enable) {
        const named = this.data.categories.find(item => item.name === event.currentTarget.dataset.name);
        this.setData({categoryId: named ? String(named.id) : ''}); return this.resetCatalog();
      }
      const name = event.currentTarget.dataset.name;
      const selected = this.data.categories.find(item => item.name === name) || this.data.categories[0];
      wx.navigateTo({url: '/pages/goods/category' + (selected ? '?cate_id=' + selected.id : '')});
    },
    goHome() { app.switchTab('/pages/index/index'); },
    viewGoods(event) {
      const {type, id} = event.currentTarget.dataset;
      const path = type == 1 ? 'goods/index' : type == 2 ? 'product/info' : 'goods_group/info';
      wx.navigateTo({url: '/pages/' + path + '?scene=' + id + '_0'});
    },
    onReachBottom() { return this.getGoodsList(); },
    onUnload() { this._catalogDisposed = true; this._catalogVersion = (this._catalogVersion || 0) + 1; this._requestVersion = (this._requestVersion || 0) + 1; this._filterVersion = (this._filterVersion || 0) + 1; }
  };
}
function enhanceHome(definition, app) {
  // 未启用时保留原首页及旧协议，允许运营在旧供给可用期间补录分类。
  const legacy = require('./legacy-catalog');
  const legacyDefinition = legacy.enhance(Object.assign({}, definition, {data: Object.assign({}, definition.data)}), app, {url: 'goods/getListAll'});
  Object.assign(definition.data, initial);
  Object.assign(definition, controller(app, false), {
    searchAddress() {
      if (this.data.home_catalog_enable) this.setData({cityDialog: true});
      else { this.getArea(); this.setData({showArea: 1}); }
    },
    onLoad(options) {
      const userinfo = wx.getStorageSync('userinfo') || {id: 0};
      const scene = options.scene ? options.scene.split('_') : [];
      const userId = scene[0] || options.user_id || 0;
      const invite = scene[1] || options.invite || '';
      const now = new Date();
      this.setData({userinfo, user_id: userId, invite, date: (now.getMonth() + 1) + '/' + now.getDate()});
      if (userinfo.id > 0) {
        if (wx.onCopyUrl) wx.onCopyUrl(() => ({query: 'scene=' + userinfo.id + '_invite'}));
        if (Number(userId) > 0 && userId != userinfo.id && invite === 'invite' && userinfo.mobile === '') {
          app.bindPid(userId); app.util.showToast('您还未授权!');
          setTimeout(() => app.switchTab('/pages/switch/login?pid=' + userId), 1000);
        } else if (userinfo.img === 'https://m.kttkj.com/static/img/head.jpg' && this.checkAuth) this.checkAuth();
      }
      this.getFindSwiper(); this.prepareCatalog(); this.refreshCatalogFeed();
    },
    onShow() {
      this.prepareCatalog();
      this.setData({now_time: Math.floor(Date.now() / 1000), scene: app.globalData ? app.globalData.scene : ''});
      if ((wx.getStorageSync('userinfo') || {}).id > 0) this.getPayQueue();
    },
    refreshCatalogFeed() {
      const version = (this._feedVersion || 0) + 1; this._feedVersion = version;
      const name = this.data.city || (city.read() || {}).city || '';
      return request(app, 'goods/getItemList', {city: name}).then(data => {
        if (this._catalogDisposed || version !== this._feedVersion) return;
        const newList = normalizeGoods(data.new_list).map(item => Object.assign(item, {badge: '新'}));
        const offlineList = normalizeGoods(data.offline_list).map(item => Object.assign(item, {badge: this.leftDays(item.end_time) + '天'}));
        const hasCity = !!name && name === this.data.city;
        this.setData(Object.assign({home_catalog_enable: data.home_catalog_enable === true || data.home_catalog_enable === 1 || data.home_catalog_enable === '1',
          new_list: hasCity ? newList : [], offline_list: hasCity ? offlineList : [], top_goods: hasCity ? data.top_goods || null : null, show_follow: data.show_follow || 0, show_cate: data.show_cate},
          this.buildFeed(this.data.feed_tab, hasCity ? newList : [], hasCity ? offlineList : [])));
      }).catch(() => {});
    },
    getItemGoods() { return this.refreshCatalogFeed(); },
    onPullDownRefresh() { this._catalogLoaded = false; return Promise.all([this.prepareCatalog(), this.getFindSwiper(), this.refreshCatalogFeed()]).finally(() => wx.stopPullDownRefresh()); }
  });
  const modernDefinition = Object.assign({}, definition);
  const result = Object.assign({}, definition);
  const methods = new Set(Object.keys(modernDefinition).concat(Object.keys(legacyDefinition)));
  methods.forEach(name => {
    if (name === 'data' || typeof modernDefinition[name] !== 'function' && typeof legacyDefinition[name] !== 'function') return;
    result[name] = function(...args) {
      const selected = this._homeMode === 'legacy' ? legacyDefinition : modernDefinition;
      if (typeof selected[name] === 'function') return selected[name].apply(this, args);
    };
  });
  result.onLoad = async function(options) {
    const active = await protocol.featureEnabled(input => app.util.request(input));
    if (this._catalogDisposed || this._legacyDisposed) return;
    this._homeMode = active ? 'modern' : 'legacy';
    this.setData(Object.assign({}, active ? definition.data : legacyDefinition.data, {home_catalog_enable: active}));
    return (active ? modernDefinition.onLoad : legacyDefinition.onLoad).call(this, options);
  };
  result.onShow = function(...args) {
    if (!this._homeMode) return;
    return (this._homeMode === 'legacy' ? legacyDefinition.onShow : modernDefinition.onShow).apply(this, args);
  };
  result.onUnload = function(...args) {
    this._catalogDisposed = true;
    return (this._homeMode === 'legacy' ? legacyDefinition.onUnload : modernDefinition.onUnload).apply(this, args);
  };
  return result;
}
function category(app) {
  return Object.assign({data: Object.assign({app}, initial)}, controller(app, true), {
    async onLoad(options) {
      this._entryPrimary = options.cate_id || options.id || '';
      this._entryName = options.name || '';
      return this.loadCatalogConfig();
    },
    async loadCatalogConfig() {
      this.setData({configError: false, error: ''});
      try {
        const config = await request(app, 'goods/getItemList', {});
        const enabled = config.home_catalog_enable === true || config.home_catalog_enable === 1 || config.home_catalog_enable === '1';
        if (this._catalogDisposed) return;
        if (!enabled) { this.setData({disabled: true, error: '分类功能暂未开放，请返回首页'}); return; }
        this.setData({home_catalog_enable: true, disabled: false}); return this.prepareCatalog();
      } catch (error) { if (!this._catalogDisposed) this.setData({error: error.message, configError: true, disabled: false}); }
    },
    onShow() { if (this.data.home_catalog_enable) this.prepareCatalog(); },
    onPullDownRefresh() {
      this._catalogLoaded = false;
      const reload = this.data.home_catalog_enable ? this.prepareCatalog() : this.loadCatalogConfig();
      return reload.finally(() => wx.stopPullDownRefresh());
    }
  });
}
module.exports = {request, tree, location, normalizeGoods, enhanceHome, category};
