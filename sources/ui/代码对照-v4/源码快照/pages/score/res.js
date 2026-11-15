const theme = require('../../utils/theme');
const app = getApp();
Page({

  data: {
    app: app,
    index: 0,
    list: []
  },

  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({userinfo: wx.getStorageSync('userinfo')});
      app.util.request({
        url: 'score/getIndex',
        data: {
          user_id: t.data.userinfo.id,
        },
        method: 'post',
        success: (res) => {
          if (res.data.code == 0 && res.data.data) {
            t.setData({index: parseInt(res.data.data)})
          }
        }
      })
      
      app.util.request({
        url: 'score/getList',
        data: {
          user_id: t.data.userinfo.id,
        },
        method: 'post',
        success: (res) => {
          if (res.data.code == 0 && res.data.data) {
            t.setData({list: res.data.data})
          }
        }
      })
    })
  },
  setIndex(){
    let t = this;
    wx.showModal({
      confirmColor: theme.action,
      title: '提示',
      content: '确定'+(t.data.index+1)+'号选手已经入场了吗！？',
      complete: (res) => {
        if (res.confirm) {
          wx.showLoading()
          app.util.request({
            url: 'score/index',
            data: {
              user_id: t.data.userinfo.id,
              index: parseInt(t.data.index) + 1
            },
            method: 'post',
            success: (res) => {
              wx.hideLoading();
              if (res.data.code == 0) {
                t.setData({index: res.data.data})
                t.onLoad();
              } else {
                app.util.showToast(res.data.msg, 'error');
              }
            }
          })
        }
      }
    })
  },
  
  setEnd(){
    let t = this;
    wx.showModal({
      confirmColor: theme.action,
      title: '提示',
      content: '确定所有选手已经展示完毕了吗！？',
      complete: (res) => {
        if (res.confirm) {
          wx.showLoading()
          app.util.request({
            url: 'score/index',
            data: {
              user_id: t.data.userinfo.id,
              index: -1
            },
            method: 'post',
            success: (res) => {
              wx.hideLoading();
              if (res.data.code == 0) {
                t.setData({index: -1})
                t.onLoad();
              } else {
                app.util.showToast(res.data.msg, 'error');
              }
            }
          })
        }
      }
    })
  },
  
  setStart(){
    let t = this;
    wx.showModal({
      confirmColor: theme.action,
      title: '提示',
      content: '确定要重新开始吗！？',
      complete: (res) => {
        if (res.confirm) {
          wx.showLoading()
          app.util.request({
            url: 'score/index',
            data: {
              user_id: t.data.userinfo.id,
              index: 0
            },
            method: 'post',
            success: (res) => {
              wx.hideLoading();
              if (res.data.code == 0) {
                t.setData({index: 0})
                t.onLoad();
              } else {
                app.util.showToast(res.data.msg, 'error');
              }
            }
          })
        }
      }
    })
  },
})