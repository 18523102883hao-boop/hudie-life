const app = getApp();

// 流水类型文案（OQ-11 收敛为四类）
const LOG_TYPE_TEXT = {
  recharge: '充值',
  export_pay: '导出扣款',
  void_refund: '作废返还',
  admin_adjust: '后台调整'
};

// 老接口未返回配置时保守使用默认值，实际限额取服务端生效配置。
const DEFAULT_SINGLE_EXPORT_LIMIT = 100;

/**
 * 达人导出工作台（P-1：本页 = 子 PRD §6.1.4 上半 + §6.1.5 下半的同一页面）
 *
 * K1-0：骨架 / 余额区（真数据）/ 余额明细弹层 / 个人中心入口与页面注册。
 * K1-4：充值业务块在 `recharge` 子页。
 * K1-5：商品列表 + 批量导出（本页 goodsList / 导出弹层）。
 * K1-6 / K1-7：导出记录 / 作废为子页。
 *
 * 鉴权：`exportCode/balance` 只要求登录（未授权返回 authorized=0），本页据此决定是否可停留；
 * 真正涉及资金的接口（recharge / export / void / balanceLog / goodsList）都会在服务端再次校验授权。
 * 金额口径：接口一律「分」，展示时用 app.util.setPrice() 转元。
 */
Page({
  data: {
    app: app,
    inited: 0,
    authorized: 0,
    enable: 0,
    balance: 0,
    balanceText: '0',
    singleExportLimit: DEFAULT_SINGLE_EXPORT_LIMIT,
    // 余额明细弹层
    showLog: false,
    logList: [],
    logPage: 1,
    logLimit: 20,
    logCount: 0,
    logLoading: 0,
    logEnd: 0,
    // 商品列表（K1-5）
    keyword: '',
    goodsList: [],
    goodsPage: 1,
    goodsLimit: 10,
    goodsCount: 0,
    goodsLoading: 0,
    goodsEnd: 0,
    // 导出弹层（K1-5）
    showExport: false,
    exportLoading: 0,
    exportItem: null,
    exportQty: 1,
    exportAmount: 0,
    exportAmountText: '0',
    exportQtyMax: 0,
    exportEnough: 1
  },

  onLoad() {
    this.getBalance();
  },

  onShow() {
    // 从充值 / 记录 / 作废子页返回时刷新余额与列表（已导出数可能变化）
    if (this.data.inited) {
      this.getBalance();
      this.loadGoods(1, true);
    }
  },

  back() {
    app.back();
  },

  /**
   * 余额 + 授权态 + 灰度开关
   * 未授权 / 未开放一律退出本页（入口侧已隐藏，此处防直接路径访问）
   */
  getBalance() {
    const t = this;
    app.util.request({
      url: 'exportCode/balance',
      method: 'post',
      data: { a: 1 },
      success(res) {
        const d = res.data || {};
        if (d.code != 0) {
          app.util.showToast(d.msg || '加载失败');
          return;
        }
        const info = d.data || {};
        if (!info.enable) {
          t.leave('功能暂未开放');
          return;
        }
        if (!info.authorized) {
          t.leave('未开通导码权限');
          return;
        }
        const balance = parseInt(info.balance) || 0;
        const first = !t.data.inited;
        t.setData({
          inited: 1,
          enable: 1,
          authorized: 1,
          balance: balance,
          balanceText: app.util.setPrice(balance),
          singleExportLimit: parseInt(info.single_export_limit) > 0
            ? parseInt(info.single_export_limit) : DEFAULT_SINGLE_EXPORT_LIMIT
        });
        if (first) {
          t.loadGoods(1, true);
        }
      },
      fail() {
        app.util.showToast('网络异常');
      }
    });
  },

  leave(msg) {
    app.util.showToast(msg);
    setTimeout(function () {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.redirectTo({ url: '/pages/mine/mine' });
      }
    }, 1000);
  },

  toRecharge() {
    wx.navigateTo({ url: '/pages/export_code/recharge' });
  },

  toRecord() {
    wx.navigateTo({ url: '/pages/export_code/record' });
  },

  toRecordByProduct(e) {
    const pid = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/export_code/record?product_id=' + pid });
  },

  toVoid() {
    wx.navigateTo({ url: '/pages/export_code/void' });
  },

  /* ------------------------------ 商品列表（K1-5） ------------------------------ */

  /**
   * 商品列表：只取 can_export=1（服务端过滤），按销量倒序，分页加载
   * @param {number} page
   * @param {boolean} reset 是否重置列表（搜索 / 下拉刷新）
   */
  loadGoods(page, reset) {
    const t = this;
    if (t.data.goodsLoading) {
      return;
    }
    t.setData({ goodsLoading: 1 });

    app.util.request({
      url: 'exportCode/goodsList',
      method: 'post',
      data: {
        page: page,
        limit: t.data.goodsLimit,
        keyword: t.data.keyword
      },
      success(res) {
        const d = res.data || {};
        if (d.code != 0) {
          t.setData({ goodsLoading: 0 });
          app.util.showToast(d.msg || '加载失败');
          return;
        }
        const list = (d.data || []).map(function (v) {
          const exportPrice = parseInt(v.export_price) || 0;
          return {
            id: v.id,
            title: v.title || '',
            img: v.img || '',
            shop_name: v.shop_name || '',
            price: parseInt(v.price) || 0,
            priceText: app.util.setPrice(parseInt(v.price) || 0),
            export_price: exportPrice,
            exportPriceText: app.util.setPrice(exportPrice),
            sale_num: parseInt(v.sale_num) || 0,
            exported: parseInt(v.exported) || 0,
            used: parseInt(v.used) || 0,
            can_export_now: parseInt(v.can_export_now) === 0 ? 0 : 1,
            unavailable_reason: v.unavailable_reason || ''
          };
        });
        const pageList = reset ? list : t.data.goodsList.concat(list);
        t.setData({
          goodsList: pageList,
          goodsPage: page,
          goodsCount: parseInt(d.count) || 0,
          goodsEnd: list.length < t.data.goodsLimit ? 1 : 0,
          goodsLoading: 0
        });
      },
      fail() {
        t.setData({ goodsLoading: 0 });
        app.util.showToast('网络异常');
      }
    });
  },

  onReachBottom() {
    if (!this.data.inited || this.data.goodsEnd || this.data.goodsLoading) {
      return;
    }
    this.loadGoods(this.data.goodsPage + 1, false);
  },

  /** 列表底部「加载更多」（触底之外的手动兜底，兼容无滚动页面的场景） */
  loadMoreGoods() {
    if (this.data.goodsEnd || this.data.goodsLoading) {
      return;
    }
    this.loadGoods(this.data.goodsPage + 1, false);
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onKeywordConfirm() {
    this.loadGoods(1, true);
  },

  clearKeyword() {
    this.setData({ keyword: '' });
    this.loadGoods(1, true);
  },

  /* ------------------------------ 导出弹层（K1-5） ------------------------------ */

  openExport(e) {
    const index = parseInt(e.currentTarget.dataset.index) || 0;
    const item = this.data.goodsList[index];
    if (!item || item.can_export_now !== 1) {
      app.util.showToast(item && item.unavailable_reason ? item.unavailable_reason : '该商品暂不可导出');
      return;
    }
    if (item.export_price <= 0) {
      app.util.showToast('该商品未配置导码价');
      return;
    }
    // 可用数量上限：余额可承受个数与单笔上限取小
    const canBuy = Math.floor(this.data.balance / item.export_price);
    const qtyMax = Math.min(canBuy, this.data.singleExportLimit,
      Math.floor(2147483647 / item.export_price));
    this.setData({
      showExport: true,
      exportItem: item,
      exportQty: 1,
      exportQtyMax: qtyMax,
      exportEnough: canBuy > 0 ? 1 : 0
    });
    this.calcExportAmount(1);
  },

  closeExport() {
    this.setData({ showExport: false, exportLoading: 0 });
  },

  maskTap() {
    if (this.data.exportLoading) {
      return;
    }
    this.closeExport();
  },

  calcExportAmount(qty) {
    const item = this.data.exportItem;
    if (!item) {
      return;
    }
    const amount = qty * item.export_price;
    this.setData({
      exportQty: qty,
      exportAmount: amount,
      exportAmountText: app.util.setPrice(amount),
      exportEnough: amount <= this.data.balance ? 1 : 0
    });
  },

  onQtyInput(e) {
    let qty = parseInt(e.detail.value) || 0;
    const max = this.data.exportQtyMax || 0;
    if (qty > max) {
      qty = max;
      app.util.showToast(max > 0 ? '最多可导出 ' + max + ' 个' : '余额不足');
    }
    if (qty < 1) {
      qty = 1;
    }
    this.calcExportAmount(qty);
    return String(qty);
  },

  qtyMinus() {
    if (this.data.exportQty <= 1) {
      return;
    }
    this.calcExportAmount(this.data.exportQty - 1);
  },

  qtyPlus() {
    const max = this.data.exportQtyMax || 0;
    if (this.data.exportQty >= max) {
      app.util.showToast('最多可导出 ' + max + ' 个');
      return;
    }
    this.calcExportAmount(this.data.exportQty + 1);
  },

  /**
   * 确认导出：金额由服务端按商品实时导码价重算，前端算的金额仅用于展示
   * 成功 → 跳导出记录页（PRD「导出后跳转导出记录页」）
   */
  doExport() {
    const t = this;
    if (t.data.exportLoading) {
      return;
    }
    const item = t.data.exportItem;
    if (!item) {
      return;
    }
    if (!t.data.exportQty || t.data.exportQty < 1) {
      app.util.showToast('请输入导出数量');
      return;
    }
    if (t.data.exportAmount > t.data.balance) {
      app.util.showToast('导码余额不足，请先充值');
      return;
    }

    t.setData({ exportLoading: 1 });
    app.util.request({
      url: 'exportCode/export',
      method: 'post',
      data: {
        product_id: item.id,
        qty: t.data.exportQty,
        // P-3：仅作追溯 / 审计（服务端不据此做幂等），每次点击生成新的标识
        request_id: 'EX' + Date.now() + Math.floor(Math.random() * 1000)
      },
      success(res) {
        const d = res.data || {};
        if (d.code != 0) {
          t.setData({ exportLoading: 0 });
          app.util.showToast(d.msg || '导出失败');
          return;
        }
        const r = d.data || {};
        t.setData({
          showExport: false,
          exportLoading: 0,
          balance: parseInt(r.balance_after) || 0,
          balanceText: app.util.setPrice(parseInt(r.balance_after) || 0)
        });
        app.util.showToast('导出成功');
        setTimeout(function () {
          wx.navigateTo({ url: '/pages/export_code/record?product_id=' + item.id });
        }, 600);
      },
      fail() {
        t.setData({ exportLoading: 0 });
        app.util.showToast('网络异常');
      }
    });
  },

  /* ------------------------------ 余额明细 ------------------------------ */

  openLog() {
    this.setData({ showLog: true, logList: [], logPage: 1, logCount: 0, logEnd: 0 });
    this.getLogList(1);
  },

  closeLog() {
    this.setData({ showLog: false });
  },

  /**
   * 余额明细（服务端按登录态过滤 user_id，前端不传、也不可传他人 id）
   */
  getLogList(page) {
    const t = this;
    if (t.data.logLoading) {
      return;
    }
    t.setData({ logLoading: 1 });
    app.util.request({
      url: 'exportCode/balanceLog',
      method: 'post',
      data: { page: page, limit: t.data.logLimit },
      success(res) {
        const d = res.data || {};
        t.setData({ logLoading: 0 });
        if (d.code != 0) {
          app.util.showToast(d.msg || '加载失败');
          return;
        }
        const list = (d.data || []).map(function (v) {
          const amount = parseInt(v.change_amount) || 0;
          return {
            id: v.id,
            type: v.type,
            typeText: LOG_TYPE_TEXT[v.type] || v.type,
            amount: amount,
            amountText: (amount > 0 ? '+' : '-') + app.util.setPrice(Math.abs(amount)),
            balanceText: app.util.setPrice(parseInt(v.balance_after) || 0),
            remark: v.remark || '',
            time: v.created_time || ''
          };
        });
        t.setData({
          logList: page === 1 ? list : t.data.logList.concat(list),
          logPage: page,
          logCount: parseInt(d.count) || 0,
          logEnd: list.length < t.data.logLimit ? 1 : 0
        });
      },
      fail() {
        t.setData({ logLoading: 0 });
        app.util.showToast('网络异常');
      }
    });
  },

  loadMoreLog() {
    if (this.data.logEnd || this.data.logLoading) {
      return;
    }
    this.getLogList(this.data.logPage + 1);
  },

  onPullDownRefresh() {
    this.getBalance();
    this.loadGoods(1, true);
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 800);
  }
});
