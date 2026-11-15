const app = getApp();
Page({
  data: {
    app: app
  },

  back(){
    app.back()
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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