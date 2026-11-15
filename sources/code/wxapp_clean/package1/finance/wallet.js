const tabbarData = require("../../utils/common/tabbar_shop.js");
const app = getApp();
Page({
  data: {
    app: app,
    tabbarData: tabbarData,
    selected: 2,
  },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({
        account: wx.getStorageSync('userinfo'),
        shop: wx.getStorageSync('shop')
      })
      t.getStat();
    })
  },
  getStat(){
    var t = this;
    app.util.request({
      url: 'shop/getMyStat',
      method: 'post',
      data: {
        shop_id: t.data.shop.id,
      },
      success(res) {
        if (res.data.code == 0) {
          // 逻辑处理
          let shop = res.data.data
          shop.balance = app.util.setPrice(shop.balance);
          shop.month = app.util.setPrice(shop.month);
          shop.today = app.util.setPrice(shop.today);
          shop.total = app.util.setPrice(shop.total);
          shop.withdraw = app.util.setPrice(shop.withdraw);
          t.setData({
            stat: shop
          })
        } else {
          app.util.showToast(res.data.msg);
          setTimeout(function(){
            wx.redirectTo({
              url: '/pages/mine/mine',
            })
          },1000);
        }
      },
      fail(error) {
        app.util.showToast()
      }
    })
  },
  onPullDownRefresh() {
    this.getStat();
    setTimeout(function(){wx.stopPullDownRefresh();},1000);
  },
})