const app = getApp();
let it = null;
Page({

  data: {
    app: app,
    data: {},
  },

  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      let data = JSON.parse(decodeURIComponent(decodeURIComponent(options.data)));
      data.pay_amount = app.util.setPrice(data.pay_amount, 1000);
      t.setData({data: data});
      t.setSec();
    })
  },
  setSec() {
    let t = this;
    let end_time = t.data.data.add_time + 3*60;
    let ca = end_time - parseInt(new Date().getTime()/1000);
    if (ca <= 0) {
      t.close();
      return;
    }
    let h = parseInt(ca / 3600);
    let m = parseInt((ca - h*3600) / 60);
    let s = ca - h*3600 - m*60;
    let str = (h < 10 ? ('0'+h) : h)+':'+(m < 10 ? ('0'+m) : m)+':'+(s < 10 ? ('0'+s) : s)
    t.setData({time_str: str});
    it = setTimeout(function(){
      t.setSec()
    }, 1000);
  },
  close(){
    let t = this;
    app.util.request({
      url: 'houseBill/closePayment',
      data: {
        id: t.data.data.id
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          wx.navigateBack()
        } else {
          if (res.data.msg == '支付成功') {
            t.setSucc(5);
          } else {
            app.util.showToast(res.data.msg);
          }
        }
      }
    })
  },
  setSucc(sec) {
    if (sec == 0) {
      return t.toBill();
    }
    let t = this;
    t.setData({succ:1,sec: sec});
    it = setTimeout(function(){
      t.setSucc(sec-1);
    }, 1000)
  },
  toBill(){
    let t = this;
    return wx.redirectTo({
      url: '/pages/bill/record?house_id='+t.data.data.house_id,
    })
  },
  onUnload(){
    clearInterval(it);
    it = null;
    this.close();
  }
})