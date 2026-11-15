const app = getApp();
Page({
  data: {
    app: app,
    house_id: 0,
    path_name: '',
    last: {}
  },

  advance(e){
    let t = this;
    let subject = e.currentTarget.dataset.subject;
    let last_time;
    let month_amount;
    if (subject == 1) {
      if (t.data.last.has_rent_order > 0) {
        return app.util.showToast('您还有未缴的租金账单，请先去缴款!')
      }
      last_time = t.data.last.last_rent_time;
      month_amount = t.data.last.month_rent;
    }
    if (subject == 2) {
      if (t.data.last.has_fee_order > 0) {
        return app.util.showToast('您还有未缴的物业费账单，请先去缴款!')
      }
      last_time = t.data.last.last_fee_time;
      month_amount = t.data.last.month_fee;
    }
    wx.navigateTo({
      url: '/pages/bill/advance_add?house_id='+t.data.house_id+'&subject='+subject+'&last_time='+last_time+'&month_amount='+month_amount,
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
      t.getTime();
    })
  },
  getTime(){
    let t = this;
    app.util.request({
      url: 'houseBill/getLastTime',
      data: {
        house_id: t.data.house_id
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({
            last: res.data.data
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },

})