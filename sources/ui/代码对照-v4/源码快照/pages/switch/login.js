const app = getApp()
const qiniu = require('../../utils/qiniu')
import tool from '../../utils/tool.js'
var that;
Page({
  data: {
    app:app,
    show: false,
    url: '', //临时路径
    avatarUrl: app.domain+'static/img/head.jpg', //头像
    nick: '雀小满', //用户名
    id: '', //用户id
    phone: '',
    type: '',
    state: '',
    openId: '',
    show_sub:0
  },
  closeSub(){
    this.setData({show_sub:0})
    app.switchTab('/pages/index/index');
  },
  back(){
    app.back()
  },
  toIndex(){
    app.switchTab('/pages/index/index')
  },
  //切换 tips  的show状态
  showChange() {
    let t = this
    t.setData({
      show:!t.data.show
    })
  },
  applyAgent(){
    let t = this;
    let userinfo = t.data.userinfo;
    if (t.data.scene == 'reg' && userinfo.is_agent < 2 && userinfo.mobile) {
    } else {
      return false;
    }
    app.util.request({
      url: 'user/applyAgent',
      data: {a:1},
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          if (res.data.data) {
            // app.util.showToast('团长申请已提交成功，客服将尽快审核~！', 1000);
            setTimeout(function(){
              t.setData({show_sub:1})
            }, 1000)
          }
        } else {
          app.util.showToast(res.data.msg);
        }
      }
    });
  },
  //授权用户手机号
  getPhoneNumber(e) {
    var that = this;
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      return;
    }
    app.util.request({
      url: 'login/getPhone',
      data: {
        code: e.detail.code,
        pid: that.data.pid
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          that.setData({
            phone: res.data.data.phoneNumber
          })
          wx.setStorageSync('userinfo', res.data.data)
          that.setData({userinfo: res.data.data})
          that.applyAgent();
          let pages = getCurrentPages();
          let prevPage = pages[pages.length - 2];
          prevPage.setData({
            execShow: true
          })
          setTimeout(() => {
            that.back();
          }, 1000);
        } else {
          app.util.showToast(res.data.msg);
        }
      }
    })
  },
  insertUser: tool.debounce(function () {
    let t = this
  }),
  onChooseAvatar(e) {
    const {
      avatarUrl
    } = e.detail
    that.srcimg(avatarUrl);
  },
  srcimg(url) {
    app.util.request({
      url: 'qiNiu/file/upload',
      method: 'get',
      success: (res) => {
        if (res.data.code == 0) {
          var options = {
            region: res.data.data.region,
            uptoken: res.data.data.token,
            domain: res.data.data.domain,
          }
          const tempFilePaths = url;
          qiniu.init(
            options
          );
          qiniu.upload({
            filePath: tempFilePaths,
            success(qiniures) {
              wx.hideLoading();
              that.setData({
                avatarUrl: qiniures.fileURL
              });
            },
            fail(qiniures) {
              app.util.showToast('上传失败!');
            },
          });
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let t = this;
    if (options.pid) {
      t.setData({pid:options.pid});
    }
    if (options.scene) {
      t.setData({scene:options.scene});
    }
    app.util.checkLogin(function(){
      let userinfo = wx.getStorageSync('userinfo');
      t.setData({
        userinfo: userinfo,
        state: options.state ? options.state : ''
      })
      t.applyAgent();
      t.select(options.type);
    })
  },
  /**
   * 顺序执行
   */
  async select(type) {
    await this.selectUser(type)
  },
  selectUser(type) {
    return new Promise((resolve, reject) => {
      if (type == 2) {
        let account = wx.getStorageSync('account');
        that.setData({
          id: account.id,
          avatarUrl: account.avatar,
          nick: account.nickName,
          phone: account.phone,
          type: type
        })
      } else {
        wx.hideHomeButton();
      }
      return resolve();
    })
  },
  getFindLogin() {
    wx.login({
      success(res) {
        if (res.code) {
          app.util.request({
            url: 'login/login',
            data: {
              code: res.code
            },
            method: 'post',
            success: (res) => {
              if (res.data.code == 0) {
                wx.setStorageSync('userinfo', res.data.data)
              }
            }
          })
        }
      }
    })
  }
})