// 全部商品列表经同一出口传递城市及分类 ID，保留各榜单自身排序。
const city = require('./city');
const LIST = /^(goods|product|goods_group)\/(getListAll|getList|getListMini|getTopList|getNewList|getOfflineList|getListCut)$/;
const PUBLIC = /^(index\/getCate|(goods|product|goods_group)\/(getCities|getDistricts|getArea|getItemList|getListAll|getList|getListMini|getTopList|getNewList|getOfflineList|getInfo|getGoodsSpec))$/;
let enabled = null;
let flagPending = null;
function setEnabled(value) { enabled = value === true || value === 1 || value === '1'; }
function enabledState() { return enabled === true; }
function featureEnabled(request) {
  if (enabled !== null) return Promise.resolve(enabled);
  if (flagPending) return flagPending;
  flagPending = new Promise(resolve => request({url: 'goods/getItemList', method: 'post', noCache: true, publicBrowse: true,
    _catalogPrepared: true, data: {contract_version: 2},
    success(res) { if (res.data && res.data.code == 0) {setEnabled((res.data.data || {}).home_catalog_enable); resolve(enabled);} else resolve(false); },
    fail() {resolve(false);}
  })).finally(() => {flagPending = null;});
  return flagPending;
}
function path(url) { return String(url || '').replace(/^https?:\/\/[^/]+\//, '').replace(/^api\//, '').split('?')[0]; }
function isList(url) { return LIST.test(path(url)); }
function isScoped(url) { return isList(url) || /^(goods|product|goods_group)\/getItemList$/.test(path(url)) || path(url) === 'index/getCate'; }
function noCache(url) { return PUBLIC.test(path(url)) || isList(url); }
function publicBrowse(url) { return PUBLIC.test(path(url)); }
async function prepare(option, request) {
  const active = await featureEnabled(request);
  if (!active) return Object.assign({}, option, {noCache: true, _catalogPrepared: true});
  const params = Object.assign({}, option.data || {});
  if (path(option.url) === 'index/getCate') return Object.assign({}, option, {data: Object.assign(params, {contract_version: 2}), noCache: true, _catalogPrepared: true});
  const selectedCity = city.read();
  const cityReady = selectedCity ? Promise.resolve({status: 'ready', selection: selectedCity}) : city.initialize(request);
  return cityReady.then(async result => {
    if (!result.selection || result.status === 'error') throw new Error(result.message || '暂无可用城市，请返回首页选择城市');
    params.city = result.selection.city;
    params.contract_version = 2;
    delete params.province;
    const legacy = String(params.cate || '').trim();
    if (legacy && !['全部', '全部类目'].includes(legacy) && !params.cate_ids) {
      const tree = await new Promise((resolve, reject) => request({url: 'index/getCate', method: 'post',
        data: {contract_version: 2}, noCache: true, publicBrowse: true,
        success(res) { res.data && res.data.code == 0 ? resolve(res.data.data) : reject(new Error('分类加载失败，请重试')); },
        fail() { reject(new Error('分类加载失败，请重试')); }
      }));
      const names = legacy.split(',').map(value => value.trim()).filter(Boolean);
      const numeric = names.length > 0 && names.every(value => /^[1-9]\d*$/.test(value));
      const ids = names.map(name => (tree || []).filter(item => numeric ? String(item.id) === name : item.name === name));
      if (ids.some(matches => matches.length !== 1)) throw new Error('该分类暂不可用，请返回首页选择分类');
      params.cate_ids = ids.map(matches => String(matches[0].id)).join(',');
    }
    delete params.cate;
    if (path(option.url) === 'goods/getListAll') params.order = ['smart', 'distance', 'sale'].includes(params.order) ? params.order : 'smart';
    return Object.assign({}, option, {data: params, noCache: true, _catalogPrepared: true});
  });
}
module.exports = {path, isList, isScoped, noCache, publicBrowse, prepare, featureEnabled, setEnabled, enabledState};
