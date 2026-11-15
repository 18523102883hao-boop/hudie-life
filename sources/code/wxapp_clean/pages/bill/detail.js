const app = getApp();
Page({
  data: {
    app: app,
    data:{}
  },
  
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      let data = JSON.parse(decodeURIComponent(options.data));
      data.refund_amount = app.util.setPrice(data.refund_amount, 1000)
      t.setData({data: data})
      if (data.refund_amount > 0) {
        t.getRefundList();
      }
    })
  },

  getRefundList(){
    let t = this;
    app.util.request({
      url: 'houseBill/getRefundListAll',
      data: {
        bill_id: t.data.data.id
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let list = res.data.data;
          for (let i in list) {
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
  }
})