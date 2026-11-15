const app = getApp();
Page({
  data: {
    app: app,
    house_id: 0,
    path_name: '',
    list: [],
    total: 0,
    num: 0
  },

  toPay(e){
    let t = this;
    if (t.data.total <= 0) {
      return;
    }
    let ids = [];
    let list = t.data.list;
    for (let i in list) {
      if (list[i].checked) {
        ids.push(list[i].id)
      }
    }
    wx.showLoading();
    app.util.request({
      url: 'houseBill/createPayment',
      data: {
        bill_ids: ids
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading()
        if (res.data.code == 0) {
          wx.navigateTo({
            url: '/pages/bill/pay?data='+encodeURIComponent(JSON.stringify(res.data.data)),
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  detail(e){
    wx.navigateTo({
      url: '/pages/bill/detail?data='+encodeURIComponent(JSON.stringify(e.currentTarget.dataset.item)),
    })
  },
  record(e){
    wx.navigateTo({
      url: '/pages/bill/record?house_id='+this.data.house_id,
    })
  },
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({house_id: options.house_id,path_name: decodeURIComponent(options.path_name)});
      t.getListAll();
    })
  },
  getListAll(){
    let t = this;
    app.util.request({
      url: 'houseBill/getListAll',
      data: {
        house_id: t.data.house_id,
        status: 1
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let list = res.data.data;
          for (let i in list) {
            list[i].pay_amount = app.util.setPrice(list[i].pay_amount, 1000)
            list[i].amount = app.util.setPrice(list[i].amount, 1000)
          }
          t.setData({
            list: list
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },

  bindCheckboxChange(e){
    let t = this;
    let list = t.data.list;
    for (let i in list) {
      if (e.detail.value.indexOf(list[i].id+'') > -1) {
        list[i].checked = true;
      } else {
        list[i].checked = false;
      }
    }
    t.setData({list: list});
    t.setTotal();
  },
  checkAll(e){
    let t = this;
    let list = t.data.list;
    for (let i in list) {
      list[i].checked = e.detail.value.length > 0;
    }
    t.setData({list: list});
    t.setTotal();
  },
  setTotal(){
    let t = this;
    let list = t.data.list;
    let num = 0;
    let total = 0;
    for (let i in list) {
      if (list[i].checked) {
        num++;
        total += parseFloat(list[i].pay_amount);
      }
    }
    t.setData({total:total.toFixed(2),num:num});
  },
  
  onPullDownRefresh() {
    let t = this;
    t.getListAll();
    wx.stopPullDownRefresh();
  }
})