const app = getApp();
const mapUtil = require('../../utils/foodmap');
const cityUtil = require('../../utils/city');
const theme = require('../../utils/theme');
const tabbarData = require('../../utils/common/tabbar');

Page({
  data: {
    selected: 1, tabbarData, city: '', cities: [], cityStatus: '', cityMessage: '',
    popup: '', categories: [], counties: [], parentId: 0, children: [], cateId: 0, secondId: 0,
    categoryLabel: '全部类目', areaTab: 'distance', county: '', radius: 0, areaLabel: '距离 / 区域',
    radii: [0, 1, 2, 3, 5, 10], list: [], markers: [], includePoints: [], total: 0, page: 0,
    loading: false, error: '', done: false, filterError: '', selectedCard: null, selectedStore: 0, cardError: '', cardLoading: false,
    hasOrigin: false, originLabel: '', locationMessage: '开启定位可查看距离', locationBusy: false,
    mapReady: false, latitude: 0, longitude: 0, scale: 13, viewMessage: '',
    expanded: false, scrollTarget: '', keyword: '', searchResults: [], searchOpen: false, searchLoading: false, searchError: ''
  },
  onLoad() {
    this._epoch = 0; this._cardVersion = 0; this._searchVersion = 0; this._alive = true;
    this.syncOrigin();
    return this.initializeCity();
  },
  onShow() {
    if (!this._alive || this._initializing) return;
    const selected = cityUtil.read();
    if (selected && selected.city !== this.data.city) { this.initializeCity(); return; }
    const before = this._originSignature;
    this.syncOrigin();
    if (this.data.city && before !== this._originSignature) this.reload();
  },
  onUnload() { this._alive = false; this._epoch++; this._cardVersion++; this._searchVersion++; },
  async initializeCity() {
    this._initializing = true;
    const result = await cityUtil.initialize(option => app.util.request(option));
    this._initializing = false;
    if (!this._alive) return;
    const nextCity = result.selection ? result.selection.city : '';
    if (nextCity !== this.data.city) this.setData({categories: [], counties: [], county: '', parentId: 0, cateId: 0, secondId: 0,
      children: [], categoryLabel: '全部类目', areaLabel: this.data.radius ? this.data.radius + 'km' : '距离 / 区域'});
    this.setData({cityStatus: result.status, cities: result.cities, city: nextCity,
      cityMessage: result.status === 'error' ? result.message : result.status === 'unavailable' ? '当前城市暂无供给，可切换城市' :
        result.status === 'empty' ? '平台暂无可浏览的城市' : ''});
    this.reload();
  },
  retryCity() { this.initializeCity(); },
  openCities() { this.setData({popup: this.data.popup === 'city' ? '' : 'city'}); },
  selectCity(event) {
    const value = event.currentTarget.dataset.city;
    if (!this.data.cities.some(item => item.city === value)) return;
    cityUtil.select(value);
    this.setData({city: value, cityStatus: 'ready', cityMessage: '', popup: '', county: '', cateId: 0, secondId: 0,
      parentId: 0, children: [], categories: [], counties: [], categoryLabel: '全部类目', areaLabel: this.data.radius ? this.data.radius + 'km' : '距离 / 区域'});
    this.reload();
  },
  goHome() { app.switchTab('/pages/index/index'); },
  syncOrigin() {
    const origin = mapUtil.origin();
    this._origin = origin;
    this._originSignature = origin ? [origin.lat, origin.lng, origin.manual ? 1 : 0].join(',') : '';
    this.setData({hasOrigin: !!origin, originLabel: origin && origin.manual ? origin.name : '',
      locationMessage: origin ? (origin.manual ? '以所选地址计算距离' : '以当前位置计算距离') : '开启定位可查看距离'});
    if (!origin && this.data.radius) this.setData({radius: 0, areaLabel: this.data.county || '距离 / 区域'});
  },
  async enableLocation(reload) {
    if (this.data.locationBusy) return false;
    this.setData({locationBusy: true});
    try {
      await mapUtil.locate();
      if (!this._alive) return false;
      mapUtil.clearChosenOrigin(); this.syncOrigin(); if (reload !== false) this.reload();
      return true;
    } catch (error) {
      if (this._alive) {
        const hadRadius = !!this.data.radius;
        this.setData({locationMessage: error.message, radius: 0, areaLabel: this.data.county || '距离 / 区域'});
        if (hadRadius) this.reload();
      }
      return false;
    } finally { if (this._alive) this.setData({locationBusy: false}); }
  },
  chooseAddress() {
    this.closePopup();
    wx.chooseLocation({success: value => {
      if (!this._alive) return;
      if (!mapUtil.chooseOrigin(value)) { wx.showToast({title: '所选地址坐标无效', icon: 'none'}); return; }
      this.syncOrigin(); this.reload();
    }, fail: () => { if (this._alive) wx.showToast({title: '未选择地址，可继续按行政区浏览', icon: 'none'}); }});
  },
  params() {
    const data = {city: this.data.city, county: this.data.county, cate_ids: this.data.cateId || '',
      cate_second_ids: this.data.secondId || '', radius: this.data.radius};
    if (this._origin) Object.assign(data, {lat: this._origin.lat, lng: this._origin.lng});
    return data;
  },
  ensureOrigin() {
    const origin = mapUtil.origin();
    const signature = origin ? [origin.lat, origin.lng, origin.manual ? 1 : 0].join(',') : '';
    if (signature === this._originSignature) return true;
    this.syncOrigin();
    this.reload();
    return false;
  },
  reload() {
    this._epoch++; this._cardVersion++; this._searchVersion++;
    this.setData({list: [], markers: [], includePoints: [], total: 0, page: 0, done: false, loading: false,
      selectedCard: null, selectedStore: 0, cardError: '', cardLoading: false, error: '',
      searchResults: [], searchOpen: false, searchLoading: false, searchError: '', viewMessage: '', scrollTarget: ''});
    if (!this.data.city) { this.setData({categories: [], counties: [], done: true}); return; }
    this.loadFilters(); this.loadMore();
  },
  async loadFilters() {
    const epoch = this._epoch;
    this.setData({filterError: ''});
    try {
      const result = await mapUtil.request('foodmap/getFilters', {city: this.data.city});
      if (!this._alive || epoch !== this._epoch) return;
      const categories = Array.isArray(result.categories) ? result.categories : [];
      const parent = categories.find(item => Number(item.id) === Number(this.data.parentId));
      this.setData({categories, counties: Array.isArray(result.counties) ? result.counties : [], children: parent ? parent.children || [] : [], parentName: parent ? parent.name : ''});
    } catch (error) { if (this._alive && epoch === this._epoch) this.setData({filterError: error.message}); }
  },
  async loadMore() {
    if (!this.ensureOrigin()) return;
    if (!this.data.city || this.data.loading || this.data.done) return;
    const epoch = this._epoch, page = this.data.page + 1;
    this.setData({loading: true, error: ''});
    try {
      const result = await mapUtil.request('foodmap/getMarkers', Object.assign(this.params(), {page, limit: 10}));
      if (!this._alive || epoch !== this._epoch) return;
      if (!this.ensureOrigin()) return;
      const incoming = Array.isArray(result.list) ? result.list : [], list = this.data.list.slice();
      const seen = new Set(list.map(item => Number(item.store_id)));
      incoming.forEach(item => { if (!seen.has(Number(item.store_id))) { seen.add(Number(item.store_id)); list.push(mapUtil.card(item, !!this._origin)); } });
      const total = Math.max(0, Number(result.total) || 0);
      const patch = {list, total, page, loading: false, done: list.length >= total || !incoming.length || list.length === this.data.list.length};
      if (this.data.selectedCard && seen.has(Number(this.data.selectedCard.store_id))) patch.selectedCard = null;
      if (page === 1) Object.assign(patch, this.mapState(Array.isArray(result.markers) ? result.markers : []));
      this.setData(patch);
    } catch (error) { if (this._alive && epoch === this._epoch) this.setData({loading: false, error: error.message}); }
  },
  mapState(rows) {
    const seen = new Set();
    const stores = rows.filter(item => {
      const id = Number(item.store_id);
      if (!mapUtil.point(item) || !Number.isInteger(id) || id <= 0 || seen.has(id)) return false;
      seen.add(id); return true;
    });
    const markers = stores.map(item => ({id: Number(item.store_id), latitude: Number(item.lat), longitude: Number(item.lng),
      iconPath: '/img/foodmap-store.png', width: 32, height: 40,
      callout: {content: item.name, display: 'BYCLICK', color: theme.brandStrong, padding: 8, borderRadius: 6, bgColor: '#ffffff'}}));
    const points = markers.map(item => ({latitude: item.latitude, longitude: item.longitude}));
    const real = mapUtil.location();
    let outside = false;
    if (real && points.length) {
      const lats = points.map(item => item.latitude), lngs = points.map(item => item.longitude);
      const padLat = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * 0.1);
      const padLng = Math.max(0.02, (Math.max(...lngs) - Math.min(...lngs)) * 0.1);
      outside = real.lat < Math.min(...lats) - padLat || real.lat > Math.max(...lats) + padLat || real.lng < Math.min(...lngs) - padLng || real.lng > Math.max(...lngs) + padLng;
      if (!outside) markers.push({id: 0, latitude: real.lat, longitude: real.lng, iconPath: '/img/foodmap-location.png', width: 26, height: 32,
        callout: {content: '我的位置', display: 'ALWAYS', color: theme.brandStrong, padding: 5, bgColor: '#ffffff'}});
    }
    // 门店视野不能用于判定行政城市；没有逆地理服务时仅说明定位未纳入视野。
    const manual = this._origin && this._origin.manual ? this._origin : null;
    const center = manual ? {latitude: manual.lat, longitude: manual.lng} : points[0] ||
      (this.data.mapReady ? {latitude: this.data.latitude, longitude: this.data.longitude} : null) ||
      (real ? {latitude: real.lat, longitude: real.lng} : null);
    return {markers, includePoints: !manual && points.length > 1 ? points : [], mapReady: !!center,
      latitude: center ? center.latitude : 0, longitude: center ? center.longitude : 0,
      scale: points.length === 1 ? 15 : 13, viewMessage: outside ? '当前位置未纳入门店视野，距离仍按真实位置计算' : ''};
  },
  toggleCategory() { this.setData({popup: this.data.popup === 'category' ? '' : 'category'}); },
  toggleArea() { this.setData({popup: this.data.popup === 'area' ? '' : 'area'}); },
  closePopup() { this.setData({popup: ''}); },
  chooseParent(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!id) { this.applyCategory(0, 0, '全部类目'); return; }
    const item = this.data.categories.find(value => Number(value.id) === id);
    if (item) {
      this.setData({parentId: id, parentName: item.name, children: item.children || [], cateId: id, secondId: 0, categoryLabel: item.name});
      this.reload();
    }
  },
  chooseChild(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (id && !this.data.children.some(item => Number(item.id) === id)) return;
    this.applyCategory(this.data.parentId, id, id ? this.data.children.find(item => Number(item.id) === id).name : this.data.parentName);
  },
  applyCategory(parent, child, label) {
    this.setData({parentId: parent, cateId: parent, secondId: child, categoryLabel: label, popup: ''}); this.reload();
  },
  changeAreaTab(event) { this.setData({areaTab: event.currentTarget.dataset.tab}); },
  async chooseRadius(event) {
    const radius = Number(event.currentTarget.dataset.radius);
    if (!this.data.radii.includes(radius)) return;
    if (radius && !this._origin && !await this.enableLocation(false)) { this.closePopup(); return; }
    if (!this._alive) return;
    this.setData({radius, areaLabel: [radius ? radius + 'km' : '', this.data.county].filter(Boolean).join(' · ') || '距离 / 区域', popup: ''}); this.reload();
  },
  chooseCounty(event) {
    const county = event.currentTarget.dataset.county || '';
    this.setData({county, areaLabel: [this.data.radius ? this.data.radius + 'km' : '', county].filter(Boolean).join(' · ') || '距离 / 区域', popup: ''}); this.reload();
  },
  clearFilters() {
    this.setData({county: '', radius: 0, cateId: 0, secondId: 0, parentId: 0, children: [], categoryLabel: '全部类目', areaLabel: '距离 / 区域', popup: ''}); this.reload();
  },
  markerTap(event) { if (Number(event.markerId || event.detail && event.detail.markerId) > 0) this.selectStore(Number(event.markerId || event.detail.markerId)); },
  async selectStore(id) {
    if (!this.ensureOrigin()) return;
    const version = ++this._cardVersion, epoch = this._epoch;
    this.setData({selectedStore: id, selectedCard: null, cardError: '', cardLoading: false, expanded: true, searchOpen: false, scrollTarget: ''});
    const loaded = this.data.list.find(item => Number(item.store_id) === id);
    if (loaded) { this.setData({scrollTarget: 'store-' + id}); return; }
    this.setData({cardLoading: true});
    try {
      const value = await mapUtil.request('foodmap/getStoreCard', Object.assign(this.params(), {store_id: id}));
      if (!this._alive || version !== this._cardVersion || epoch !== this._epoch) return;
      if (!this.ensureOrigin()) return;
      const exists = value && Number(value.store_id) === id;
      if (!exists) {
        wx.showToast({title: '门店供给已变化，正在刷新', icon: 'none'});
        this.reload(); return;
      }
      // 请求期间普通分页也可能加载该店，此时只滚动真实列表，不重复展示。
      if (this.data.list.some(item => Number(item.store_id) === id)) this.setData({selectedCard: null, cardLoading: false, scrollTarget: 'store-' + id});
      else this.setData({selectedCard: exists ? mapUtil.card(value, !!this._origin) : null, cardLoading: false,
        cardError: exists ? '' : '该门店已不符合当前筛选，请刷新后查看', scrollTarget: 'selected-card'});
    } catch (error) { if (this._alive && version === this._cardVersion && epoch === this._epoch) this.setData({cardLoading: false, cardError: error.message}); }
  },
  retryCard() { if (this.data.selectedStore) this.selectStore(this.data.selectedStore); },
  inputKeyword(event) { this._searchVersion++; this.setData({keyword: event.detail.value.slice(0, 100), searchOpen: false, searchLoading: false}); },
  async search() {
    this.ensureOrigin();
    const keyword = this.data.keyword.trim();
    if (!this.data.city || !keyword) return;
    const version = ++this._searchVersion, epoch = this._epoch;
    this.setData({searchOpen: true, searchLoading: true, searchError: '', searchResults: [], popup: ''});
    try {
      const result = await mapUtil.request('foodmap/searchStore', Object.assign(this.params(), {keyword}));
      if (!this._alive || version !== this._searchVersion || epoch !== this._epoch) return;
      if (!this.ensureOrigin()) return;
      const rows = Array.isArray(result) ? result : [];
      this.setData({searchResults: rows, searchLoading: false});
      if (rows.length === 1) this.selectSearch({currentTarget: {dataset: {id: rows[0].store_id}}});
    } catch (error) { if (this._alive && version === this._searchVersion && epoch === this._epoch) this.setData({searchLoading: false, searchError: error.message}); }
  },
  closeSearch() { this._searchVersion++; this.setData({searchOpen: false, searchLoading: false}); },
  selectSearch(event) {
    const id = Number(event.currentTarget.dataset.id), value = this.data.searchResults.find(item => Number(item.store_id) === id);
    if (!value) return;
    const point = mapUtil.point(value);
    if (point) this.setData({latitude: point.lat, longitude: point.lng, includePoints: [], scale: 16});
    this.selectStore(id);
  },
  openShop(event) {
    const value = event.currentTarget.dataset.item;
    if (value && Number(value.shop_id) > 0 && Number(value.store_id) > 0) wx.navigateTo({url: '/pages/foodmap/shop?shop_id=' + Number(value.shop_id) + '&store_id=' + Number(value.store_id)});
  },
  togglePanel() { this.setData({expanded: !this.data.expanded}); },
  panelStart(event) { this._touchY = event.touches[0].clientY; },
  panelEnd(event) {
    const change = event.changedTouches[0].clientY - this._touchY;
    if (Math.abs(change) > 35) this.setData({expanded: change < 0});
  },
  switchTab(event) { app.switchTab(event, this.data.selected); },
  onShareAppMessage() { return {title: '吃喝玩乐地图', path: '/pages/foodmap/index'}; }
});
