const theme = require('../../utils/theme.js');
const app = getApp();
const { enabled } = require("../../utils/mine.js");
Page({
  data: {
    app,
    loading: true,
    busy: false,
    error: "",
    known: false,
    enable: false,
    bound: false,
    video_sell_id: "",
    input: "",
    isAgent: false,
  },
  onShow() {
    // 登录检查本身是异步的，先同步清理上次账号状态并使旧请求失效。
    const generation = (this._generation = (this._generation || 0) + 1);
    this._visible = true;
    this.clearSession();
    app.util.checkLogin(() => {
      if (generation !== this._generation || !this._visible) return;
      this.loadStatus();
    });
  },
  clearSession() {
    this.setData({
      loading: true,
      busy: false,
      error: "",
      known: false,
      enable: false,
      bound: false,
      video_sell_id: "",
      input: "",
      isAgent: false,
    });
  },
  onHide() {
    this._visible = false;
    this._generation = (this._generation || 0) + 1;
    this.clearSession();
  },
  onUnload() {
    this.onHide();
  },
  loadStatus(afterWrite) {
    if (this._visible === false) return;
    const generation = (this._generation = (this._generation || 0) + 1);
    this.setData({ loading: true, error: "", known: false, isAgent: false });
    // 不使用缓存角色授权写入；服务端仍独立校验实时角色。
    app.util.request({
      url: "user/getInfo",
      method: "post",
      data: { a: 1 },
      success: (res) => {
        if (generation === this._generation)
          this.setData({
            isAgent:
              res.data.code == 0 && Number((res.data.data || {}).is_agent) >= 2,
          });
      },
      fail: () => {
        if (generation === this._generation) this.setData({ isAgent: false });
      },
    });
    app.util.request({
      url: "user/videoBindStatus",
      method: "GET",
      data: { a: 1 },
      success: (res) => {
        if (generation !== this._generation) return;
        if (res.data.code != 0 || !res.data.data) {
          this.setData({ error: res.data.msg || "登记状态查询失败，请重试" });
          return;
        }
        this.applyStatus(res.data.data);
        if (afterWrite === true) app.util.showToast("已重新查询最终登记状态");
      },
      fail: () => {
        if (generation === this._generation)
          this.setData({ error: "登记状态查询失败，请重试" });
      },
      complete: () => {
        if (generation === this._generation)
          this.setData({ loading: false, busy: false });
      },
    });
  },
  applyStatus(value) {
    const bound = enabled(value.bound);
    this.setData({
      known: true,
      enable: enabled(value.enable),
      bound,
      video_sell_id: bound ? String(value.video_sell_id || "") : "",
      input: bound ? String(value.video_sell_id || "") : "",
      error: "",
    });
  },
  onInput(e) {
    if (!this.data.busy) this.setData({ input: e.detail.value });
  },
  submit() {
    if (this.data.busy || this.data.loading || !this.data.known) return;
    if (!this.data.enable || !this.data.isAgent) {
      app.util.showToast("当前暂不可新增或更换登记");
      return;
    }
    const id = String(this.data.input || "").trim();
    if (!id || Array.from(id).length > 128 || /[\s\p{Z}\p{C}]/u.test(id)) {
      app.util.showToast("请填写不含空白和控制字符的 ID，最多128个字符");
      return;
    }
    this.setData({ input: id });
    if (this.data.bound && id === this.data.video_sell_id) {
      app.util.showToast("当前已登记该 ID");
      return;
    }
    if (this.data.bound) {
      const generation = this._generation;
      this.setData({ busy: true });
      wx.showModal({
        confirmColor: theme.action,
        title: "确认更换视频号",
        content:
          "将原登记 ID 更换为 " +
          id +
          "，更换失败将保留原登记。手填登记不代表官方认证。",
        success: (res) => {
          if (generation !== this._generation || !this._visible) return;
          if (res.confirm)
            this.write("user/videoBind", { video_sell_id: id }, generation);
          else this.setData({ busy: false });
        },
        fail: () => {
          if (generation === this._generation && this._visible)
            this.setData({ busy: false });
        },
      });
    } else {
      this.write("user/videoBind", { video_sell_id: id });
    }
  },
  unbind() {
    if (
      this.data.busy ||
      this.data.loading ||
      !this.data.known ||
      !this.data.bound
    )
      return;
    const generation = this._generation;
    this.setData({ busy: true });
    wx.showModal({
      confirmColor: theme.action,
      title: "确认解绑",
      content: "确定清除当前视频号登记？",
      confirmText: "确认解绑",
      success: (res) => {
        if (generation !== this._generation || !this._visible) return;
        if (res.confirm) this.write("user/videoUnbind", { a: 1 }, generation);
        else this.setData({ busy: false });
      },
      fail: () => {
        if (generation === this._generation && this._visible)
          this.setData({ busy: false });
      },
    });
  },
  write(url, data, expectedGeneration) {
    const generation =
      typeof expectedGeneration === "undefined"
        ? this._generation
        : expectedGeneration;
    if (
      generation !== this._generation ||
      this._visible === false ||
      !this.data.known
    )
      return;
    this.setData({ busy: true, error: "" });
    app.util.request({
      url,
      method: "post",
      data,
      success: (res) => {
        if (generation !== this._generation) return;
        if (res.data.code != 0) {
          this.setData({
            busy: false,
            error: res.data.msg || "操作失败，原登记未更改",
          });
          return;
        }
        if (res.data.data && typeof res.data.data.bound !== "undefined")
          this.applyStatus(res.data.data);
        this.setData({ busy: false });
        app.util.showToast("操作成功");
        // 返回后由“我的”页 onShow 重新查询，避免陈旧展示。
        wx.navigateBack();
      },
      fail: () => {
        if (generation !== this._generation) return;
        // 写请求网络失败不能推断提交结果，重新查询后才恢复写入口。
        app.util.showToast("网络异常，正在确认最终状态");
        this.loadStatus(true);
      },
    });
  },
  onClickLeft() {
    if (!this.data.busy) wx.navigateBack();
  },
});
