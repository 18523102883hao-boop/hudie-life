const theme = require('../../utils/theme');
const tabbarData = require("../../utils/common/tabbar.js");
const { cents, money, enabled } = require("../../utils/mine.js");
const app = getApp();
const emptyStat = () => ({
  total: "0.00",
  available: "0.00",
  exchanged_withdrew: "0.00",
  withdrawing: "0.00",
  coin: "0.00",
});
Page({
  data: {
    app,
    tabbarData,
    selected: 2,
    ready: false,
    infoLoading: true,
    userinfo: {},
    defaultAvatar: app.domain + "static/img/head.jpg",
    avatarFailed: false,
    certified: false,
    isAgent: false,
    showAmount: true,
    stat: emptyStat(),
    shop_list: [],
    services: [],
    export_enable: 0,
    export_authorized: 0,
    video_bind_enable: false,
    video: null,
    videoError: false,
    orders: [
      { status: 1, name: "待付款", icon: "icon-order" },
      { status: 2, name: "待使用", icon: "icon-coupon" },
      { status: 3, name: "已完成", icon: "icon-order-success" },
      { status: 0, name: "全部", icon: "icon-viewlist" },
    ],
  },
  onShow() {
    // 每次显示建立新版本，旧账号或旧角色的延迟响应不得覆盖当前页面。
    const version = (this._version = (this._version || 0) + 1);
    this.disconnectObservers();
    this._exposures = {};
    this.setData({
      ready: false,
      infoLoading: true,
      userinfo: {},
      certified: false,
      isAgent: false,
      stat: emptyStat(),
      shop_list: [],
      services: [],
      export_enable: 0,
      export_authorized: 0,
      video_bind_enable: false,
      video: null,
      videoError: false,
      avatarFailed: false,
    });
    app.util.checkLogin(() => {
      if (version === this._version) this.getUserInfo(version);
    });
  },
  onHide() {
    this._version = (this._version || 0) + 1;
    this.disconnectObservers();
  },
  onUnload() {
    this.onHide();
  },
  getUserInfo(version) {
    app.util.request({
      url: "user/getInfo",
      method: "post",
      data: { check_is_bd: 1 },
      success: (res) => {
        if (version !== this._version) return;
        if (res.data.code != 0 || !res.data.data) {
          this.infoFailure();
          return;
        }
        const raw = res.data.data;
        wx.setStorageSync("userinfo", raw);
        this._coin = cents(raw.coin);
        const mobile = String(raw.mobile || "").trim(),
          isAgent = Number(raw.is_agent) >= 2;
        this.setData({
          ready: true,
          infoLoading: false,
          userinfo: Object.assign({}, raw, {
            mobile: mobile.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
          }),
          certified: !!mobile,
          isAgent,
          video_bind_enable: enabled(raw.video_bind_enable),
        });
        this.buildServices();
        this.report("mine_page_view", { module: "mine" });
        this.observeModules();
        this.getShopList(version);
        this.getExportAuth(version);
        if (isAgent) this.getAgentStat(version);
        if (isAgent && enabled(raw.video_bind_enable))
          this.getVideoStatus(version);
        if (raw.img === "https://m.kttkj.com/static/img/head.jpg")
          this.checkAuth(raw);
      },
      fail: () => {
        if (version === this._version) this.infoFailure();
      },
    });
  },
  infoFailure() {
    this.setData({
      ready: false,
      infoLoading: false,
      userinfo: {},
      isAgent: false,
      certified: false,
      stat: emptyStat(),
      shop_list: [],
      services: [],
      export_enable: 0,
      export_authorized: 0,
      video_bind_enable: false,
      video: null,
    });
    app.util.showToast("个人信息加载失败，请重试");
  },
  retry() {
    this.onShow();
  },
  getAgentStat(version) {
    app.util.request({
      url: "user/getAgentStat",
      method: "post",
      data: { a: 1 },
      success: (res) => {
        if (version !== this._version) return;
        if (res.data.code != 0 || !res.data.data) {
          this.setData({ stat: emptyStat() });
          return;
        }
        const raw = res.data.data;
        this.setData({
          stat: {
            total: money(
              this._coin + cents(raw.withdrew) + cents(raw.withdrawing),
            ),
            available: money(this._coin),
            exchanged_withdrew: money(
              cents(raw.exchanged) + cents(raw.withdrew),
            ),
            withdrawing: money(raw.withdrawing),
            coin: money(raw.coin),
          },
        });
      },
      fail: () => {
        if (version === this._version) this.setData({ stat: emptyStat() });
      },
    });
  },
  getShopList(version) {
    app.util.request({
      url: "user/getShopList",
      method: "post",
      data: { a: 1 },
      success: (res) => {
        if (version !== this._version) return;
        this.setData({
          shop_list:
            res.data.code == 0 && Array.isArray(res.data.data)
              ? res.data.data
              : [],
        });
        this.buildServices();
      },
      fail: () => {
        if (version === this._version) {
          this.setData({ shop_list: [] });
          this.buildServices();
        }
      },
    });
  },
  getExportAuth(version) {
    app.util.request({
      url: "exportCode/balance",
      method: "post",
      data: { a: 1 },
      success: (res) => {
        if (version !== this._version) return;
        const value = (res.data.code == 0 && res.data.data) || {};
        this.setData({
          export_enable: enabled(value.enable) ? 1 : 0,
          export_authorized: enabled(value.authorized) ? 1 : 0,
        });
        this.buildServices();
      },
      fail: () => {
        if (version === this._version) {
          this.setData({ export_enable: 0, export_authorized: 0 });
          this.buildServices();
        }
      },
    });
  },
  getVideoStatus(version) {
    app.util.request({
      url: "user/videoBindStatus",
      method: "GET",
      data: { a: 1 },
      success: (res) => {
        if (version !== this._version) return;
        if (res.data.code != 0 || !res.data.data) {
          this.setData({ videoError: true });
          return;
        }
        this.setData({
          video: res.data.data,
          videoError: false,
          video_bind_enable: enabled(res.data.data.enable),
        });
        this.observeModules();
      },
      fail: () => {
        if (version === this._version) this.setData({ videoError: true });
      },
    });
  },
  buildServices() {
    const items = [
      {
        key: "customer",
        name: "联系客服",
        icon: "icon-customer-service",
        page: "/pages/join_us/add_customer",
      },
    ];
    if (this.data.export_enable && this.data.export_authorized)
      items.push({
        key: "export",
        name: "导出兑换码",
        icon: "icon-qr-code",
        page: "/pages/export_code/index",
      });
    if (this.data.export_enable)
      items.push({
        key: "exchange",
        name: "兑换商品",
        icon: "icon-coupon",
        page: "/pages/export_code/exchange",
      });
    items.push({
      key: "team",
      name: this.data.isAgent ? "我的团队" : "达人申请",
      icon: "icon-customer-group",
      page: this.data.isAgent
        ? "/pages/agent/index?index=3"
        : "/pages/join_us/index",
    });
    if (this.data.shop_list.length)
      items.push(
        {
          key: "verify",
          name: "券码核销",
          icon: "icon-scan",
          shop: true,
          type: 1,
        },
        {
          key: "shop",
          name: "门店管理",
          icon: "icon-shopping",
          shop: true,
          type: 2,
        },
      );
    // 后端返回BD管理员记录ID，任意正整数都代表具备BD身份。
    if (Number(this.data.userinfo.is_bd) > 0)
      items.push({
        key: "bd",
        name: "业绩查看",
        icon: "icon-order-manage",
        page: "/package1/bd/index",
      });
    items.push({
      key: "profile",
      name: "个人资料",
      icon: "icon-customer",
      page: "/package2/userinfo/index",
    });
    if (this.data.isAgent)
      items.push({
        key: "invite",
        name: "邀请码",
        icon: "icon-share",
        page: "/pages/join_us/invite",
      });
    this.setData({ services: items }, () => this.observeModules());
  },
  report(event, fields) {
    if (typeof wx.reportEvent !== "function") return;
    try {
      wx.reportEvent(
        event,
        Object.assign(
          {
            is_agent: !!this.data.isAgent,
            is_shop: !!this.data.shop_list.length,
            is_bd: Number(this.data.userinfo.is_bd) > 0,
            export_enable: !!this.data.export_enable,
            export_authorized: !!this.data.export_authorized,
            video_bind_enable: !!this.data.video_bind_enable,
          },
          fields,
        ),
      );
    } catch (_) {
      /* 埋点失败不影响功能。 */
    }
  },
  observeModules() {
    if (
      !this.data.ready ||
      typeof this.createIntersectionObserver !== "function"
    )
      return;
    this.disconnectObservers();
    this._observers = [];
    const targets = ["profile", "orders", "services"];
    if (this.data.isAgent) targets.push("assets");
    if (this.data.isAgent && this.data.video_bind_enable) targets.push("video");
    this.data.services.forEach((item) => targets.push("entry-" + item.key));
    targets.forEach((module) => {
      if (this._exposures[module]) return;
      const observer = this.createIntersectionObserver({ thresholds: [0.01] });
      this._observers.push(observer);
      observer.relativeToViewport().observe("#mine-" + module, (result) => {
        if (result.intersectionRatio <= 0 || this._exposures[module]) return;
        this._exposures[module] = true;
        this.report("mine_module_view", { module });
        observer.disconnect();
      });
    });
  },
  disconnectObservers() {
    (this._observers || []).forEach((item) => item.disconnect());
    this._observers = [];
  },
  toggleAmount() {
    this.setData({ showAmount: !this.data.showAmount });
  },
  avatarError() {
    // 业务头像失效时先尝试默认图，默认图也失败才显示文字兜底。
    if (this.data.userinfo.img) this.setData({ "userinfo.img": "" });
    else this.setData({ avatarFailed: true });
  },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  toPage(e) {
    this.report("mine_entry_click", {
      entry: e.currentTarget.dataset.entry || "profile",
    });
    app.switchTab(e.currentTarget.dataset.page);
  },
  toOrder(e) {
    const status = Number(e.currentTarget.dataset.status);
    this.report("mine_entry_click", { entry: "order", status: String(status) });
    app.switchTab("/pages/order/index?status=" + status);
  },
  toService(e) {
    const item = this.data.services[e.currentTarget.dataset.index];
    if (!item) return;
    this.report("mine_entry_click", { entry: item.key });
    if (item.shop) {
      this.openShop(0, item.type);
      return;
    }
    app.switchTab(item.page);
  },
  bindPickerChange(e) {
    this.report("mine_entry_click", {
      entry: Number(e.currentTarget.dataset.type) === 1 ? "verify" : "shop",
    });
    this.openShop(Number(e.detail.value), Number(e.currentTarget.dataset.type));
  },
  openShop(index, type) {
    const shop = this.data.shop_list[index];
    if (!shop) return;
    wx.setStorageSync("shop", shop);
    app.switchTab(
      type === 1 ? "/package1/order/verify" : "/package1/shop/index",
    );
  },
  viewVault() {
    this.report("mine_entry_click", { entry: "vault" });
    app.switchTab("/pages/agent/index");
  },
  tipCoin() {
    this.report("mine_entry_click", { entry: "expected" });
    wx.showModal({
      confirmColor: theme.action,
      title: "预收获",
      content: "用户到店核销后可获得蝴蝶币",
      showCancel: false,
      confirmText: "我知道了",
    });
  },
  tipExchanged() {
    this.report("mine_entry_click", { entry: "exchanged_help" });
    wx.showModal({
      confirmColor: theme.action,
      title: "已兑现金额说明",
      content: "已兑现金额 = 自购省的金额 + 佣金提现金额",
      showCancel: false,
      confirmText: "我知道了",
    });
  },
  tipWithdrawing() {
    this.report("mine_entry_click", { entry: "withdrawing" });
    wx.showModal({
      confirmColor: theme.action,
      title: "兑现中",
      content: "申请兑现后需等待客服审核",
      showCancel: false,
      confirmText: "我知道了",
    });
  },
  checkAuth(userinfo) {
    if (userinfo.need_mobile) {
      app.util.showToast("您还未授权!");
      app.switchTab("/pages/switch/login");
      return;
    }
    wx.showModal({
      confirmColor: theme.action,
      title: "提示",
      content: "为了方便您的使用，请授权获取您的昵称及头像！",
      confirmText: "前往授权",
      success: (res) => {
        if (res.confirm)
          app.switchTab(
            "/package2/webview/index?url=" +
              encodeURIComponent(app.domain + "wechat/empower?scene=mine"),
          );
      },
    });
  },
});
