const app = getApp()
Page({
  data: {
    url: '',
    userinfo : null
  },
  onLoad(options){
    let t = this;
    app.util.checkLogin(function(){
      let url = decodeURIComponent(options.url)
      t.setData({url:url,userinfo:wx.getStorageSync('userinfo')})
      wx.setNavigationBarTitle({
        title: options.title,
      })
    })
  },
  doMessage(e){
    let t = this;
    app.util.request({
      url: 'user/getInfo',
      method: 'post',
      data: {  
        id: t.data.userinfo.id,
      },
      success(res) {
        if (res.data.code == 0) {
          wx.setStorageSync('userinfo', res.data.data);
        }
      }
    })
  },
});