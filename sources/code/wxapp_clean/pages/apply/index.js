const app = getApp();
Page({
  data: {
    app: app,
    i: 1,
    page: 1,
    limit: 10,
    is_end: 0,
    is_loading: 0,
    list: [],
    show_btn: 0
  },
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({i: options.i ? options.i : 1})
      t.getList()
    })
  },
  onPullDownRefresh(){
    let t = this;
    t.setData({page:1,list:[],is_end:0});
    t.getList()
    wx.stopPullDownRefresh();
  },
  detail(e){
    wx.navigateTo({
      url: (this.data.i == 1 ? '/pages/apply/house?id=' : '/pages/apply/year?id=')+e.currentTarget.dataset.item.id,
    })
  },
  toApply(e){
    wx.navigateTo({
      url: this.data.i == 1 ? '/pages/apply/house_apply' : '/pages/apply/year_apply',
    })
  },
  selNav(e) {
    let t = this;
    let i = e.currentTarget.dataset.i;
    if (t.data.i == i) {
      return false;
    }
    t.setData({i:i,page:0,list:[],is_end:0});
    t.getList();
  },
  getList(){
    let t = this;
    if (t.data.is_end || t.data.is_loading) {
      return false;
    }
    t.setData({is_loading: 1});
    app.util.request({
      url: 'apply/getList',
      data: {
        i: t.data.i,
        page: t.data.page,
        limit: t.data.limit
      },
      method: 'post',
      success: (res) => {
        t.setData({is_loading: 0});
        if (res.data.code == 0) {
          let list = res.data.data;
          let oldList = t.data.list;
          let is_end = 0;
          if (list.length != t.data.limit) {
            is_end = 1;
          }
          list = oldList.concat(list);
          t.setData({
            list: list,
            is_end: is_end,
            show_btn: list.length <= 0 || list[0].status < 0 ? 1 : 0
          })
        } else {
          t.setData({show_btn:1})
          app.util.showToast('加载失败!');
        }
      }
    })
  }
})