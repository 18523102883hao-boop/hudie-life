const app = getApp()
import Toast from '@vant/weapp/toast/toast';
import tool from '../../utils/tool.js'
Page({
  data: {
    app:app,
    show: false,
    url: '', //临时路径
    avatarUrl: app.domain+'static/img/head.jpg', //头像
    nick: '', //用户名
    id: '', //用户id
    phone: '',
    phoneLoading: false,
    type: '',
    state: '',
    openId: ''
  },
  back(){
    wx.navigateBack()
  },
  // 通过微信授权绑定或更换手机号，成功后立即保存。
  getPhoneNumber(e) {
    if (this.data.phoneLoading) return;
    const detail = e.detail || {};
    if (detail.errMsg !== 'getPhoneNumber:ok') {
      app.util.showToast('未完成手机号授权，可重新点击授权');
      return;
    }
    if (!detail.code) {
      app.util.showToast('未获取到授权凭证，请重试');
      return;
    }
    const hadPhone = !!this.data.phone;
    this.setData({phoneLoading: true});
    app.util.request({
      url: 'login/getPhone',
      method: 'post',
      noCache: true,
      data: {code: detail.code},
      success: (res) => {
        const result = res.data || {};
        if (result.code != 0 || !result.data || !result.data.mobile) {
          app.util.showToast(result.msg || '手机号绑定失败，请重试');
          return;
        }
        const userinfo = Object.assign({}, wx.getStorageSync('userinfo') || {}, result.data);
        wx.setStorageSync('userinfo', userinfo);
        this.setData({phone: userinfo.mobile});
        app.util.showToast(hadPhone ? '手机号修改成功' : '手机号绑定成功');
      },
      fail: () => {
        app.util.showToast('网络异常，请稍后重试');
      },
      complete: () => {
        this.setData({phoneLoading: false});
      }
    });
  },
  //切换 tips  的show状态
  showChange() {
    let t = this
    t.setData({
      show:!t.data.show
    })
  },
  insertUser: tool.debounce(function () {
    let t = this
    var userinfo = wx.getStorageSync('userinfo');
    wx.showLoading()
    app.util.request({
      url: 'user/saveInfo',
      data: {
        img: t.data.avatarUrl,
        nickname: t.data.nick
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          userinfo.img = t.data.avatarUrl;
          userinfo.nickname = t.data.nick;
          wx.setStorageSync('userinfo', userinfo)
          app.util.showToast(res.data.msg)
          setTimeout(() => {
            wx.navigateBack()
          }, 1000);
        } else {
          wx.hideLoading()
          app.util.showToast('操作异常!');
        }
      }
    })
  }),
  onChooseAvatar(e) {
    let t = this;
    const {
      avatarUrl
    } = e.detail
    t.srcimg(avatarUrl);
  },
  srcimg(url) {
    let t = this;
    Toast.loading({
      message: '加载中...',
      forbidClick: true,
      loadingType: 'spinner',
    });
    let headers = {
      token: wx.getStorageSync('userinfo').openid,
      'mini-program': 'wechat_mini'
    }
    wx.uploadFile({
      url: app.domain + "index/upload",
      method: 'POST',
      header: headers,
      filePath: url,
      name: 'file',
      formData: {},
      fail(res){
        console.log('fail',res);
      },
      // 成功回调
      success(res) {
        // JSON.parse()方法是将JSON格式字符串转换为js对象
        var result = JSON.parse(res.data);
        t.setData({
          avatarUrl: result.data.src
        });
        wx.hideLoading();//停止loading
      },
    });
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({
        state: options.state
      })
      t.selectUser(2)
    })
  },
  selectUser(type) {
    let t = this;
    return new Promise((resolve, reject) => {
      if (type == 2) {
        let account = wx.getStorageSync('userinfo');
        t.setData({
          id: account.id,
          avatarUrl: account.img,
          nick: account.nickname,
          phone: account.mobile,
          type: type
        })
      } else {
        wx.hideHomeButton();
      }
      return resolve();
    })
  },
})
