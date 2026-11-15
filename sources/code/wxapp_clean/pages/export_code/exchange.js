const theme = require('../../utils/theme.js');
const app = getApp();

Page({
  data: {
    code: '',
    mobile: '',
    info: null,
    result: null,
    querying: false,
    submitting: false
  },

  onLoad(options) {
    const last = wx.getStorageSync('ec_last_mobile');
    if (last) {
      this.setData({ mobile: String(last) });
    }
    if (options && options.code) {
      this.setData({ code: String(options.code) });
      this.query();
    }
  },

  back() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    app.switchTab('/pages/mine/mine');
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value, info: null, result: null });
  },

  onMobileInput(e) {
    this.setData({ mobile: e.detail.value });
  },

  clearCode() {
    this.setData({ code: '', info: null, result: null });
  },

  normalizedCode() {
    return String(this.data.code || '').replace(/\s+/g, '');
  },

  query() {
    if (this.data.querying) {
      return;
    }
    const code = this.normalizedCode();
    if (code.length !== 16) {
      app.util.showToast('请输入 16 位兑换码');
      return;
    }
    const t = this;
    t.setData({ querying: true, result: null });
    app.util.request({
      url: 'exportCode/exchangePreview',
      method: 'post',
      data: { code: code },
      success(res) {
        t.setData({ querying: false });
        const d = res.data || {};
        if (d.code != 0) {
          t.setData({ info: null });
          app.util.showToast(d.msg || '查询失败');
          return;
        }
        t.setData({ info: d.data || null });
      },
      fail() {
        t.setData({ querying: false });
        app.util.showToast('网络异常，请重试');
      }
    });
  },

  submit() {
    if (this.data.submitting) {
      return;
    }
    const code = this.normalizedCode();
    const mobile = String(this.data.mobile || '').trim();
    if (code.length !== 16) {
      app.util.showToast('请输入 16 位兑换码');
      return;
    }
    if (!this.data.info) {
      app.util.showToast('请先查询兑换码');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      app.util.showToast('请输入正确的手机号');
      return;
    }

    const t = this;
    wx.showModal({
      title: '确认兑换',
      content: '兑换后不可撤回，兑换码将失效。手机号 ' + mobile + ' 将用于门店核销核对。',
      confirmText: '确认兑换',
      confirmColor: theme.action,
      success(r) {
        if (!r.confirm) {
          return;
        }
        t.doExchange(code, mobile);
      }
    });
  },

  doExchange(code, mobile) {
    const t = this;
    t.setData({ submitting: true });
    app.util.request({
      url: 'exportCode/exchange',
      method: 'post',
      data: { code: code, mobile: mobile },
      success(res) {
        t.setData({ submitting: false });
        const d = res.data || {};
        if (d.code != 0) {
          app.util.showToast(d.msg || '兑换失败');
          // 码已失效（已兑 / 作废）时刷新详情，避免继续展示可兑换状态
          if (String(d.msg || '').indexOf('兑换码') > -1) {
            t.setData({ info: null });
          }
          return;
        }
        wx.setStorageSync('ec_last_mobile', mobile);
        t.setData({ result: d.data || null, info: null });
        wx.showToast({ title: '兑换成功', icon: 'success' });
      },
      fail() {
        t.setData({ submitting: false });
        app.util.showToast('网络异常，请重试');
      }
    });
  },

  copyCode() {
    const r = this.data.result;
    if (!r || !r.code) {
      return;
    }
    wx.setClipboardData({
      data: String(r.code),
      success() {
        wx.showToast({ title: '消费码已复制', icon: 'none' });
      }
    });
  },

  goOrders() {
    app.switchTab('/pages/order/index');
  },

  reset() {
    this.setData({ code: '', info: null, result: null });
  }
});
