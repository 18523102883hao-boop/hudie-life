const tabbarData = require("../../utils/common/tabbar_shop.js");
const app = getApp()
Page({
  data: {
    tabbarData: tabbarData,
    selected: 0,
    app: app,
    account: {},
    shop: {},
  },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  //跳转页面
  goto(e) {
    wx.navigateTo({
      url: e.currentTarget.dataset.url
    })
  },
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({
        account: wx.getStorageSync('userinfo'),
        shop: wx.getStorageSync('shop')
      })
      t.getStoreList();
    })
  },
  getStoreList() {
    var t = this;
    app.util.request({
      url: 'shop/getStoreList',
      method: 'post',
      data: {
        shop_id: t.data.shop.id,
      },
      success(res){
        if (res.data.code == 0) {
          t.setData({info:res.data.data.info});
        } else {
          app.util.showToast(res.data.msg);
          setTimeout(function(){
            wx.redirectTo({
              url: '/pages/mine/mine',
            })
          },1000);
        }
      },
    });
  },
  back() {
    wx.navigateBack()
  },
})