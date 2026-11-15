const app = getApp();

/**
 * 导码余额充值页（子 PRD §6.1.4 / D-3 时序稿）
 *
 * ⚠️ K1-0 只建骨架 + 完成 `app.json` 注册（P-1 五页注册汇总）。
 * 金额输入、快捷金额、按 `pay_expire_time` 剩余秒数倒计时、`wx.requestPayment` 调起支付
 * 由 **K1-4 前端**实现（后端 `exportCode/recharge` 已就绪，返回 `pay_params` 与 `pay_expire_time`）。
 */
Page({
  data: {
    app: app,
    amount: '',
    submitting: 0,
    // K1-4：倒计时剩余秒数（以服务端返回的 pay_expire_time − 服务端当前时间为准，禁止写死 240）
    remain: 0,
    payExpireTime: 0
  },

  back() {
    app.back();
  },

  onAmountInput(e) {
    this.setData({ amount: (e.detail.value || '').trim() });
  },

  onPullDownRefresh() {
    setTimeout(function () {
      wx.stopPullDownRefresh();
    }, 500);
  }
});
