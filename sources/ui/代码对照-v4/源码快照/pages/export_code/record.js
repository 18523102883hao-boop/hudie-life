const app = getApp();

// 三态文案兜底（正常由服务端 status_text 下发，前端不自行推导）
const STATUS_TEXT = {
  unused: '未使用',
  used: '已使用',
  voided: '已作废'
};

/**
 * 导出兑换码记录页（子 PRD §6.1.6 / EC-28 ~ EC-30）
 *
 * 口径：
 *  - 只显示本人记录：`exporter_user_id` 由服务端按登录态取，前端**不传** user_id；
 *  - 三态（未使用 / 已使用 / 已作废）由服务端联查 `re_exchange_code.status` 后下发，
 *    前端只渲染 `status` / `status_text`，**禁止用 is_used 推导三态**（OQ-12 / R-12）；
 *  - 点击卡片复制兑换码，复制成功后调 `exportCode/copyRecord` 由**后端原子自增**
 *    `copy_count`，前端只用返回值刷新，**不做本地累加**。
 */
Page({
  data: {
    app: app,
    list: [],
    page: 1,
    limit: 20,
    total: 0,
    loading: 0,
    is_end: 1,
    status: '',
    productId: 0,
    statusTabs: [
      { key: '', text: '全部' },
      { key: 'unused', text: '未使用' },
      { key: 'used', text: '已使用' },
      { key: 'voided', text: '已作废' }
    ]
  },

  onLoad(options) {
    const productId = parseInt(options && options.product_id) || 0;
    this.setData({ productId: productId });
    this.loadList(1);
  },

  back() {
    app.back();
  },

  /**
   * 拉取记录列表
   * @param {number} page
   */
  loadList(page) {
    const t = this;
    if (t.data.loading) {
      return;
    }
    t.setData({ loading: 1 });

    const params = {
      page: page,
      limit: t.data.limit,
      status: t.data.status
    };
    if (t.data.productId) {
      params.product_id = t.data.productId;
    }

    app.util.request({
      url: 'exportCode/recordList',
      method: 'post',
      data: params,
      success(res) {
        const d = res.data || {};
        if (d.code != 0) {
          t.setData({ loading: 0 });
          app.util.showToast(d.msg || '加载失败');
          return;
        }
        const list = (d.data || []).map(function (v) {
          const status = v.status || '';
          return {
            id: v.id,
            code: v.code || '',
            product_id: v.product_id,
            product_title: v.product_title || '',
            product_img: v.product_img || '',
            export_price: parseInt(v.export_price) || 0,
            exportPriceText: app.util.setPrice(parseInt(v.export_price) || 0),
            status: status,
            statusText: v.status_text || STATUS_TEXT[status] || '状态异常',
            can_void: parseInt(v.can_void) === 1 ? 1 : 0,
            void_reason: v.void_reason || '',
            created_time: v.created_time || '',
            used_time: v.used_time || '',
            void_time: v.void_time || '',
            copy_count: parseInt(v.copy_count) || 0
          };
        });
        t.setData({
          list: page === 1 ? list : t.data.list.concat(list),
          page: page,
          total: parseInt(d.count) || 0,
          is_end: list.length < t.data.limit ? 1 : 0,
          loading: 0
        });
      },
      fail() {
        t.setData({ loading: 0 });
        app.util.showToast('网络异常');
      }
    });
  },

  /** 状态筛选（全部 / 未使用 / 已使用 / 已作废） */
  switchStatus(e) {
    const key = e.currentTarget.dataset.key || '';
    if (key === this.data.status) {
      return;
    }
    this.setData({ status: key, list: [], page: 1, is_end: 0 });
    this.loadList(1);
  },

  /** 清除「按商品筛选」（从商品列表「查看记录」跳入时带 product_id） */
  clearProduct() {
    this.setData({ productId: 0, list: [], page: 1, is_end: 0 });
    this.loadList(1);
  },

  /**
   * 复制兑换码 + 后端原子自增复制次数
   * 复制失败（用户取消）不计次；计数一律用接口返回值刷新
   */
  copyCode(e) {
    const index = parseInt(e.currentTarget.dataset.index) || 0;
    const item = this.data.list[index];
    if (!item || !item.code) {
      return;
    }

    const t = this;
    wx.setClipboardData({
      data: item.code,
      success() {
        app.util.request({
          url: 'exportCode/copyRecord',
          method: 'post',
          data: { id: item.id },
          success(res) {
            const d = res.data || {};
            if (d.code != 0) {
              return;
            }
            const data = d.data || {};
            t.setData({ ['list[' + index + '].copy_count']: parseInt(data.copy_count) || 0 });
          }
        });
      }
    });
  },

  /** 作废入口（仅 unused 可见，具体流程在 void 页 K1-7） */
  toVoid(e) {
    const index = parseInt(e.currentTarget.dataset.index) || 0;
    const item = this.data.list[index];
    if (!item || !item.can_void) {
      return;
    }
    wx.navigateTo({ url: '/pages/export_code/void?code=' + item.code });
  },

  /**
   * 重新拉取第一页（作废页成功后回调，保证状态 / 余额即时一致）
   */
  reloadList() {
    this.setData({ list: [], page: 1, is_end: 0 });
    this.loadList(1);
  },

  onReachBottom() {
    if (this.data.is_end || this.data.loading) {
      return;
    }
    this.loadList(this.data.page + 1);
  },

  loadMore() {
    if (this.data.is_end || this.data.loading) {
      return;
    }
    this.loadList(this.data.page + 1);
  },

  onPullDownRefresh() {
    this.loadList(1);
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 600);
  }
});
