const app = getApp()
import tool from '../../utils/tool.js'
Page({
  data: {
    app: app,
    account:'',
    password:'',
    show: 0,
    sec: 0
  },
  back() {
    wx.navigateBack()
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({url:decodeURIComponent(options.url)});
      t.getCaptcha();
    })
  },
  getCaptcha() {
    let t = this;
    app.util.request({
      url:'index/getCaptcha',
      method: 'post',
      data: {a:1},
      success(res) {
        t.setData({captcha:res.data})
      }
    })
  },
  getCode() {
    let t = this;
    if (!t.data.mobile) {
      return app.util.showToast('请输入手机号');
    }
    if (!/^1[3-9]\d{9}$/.test(t.data.mobile)) {
      return app.util.showToast('手机号格式错误');
    }
    if (!t.data.img_code) {
      return app.util.showToast('请输入图形验证码');
    }
    app.util.request({
      url:'index/getSmsCode',
      method: 'post',
      data: {
        mobile: t.data.mobile,
        code: t.data.img_code,
        uniqid: t.data.captcha.uniqid,
        type: 1
      },
      success(res) {
        if (res.data.code == 0) {
          //发送成功
          t.setData({sec:60,code:res.data.data});
          var it = setInterval(function(){
            t.setData({sec:t.data.sec-1});
            if (t.data.sec <= 0) {
              clearInterval(it);
            }
          }, 1000);
        } else {
          //发送失败
          app.util.showToast(res.data.msg);
        }
        t.getCaptcha();
      }
    })
  },
  login() {
    let t = this 
    if(!t.data.mobile) {
      return app.util.showToast('手机号为空!');
    }
    if (!/^1[3-9]\d{9}$/.test(t.data.mobile)) {
      return app.util.showToast('手机号格式错误');
    }
    if(!t.data.code) {
      return app.util.showToast('短信验证码为空!');
    }
    wx.showLoading();
    app.util.request({
      url:'user/bindMobile',
      method: 'post',
      data: {
        mobile: t.data.mobile,
        code: t.data.code
      },
      success(res) {
        wx.hideLoading()
        if (res.data.code == 0) {
          app.util.showToast(res.data.msg, 1500, 'success');
          wx.setStorageSync('userinfo', res.data.data)
          setTimeout(function(){
            if (t.data.url) {
              if (res.data.data.landlord_id > 0) {
                wx.navigateBack();
              } else {
                wx.redirectTo({url:t.data.url});
              }
            } else {
              wx.navigateBack();
            }
          }, 1200)
        } else {
          app.util.showToast(res.data.msg, 1500);
        }
      },
      fail (err) {
        wx.hideLoading()
      }
    })
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: app.name,
      path: '/pages/index/index',
      imageUrl: app.domain + app.share_img
    }
  }
})