const theme = require('../../utils/theme.js');
const app = getApp();

// 三态文案兜底（正常由服务端 status_text 下发，前端不自行推导）
const STATUS_TEXT = {
  unused: '未使用',
  used: '已使用',
  voided: '已作废'
};

/**
 * 作废兑换码页（子 PRD §6.1.7 / EC-31 ~ EC-33）
 *
 * 口径：
 *  - 只有「本人导出的未使用码」可作废；服务端以登录态判定归属，前端**不传 user_id**；
 *  - 作废与退款同一事务：服务端按 `export_price`（分）原路返还，前端**不传金额**；
 *  - 提交前必然二次确认（退款 + 码立即失效，属不可逆操作）。
 */
Page({
  data: {
    app: app,
    code: '',
    info: null,
    reason: '',
    reasonLen: 0,
    querying: 0,
    submitting: 0,
    refunded: null
  },

  onLoad(options) {
    const code = options && options.code ? String(options.code) : '';
    if (code) {
      this.setData({ code: code });
      this.query();
    }
  },

  back() {
    app.back();
  },

  /** 修改兑换码 → 旧查询结果失效，避免拿 A 的信息去作废 B */
  onCodeInput(e) {
    const value = (e.detail.value || '').trim();
    this.setData({
      code: value,
      info: null,
      refunded: null,
      submitting: 0
    });
  },

  clearCode() {
    this.setData({ code: '', info: null, refunded: null, reason: '', reasonLen: 0 });
  },

  /** 查询兑换码（确认商品 / 状态 / 导码价后再决定是否作废） */
  query() {
    if (this.data.querying) {
      return;
    }
    const code = (this.data.code || '').trim();
    if (!code) {
      app.util.showToast('请输入兑换码');
      return;
    }

    const t = this;
    t.setData({ querying: 1 });
    app.util.request({
      url: 'exportCode/voidInfo',
      method: 'post',
      data: { code: code },
      success(res) {
        const d = res.data || {};
        if (d.code != 0) {
          t.setData({ querying: 0, info: null, refunded: null });
          app.util.showToast(d.msg || '查询失败');
          return;
        }
        t.setData({ querying: 0, info: t.formatInfo(d.data || {}), refunded: null });
      },
      fail() {
        t.setData({ querying: 0 });
        app.util.showToast('网络异常');
      }
    });
  },

  /** 服务端字段 → 页面字段（金额统一用 util.setPrice 由分转元展示） */
  formatInfo(v) {
    const status = v.status || '';
    const exportPrice = parseInt(v.export_price) || 0;
    return {
      code: v.code || '',
      product_id: v.product_id || 0,
      product_title: v.product_title || '',
      product_img: v.product_img || '',
      export_price: exportPrice,
      exportPriceText: app.util.setPrice(exportPrice),
      status: status,
      statusText: v.status_text || STATUS_TEXT[status] || '状态异常',
      can_void: parseInt(v.can_void) === 1 ? 1 : 0,
      void_reason: v.void_reason || '',
      created_time: v.created_time || '',
      used_time: v.used_time || '',
      void_time: v.void_time || '',
      batch_no: v.batch_no || ''
    };
  },

  onReasonInput(e) {
    const value = e.detail.value || '';
    this.setData({ reason: value, reasonLen: value.length });
  },

  /** 提交前二次确认（退款不可逆） */
  submit() {
    const d = this.data;
    if (d.submitting) {
      return;
    }
    if (!d.info) {
      app.util.showToast('请先查询兑换码');
      return;
    }
    if (!d.info.can_void) {
      app.util.showToast('该兑换码当前不可作废');
      return;
    }
    const reason = (d.reason || '').trim();
    if (!reason) {
      app.util.showToast('请填写作废原因');
      return;
    }

    const t = this;
    wx.showModal({
      title: '确认作废',
      content: '作废后该兑换码立即失效，导码价 ¥' + d.info.exportPriceText + ' 将退回导码余额，操作不可撤销。',
      confirmText: '确认作废',
      confirmColor: theme.action,
      success(res) {
        if (res.confirm) {
          t.doVoid();
        }
      }
    });
  },

  doVoid() {
    const t = this;
    const info = t.data.info;
    if (!info || t.data.submitting) {
      return;
    }
    t.setData({ submitting: 1 });

    app.util.request({
      url: 'exportCode/voidCode',
      method: 'post',
      data: { code: info.code, reason: (t.data.reason || '').trim() },
      success(res) {
        const d = res.data || {};
        if (d.code != 0) {
          t.setData({ submitting: 0 });
          app.util.showToast(d.msg || '作废失败');
          return;
        }
        const r = d.data || {};
        // 就地更新为已作废态：不依赖二次查询，避免网络抖动导致展示与库内不一致
        const next = Object.assign({}, info, {
          status: r.status || 'voided',
          statusText: r.status_text || '已作废',
          can_void: 0,
          void_reason: r.void_reason || '',
          void_time: r.void_time || ''
        });
        t.setData({
          submitting: 0,
          info: next,
          reason: '',
          reasonLen: 0,
          refunded: {
            amountText: app.util.setPrice(parseInt(r.refund_amount) || 0),
            balanceText: app.util.setPrice(parseInt(r.balance_after) || 0)
          }
        });
        app.util.showToast('作废成功');
        t.refreshPrevPage();
      },
      fail() {
        t.setData({ submitting: 0 });
        app.util.showToast('网络异常');
      }
    });
  },

  /** 通知上一页（导出记录）重新拉取，保证状态与余额即时一致 */
  refreshPrevPage() {
    const pages = getCurrentPages();
    for (let i = pages.length - 2; i >= 0; i--) {
      const prev = pages[i];
      if (prev && typeof prev.reloadList === 'function') {
        prev.reloadList();
        break;
      }
    }
  },

  copyCode() {
    const info = this.data.info;
    if (!info || !info.code) {
      return;
    }
    wx.setClipboardData({ data: info.code });
  },

  onPullDownRefresh() {
    if (this.data.code) {
      this.query();
    }
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 500);
  }
});
