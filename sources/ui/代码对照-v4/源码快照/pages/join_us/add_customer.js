const app = getApp();
Page({
  data: {
    app: app,
    location: {}
  },

  back(){
    app.back()
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({userinfo: wx.getStorageSync('userinfo')});
      t.getLocation()
    })
  },

  getLocation() {
    let t = this;
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting["scope.userLocation"]) {
          app.util.showToast('请点击右上角设置，开启位置权限');
          wx.authorize({
            scope: 'scope.userLocation',
            success () {
              t.getLocation();
            }
          })
          t.getQunQrcode();
        } else if (res.authSetting['scope.userInfo'] == undefined) {
          wx.getLocation({
            type: 'wgs84',
            success(response) {
              t.setLocation(response)
            }
          })
        } else {
          wx.getLocation({
            type: 'gcj02',
            success(response) {
              t.setLocation(response)
            }
          })
        }
      }
    })
  },
  setLocation(response){
    var t = this;
    var location = {
      lat : response.latitude,
      lng : response.longitude,
      expire_time : new Date().getTime() + 1800000
    };
    t.setData({
      location: location,
    })
    wx.setStorageSync('location', location)
    t.getQunQrcode();
  },
  getQunQrcode(){
    let t = this;
    app.util.request({
      url: 'qrcode/getCustomer',
      data: {
        name: '卡卡',
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          t.setData({
            customer: res.data.data
          })
        }
      }
    })
  },
})