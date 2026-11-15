const theme = require('../../utils/theme');
const app = getApp()
Page({
  data: {
    app: app,
    score_list: [],
    score: 0,
    index: 0,
    disabled: 1,
  },
  onLoad(options) {
    let t = this;
    let score_list = [];
    for (let i = 100;i>0;i--) {
      score_list.push(i);
    }
    app.util.checkLogin(function(){
      t.setData({score_list: score_list, disabled:0,userinfo: wx.getStorageSync('userinfo')});
    })

    let it = setInterval(function(){
      app.util.request({
        url: 'score/getIndex',
        data: {
          user_id: t.data.userinfo.id,
        },
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            if (res.data.data == -1) {
              app.util.showToast('活动已结束');
              t.setData({disabled: 1, index: 0})
              clearInterval(it);
            } else if (res.data.data > 0 && res.data.data != t.data.index) {
              if (t.data.disabled == 0) {
                //还没评分 自动评50分
                app.util.request({
                  url: 'score/score',
                  data: {
                    user_id: t.data.userinfo.id,
                    index: t.data.index,
                    score: 50
                  },
                  method: 'post'
                })
              }
              app.util.showToast(res.data.msg);
              t.setData({disabled: 0, index: res.data.data, score: 0})
            }
          }
        }
      })
    }, 1000);
  },
  setScore(e){
    this.setData({score:e.currentTarget.dataset.score});
  },
  score(){
    let t = this;
    if (t.data.index <= 0) {
      return wx.showToast({
        title: '活动尚未开始，请稍等！',
        icon: 'none'
      })
    }
    if (t.data.score <= 0) {
      return wx.showToast({
        title: '请选择分值',
        icon: 'error'
      })
    }
    wx.showModal({
      confirmColor: theme.action,
      title: '确认评分',
      content: '确定要为'+t.data.index+'号选手打出'+t.data.score+'分吗！？',
      complete: (res) => {
        if (res.confirm) {
          wx.showLoading()
          app.util.request({
            url: 'score/score',
            data: {
              user_id: t.data.userinfo.id,
              index: t.data.index,
              score: t.data.score
            },
            method: 'post',
            success: (res) => {
              wx.hideLoading();
              if (res.data.code == 0) {
                app.util.showToast(res.data.msg, 'success');
                t.setData({disabled: 1})
              } else {
                app.util.showToast(res.data.msg, 'error');
              }
            }
          })
        }
      }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },
})