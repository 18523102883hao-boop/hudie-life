const app = getApp();
const { money } = require("../../utils/mine.js");
Page({
  data: {
    app,
    list: [],
    limit: 20,
    page: 1,
    loading: 0,
    is_end: 0,
    exchanged: false,
    category: "subsidy",
    category_total: "0.00",
    total: "0.00",
    error: "",
  },
  onLoad(options) {
    this.setData({ exchanged: !!(options && options.source === "exchanged") });
    app.util.checkLogin(() => this.reset());
  },
  reset() {
    // 两分类和下拉刷新共用版本号，防止慢响应混入新列表。
    this._generation = (this._generation || 0) + 1;
    this.setData({
      list: [],
      page: 1,
      loading: 0,
      is_end: 0,
      error: "",
      category_total: "0.00",
      total: "0.00",
    });
    this.getPage();
  },
  changeCategory(e) {
    const category = e.currentTarget.dataset.category;
    if (
      ["subsidy", "withdraw"].indexOf(category) < 0 ||
      category === this.data.category
    )
      return;
    this.setData({ category });
    this.reset();
  },
  getPage() {
    if (this.data.loading || this.data.is_end) return;
    const generation = this._generation,
      page = this.data.page,
      category = this.data.category;
    this.setData({ loading: 1, error: "" });
    const data = { page, limit: this.data.limit };
    if (this.data.exchanged) data.category = category;
    app.util.request({
      url: this.data.exchanged ? "user/exchangedDetails" : "withdraw/getList",
      method: "post",
      data,
      success: (res) => {
        if (generation !== this._generation) return;
        if (res.data.code != 0) {
          this.setData({ error: res.data.msg || "加载失败，请重试" });
          return;
        }
        const list = (Array.isArray(res.data.data) ? res.data.data : []).map(
          (item) =>
            Object.assign({}, item, {
              display_amount: this.data.exchanged
                ? money(item.amount)
                : app.util.setPrice(item.amount),
            }),
        );
        const next = {
          list: this.data.list.concat(list),
          page: page + 1,
          is_end: list.length < this.data.limit ? 1 : 0,
        };
        if (this.data.exchanged) {
          const ext = res.data.extend || {};
          next.category_total = money(ext.category_total);
          next.total = money(ext.total);
        }
        this.setData(next);
      },
      fail: () => {
        if (generation === this._generation)
          this.setData({ error: "加载失败，请重试" });
      },
      complete: () => {
        if (generation === this._generation) {
          this.setData({ loading: 0 });
          wx.stopPullDownRefresh();
        }
      },
    });
  },
  viewOrder(e) {
    const item = e.currentTarget.dataset.item;
    if (!item.order_id) return;
    const type = Number(item.order_type);
    const target =
      type === 1
        ? "order"
        : type === 2 || type === 4
          ? "order_seckill"
          : "order_group";
    app.switchTab("/pages/" + target + "/info?id=" + item.order_id);
  },
  onClickLeft() {
    wx.navigateBack();
  },
  onPullDownRefresh() {
    this.reset();
  },
  onReachBottom() {
    this.getPage();
  },
  onUnload() {
    this._generation = (this._generation || 0) + 1;
  },
});
