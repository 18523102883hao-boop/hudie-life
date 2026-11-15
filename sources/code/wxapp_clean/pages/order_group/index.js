// const tabbarData = require("../../utils/common/tabbar.js");
const app = getApp();
Page({
  data: {
    app: app,
    index: 0,
    // tabbarData: tabbarData,
    // selected: 2,
    list: [],
    limit: 10,
    loading: 0,
    is_end: 0,
  },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  viewOrder(e) {
    app.switchTab('/pages/order_group/info?id='+e.currentTarget.dataset.id)
  },
  selIndex(e){
    let t = this;
    let index = e.currentTarget.dataset.index
    if (t.data.index == index) {
      return false;
    }
    t.setData({index:index,list:[],is_end:0})
    t.getOrderList();
  },
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({userinfo:wx.getStorageSync('userinfo')});
      t.getOrderList();
    });
  },
  getOrderList() {
    let t = this;
    if (t.data.loading || t.data.is_end) {
      return false;
    }
    t.setData({loading: 1});
    app.util.request({
      url: 'order_group/getList',
      data: {
        page: t.data.list.length / t.data.limit + 1,
        limit: t.data.limit,
        status: t.data.index
      },
      method: 'post',
      success: (res) => {
        t.setData({loading: 0});
        if (res.data.code == 0) {
          let list = res.data.data;
          for (let k in list) {
            list[k].amount = (list[k].amount / 100).toFixed(2)
          }
          let is_end = 0;
          if (list.length < t.data.limit) {
            is_end = 1;
          }
          t.setData({
            list: t.data.list.concat(list),
            is_end: is_end
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  onPullDownRefresh(){
    let t = this;
    t.setData({is_end:0,list:[]});
    t.getOrderList()
    wx.stopPullDownRefresh();
  },
  onReachBottom(){
    let t = this;
    t.getOrderList();
  }
})