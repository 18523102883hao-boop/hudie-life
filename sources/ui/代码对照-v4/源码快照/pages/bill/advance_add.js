const app = getApp();
Page({
  
  data: {
    app: app,
    house_id: 0,
    subject: 0,
    last_time: '',
    total: 0,
    i: 0,
    month: 0,
    input_mon: 0,
    range: ''
  },

  selMonth(e) {
    let obj = e.currentTarget.dataset;
    let t = this;
    if (obj.i < 5){
      t.setData({
        i: obj.i,
        month: obj.mon
      })
      this.getAmount();
    } else {
      t.setData({
        i: 5,
        month: 0,
        total: 0,
        range: ''
      })
      if (t.data.input_mon > 0) {
        t.setData({
          month: t.data.input_mon
        })
        this.getAmount();
      }
    }
  },
  inputMon(e){
    this.setData({month: e.detail.value,input_mon:e.detail.value,range:''})
    this.getAmount();
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({
        house_id: options.house_id,
        subject: options.subject,
        last_time: options.last_time,
        month_amount: options.month_amount
      });
    })
  },

  advance(){
    let t = this;
    app.util.request({
      url: 'houseBill/advance',
      data: {
        house_id: t.data.house_id,
        subject: t.data.subject,
        month: t.data.month
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          wx.navigateTo({
            url: '/pages/bill/pay?data='+encodeURIComponent(JSON.stringify(res.data.data)),
          })
        } else {
          app.util.showToast(res.data.msg);
        }
      }
    })
  },

  getAmount() {
    let t = this;
    app.util.request({
      url: 'houseBill/getAmount',
      data: {
        house_id: t.data.house_id,
        subject: t.data.subject,
        month: t.data.month
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({
            range: res.data.data.range,
            total: app.util.setPrice(res.data.data.bill.amount, 1000),
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
})