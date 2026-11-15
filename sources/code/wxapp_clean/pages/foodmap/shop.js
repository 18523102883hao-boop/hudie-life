const mapUtil = require('../../utils/foodmap');

Page({
  data: {shopId: 0, shop: {}, stores: [], store: null, packages: [], loading: false, error: '',
    distance: '', distanceLabel: '距你', hasConsume: false, cover: '', imgs: [], license: '', expiredMessage: ''},
  onLoad(options) {
    this._alive = true; this._version = 0;
    this._requestedStore = Number(options.store_id) || 0;
    const shopId = Number(options.shop_id);
    if (!Number.isInteger(shopId) || shopId <= 0) { this.setData({error: '商家参数无效'}); return; }
    this.setData({shopId}); return this.load();
  },
  onShow() { if (this._alive) { this.updateDistance(); this.startCountdown(); } },
  onHide() { this.stopCountdown(); },
  onUnload() { this._alive = false; this._version++; this.stopCountdown(); },
  async load() {
    if (!this.data.shopId) return;
    const version = ++this._version;
    this.setData({loading: true, error: '', packages: [], store: null, distance: '', stores: []});
    try {
      const result = await Promise.all([mapUtil.request('shop/getInfo', {shop_id: this.data.shopId}),
        mapUtil.request('shop/getStores', {shop_id: this.data.shopId})]);
      if (!this._alive || version !== this._version) return;
      const shop = result[0] || {};
      // 以本商家公开门店接口重新校验来源，不信任上一页对象或分享参数。
      const stores = (Array.isArray(result[1]) ? result[1] : []).filter(item => Number(item.store_id) > 0 &&
        (!item.shop_id || Number(item.shop_id) === this.data.shopId)).sort((a, b) => Number(a.store_id) - Number(b.store_id));
      const store = stores.find(item => Number(item.store_id) === this._requestedStore) || stores[0] || null;
      const imgs = Array.isArray(shop.imgs) ? shop.imgs.filter(item => typeof item === 'string' && item) : [];
      const consume = shop.per_consume;
      this.setData({shop, stores, store, imgs, license: typeof shop.license === 'string' ? shop.license : '',
        cover: shop.img || imgs[0] || '', hasConsume: consume !== null && consume !== undefined && consume !== '' &&
          Number.isFinite(Number(consume)) && Number(consume) >= 0,
        consumeText: mapUtil.money(consume)});
      this.updateDistance();
      // 来源门店只决定地址、距离和导航，商家首页展示全部门店的在售套餐。
      const packages = await mapUtil.request('shop/getPackages', {shop_id: this.data.shopId});
      if (!this._alive || version !== this._version) return;
      const rows = (Array.isArray(packages) ? packages : []).map(item => mapUtil.card(item, false));
      this.setData({packages: rows, loading: false, cover: this.data.cover || (rows[0] && rows[0].img) || ''});
      this.refreshCountdown(); this.startCountdown();
    } catch (error) { if (this._alive && version === this._version) this.setData({loading: false, error: error.message}); }
  },
  updateDistance() {
    const origin = mapUtil.origin(), meters = mapUtil.distance(origin, this.data.store);
    this.setData({distance: origin && meters !== null ? mapUtil.distanceText(meters) : '',
      distanceLabel: origin && origin.manual ? '距所选地址' : '距你'});
  },
  refreshCountdown() {
    if (!this._alive) return;
    this.setData({packages: this.data.packages.map(item => Object.assign({}, item, {countdown: mapUtil.remaining(item.end_time),
      expired: Number(item.end_time) * 1000 <= Date.now()}))});
  },
  startCountdown() {
    this.stopCountdown();
    if (this.data.packages.length) this._timer = setInterval(() => this.refreshCountdown(), 1000);
  },
  stopCountdown() { if (this._timer) clearInterval(this._timer); this._timer = null; },
  openStores() { wx.navigateTo({url: '/pages/foodmap/stores?shop_id=' + this.data.shopId}); },
  navigate() { mapUtil.navigate(this.data.store); },
  phone() { mapUtil.phone(this.data.store && this.data.store.mobile || this.data.shop.mobile); },
  previewLicense() { if (this.data.license) wx.previewImage({current: this.data.license, urls: [this.data.license]}); },
  previewImage(event) {
    const current = event.currentTarget.dataset.src;
    if (current && this.data.imgs.length) wx.previewImage({current, urls: this.data.imgs});
  },
  buy(event) {
    const item = event.currentTarget.dataset.item;
    if (!item || Number(item.end_time) * 1000 <= Date.now()) { wx.showToast({title: '套餐已结束，请刷新', icon: 'none'}); return; }
    if (!mapUtil.detail(item)) wx.showToast({title: '套餐信息无效，请刷新', icon: 'none'});
  },
  onShareAppMessage() {
    return {title: this.data.shop.name || '商家首页', path: '/pages/foodmap/shop?shop_id=' + this.data.shopId +
      (this.data.store ? '&store_id=' + Number(this.data.store.store_id) : '')};
  }
});
