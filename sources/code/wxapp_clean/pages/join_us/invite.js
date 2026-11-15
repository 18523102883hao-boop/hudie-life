const app = getApp();
Page({
  data: {
    app: app,
    location: {},
    swiperIndex: 0,
    qrcode: [],
  },
  //轮播图
  swiperchange(e) {
    let {
      current
    } = e.detail
    let t = this
    t.setData({
      swiperIndex: current
    })
  },
  saveImg() {
    let t = this;
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.writePhotosAlbum']) {
          t.save2()
        } else if (res.authSetting['scope.writePhotosAlbum'] === undefined) {
          // 第一次运行，授权未定义，可以直接保存，系统会一次性询问用户权限
          t.save2()
        } else {
          wx.openSetting({
            success(res) { // 用户授权
              if (res.authSetting['scope.writePhotosAlbum']) {
                t.save2()
              } else { // 用户拒绝授权
                app.util.showToast('权限不足');
              }
            },
            fail(res) {
              console.log(res);
              app.util.showToast('设置失败');
            }
          })
        }
      }
    })
  },
  save2(field) {
    let t = this;
    let arr = t.data.qrcode;
    if (arr.length <= 0) {
      return app.util.showToast('没有要保存的海报');
    }
    for (let k in arr) {
      wx.getImageInfo({
        src: arr[k],
        success(res) {
          wx.saveImageToPhotosAlbum({
            filePath: res.path,
            success(res) {
              app.util.showToast('保存成功');
            }
          })
        }
      })
    }
  },
  shareImg(){
    let t = this;
    wx.getImageInfo({
      src: t.data.qrcode[t.data.swiperIndex],
      success(res) {
        wx.showShareImageMenu({
          path: res.path,
        })
      }
    })
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
      t.getQrcode();
    })
  },
  getQrcode(){
    let t = this;
    app.util.request({
      url: 'qrcode/getInviteQrcode',
      data: {a:1},
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          t.setData({
            qrcode: res.data.data
          })
        }
      }
    })
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    let t = this;
    return {
      title: app.name,
      path: '/pages/index/index?user_id='+t.data.userinfo.id+'_invite',
      imageUrl: app.domain + app.share_img
    }
  },
})