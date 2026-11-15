const app = getApp()
Page({
  data: {
    app: app,
    list: [],
    limit: 20,
    loading: 0,
    is_end: 0
  },
  getPage() {
    let t = this
    if (t.data.loading || t.data.is_end) {
      return false;
    }
    t.setData({loading: 1});
    app.util.request({
      url: "shop/getVerifyList",
      method: 'post',
      data: {
        shop_id: t.data.shop.id,
        page: t.data.list.length / t.data.limit + 1,
        limit: t.data.limit
      },
      success(res) {
        t.setData({loading: 0});
        if (res.data.code == 0) {
          let list = res.data.data
          list.forEach(item => {
            item.settle_amount = app.util.setPrice(item.settle_amount);
          })
          let is_end = 0;
          if (list.length < t.data.limit) {
            is_end = 1;
          }
          t.setData({list:list,is_end:is_end});
        } else {
          app.util.showToast(res.msg)
        }
      },
      fail(error) {
        console.log(error);
        app.util.showToast()
      }
    })
  },
  onLoad(){
    let t = this;
    app.util.checkLogin(function(){
      t.setData({
        shop: wx.getStorageSync('shop'),
        userinfo: wx.getStorageSync('userinfo')
      })
      t.getPage()
    });
  },
  // 返回上一页
  onClickLeft() {
    wx.navigateBack();
  },
  onPullDownRefresh() {
    let t = this
    t.setData({
      list: [],
      loading: 0,
      is_end: 0
    })
    t.getPage()
    wx.stopPullDownRefresh();
  },
  onReachBottom() {
    this.getPage();
  }
})