const app = getApp();
function statusOf(value) {
  return ["0", "1", "2", "3", "21"].indexOf(String(value)) >= 0
    ? Number(value)
    : 0;
}
Page({
  data: { app, index: 0, list: [], limit: 10, page: 1, loading: 0, is_end: 0 },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  viewOrder(e) {
    const item = e.currentTarget.dataset.item;
    const target =
      item.type == 1
        ? "order"
        : item.type == 2 || item.type == 4
          ? "order_seckill"
          : "order_group";
    app.switchTab("/pages/" + target + "/info?id=" + item.order_id);
  },
  selIndex(e) {
    const index = statusOf(e.currentTarget.dataset.index);
    if (index === this.data.index) return;
    this.setData({ index });
    this.resetList();
  },
  onLoad(options) {
    this.setData({ index: statusOf(options && options.status) });
    app.util.checkLogin(() => {
      this.setData({ userinfo: wx.getStorageSync("userinfo") });
      this.resetList();
    });
  },
  resetList() {
    // 切换与刷新立即使旧分页请求失效，不等待旧请求结束。
    this._generation = (this._generation || 0) + 1;
    this.setData({ list: [], page: 1, is_end: 0, loading: 0 });
    this.getOrderList();
  },
  getOrderList() {
    if (this.data.loading || this.data.is_end) return;
    const generation = this._generation,
      status = this.data.index,
      page = this.data.page;
    this.setData({ loading: 1 });
    app.util.request({
      url: "order_common/getList",
      method: "post",
      data: { page, limit: this.data.limit, status },
      success: (res) => {
        if (generation !== this._generation || status !== this.data.index)
          return;
        if (res.data.code != 0) {
          app.util.showToast("加载失败，请重试");
          return;
        }
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        list.forEach((item) => {
          if (item.order)
            item.order.amount = (Number(item.order.amount || 0) / 100).toFixed(
              2,
            );
        });
        this.setData({
          list: this.data.list.concat(list),
          page: page + 1,
          is_end: list.length < this.data.limit ? 1 : 0,
        });
      },
      fail: () => {
        if (generation === this._generation)
          app.util.showToast("加载失败，请重试");
      },
      complete: () => {
        if (generation === this._generation) {
          this.setData({ loading: 0 });
          wx.stopPullDownRefresh();
        }
      },
    });
  },
  onUnload() {
    this._generation = (this._generation || 0) + 1;
  },
  onPullDownRefresh() {
    this.resetList();
  },
  onReachBottom() {
    this.getOrderList();
  },
});
