const mapUtil = require('../../utils/foodmap');

Page({
  data: {shopId: 0, stores: [], loading: false, error: ''},
  onLoad(options) {
    this._alive = true; this._version = 0;
    const id = Number(options.shop_id);
    if (!Number.isInteger(id) || id <= 0) { this.setData({error: '商家参数无效'}); return; }
    this.setData({shopId: id}); return this.load();
  },
  onUnload() { this._alive = false; this._version++; },
  async load() {
    if (!this.data.shopId) return;
    const version = ++this._version;
    this.setData({loading: true, error: ''});
    try {
      const result = await mapUtil.request('shop/getStores', {shop_id: this.data.shopId});
      if (!this._alive || version !== this._version) return;
      const origin = mapUtil.origin();
      const stores = (Array.isArray(result) ? result : []).filter(item => Number(item.store_id) > 0 &&
        (!item.shop_id || Number(item.shop_id) === this.data.shopId)).sort((a, b) => Number(a.store_id) - Number(b.store_id)).map(item => {
        const meters = mapUtil.distance(origin, item);
        return Object.assign({}, item, {validPoint: !!mapUtil.point(item), distanceText: origin && meters !== null ? mapUtil.distanceText(meters) : '',
          distanceLabel: origin && origin.manual ? '距所选地址' : '距你'});
      });
      this.setData({stores, loading: false});
    } catch (error) { if (this._alive && version === this._version) this.setData({loading: false, error: error.message}); }
  },
  navigate(event) { mapUtil.navigate(event.currentTarget.dataset.item); },
  phone(event) { mapUtil.phone(event.currentTarget.dataset.phone); },
  openShop(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (id > 0) wx.navigateTo({url: '/pages/foodmap/shop?shop_id=' + this.data.shopId + '&store_id=' + id});
  },
  onShareAppMessage() { return {title: '商家所有门店', path: '/pages/foodmap/stores?shop_id=' + this.data.shopId}; }
});
