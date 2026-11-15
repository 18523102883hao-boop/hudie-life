const app = getApp();
Page({
  
  data: {
    app: app,
    house_id: 0,
    page: 1,
    limit: 10,
    is_end: 0,
    i: 1,
    is_loading: 0,
    list: [],
  },
  
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({house_id:options.house_id})
      t.getList()
    })
  },
  onPullDownRefresh(){
    let t = this;
    t.setData({page:0,list:[],is_end:0});
    t.getList()
    wx.stopPullDownRefresh();
  },
  detail(e){
    wx.navigateTo({
      url: '/pages/bill/detail?data='+encodeURIComponent(JSON.stringify(e.currentTarget.dataset.item)),
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
      url: 'houseBill/getList',
      data: {
        house_id: t.data.house_id,
        status: '2,3,4',
        project: t.data.i-1,
        page: t.data.page,
        limit: t.data.limit
      },
      method: 'post',
      success: (res) => {
        t.setData({is_loading: 0});
        if (res.data.code == 0) {
          let list = res.data.data;
          let oldList = t.data.list;
          for (let i in list) {
            list[i].pay_amount = app.util.setPrice(list[i].pay_amount, 1000)
            list[i].amount = app.util.setPrice(list[i].amount, 1000)
          }
          let is_end = 0;
          if (list.length != t.data.limit) {
            is_end = 1;
          }
          t.setData({
            list: oldList.concat(list),
            is_end: is_end
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
})