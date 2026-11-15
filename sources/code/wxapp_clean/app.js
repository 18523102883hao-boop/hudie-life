//引入小程序cookie支持
// import 'weapp-cookie'
var util = require('./utils/util');
App({
  util: util,
  name: '蝴蝶优选',
  share_img: 'static/img/share-img.jpg?t=1',
  domain: "https://m.kttkj.com/",
  userinfo: '',
  customBar: 0,
  customer: {},
  globalData: {
    checkLogin: false,
    navBarHeight: 0, // 导航栏高度
    menuBottom: 0, // 胶囊距底部间距（顶部间距也是这个）
    menuHeight: 0, // 胶囊高度
    menuRight: 0, // 胶囊距右方间距（方保持左、右间距一致）
    windowHeight: 0,
    windowWidth: 0,
    screenWidth: 0,
    imgSrc: '',
    index: '',
    indexb: '',
    scene: 0
  },
  onShow(){
    let res = wx.getLaunchOptionsSync();
    this.globalData.scene = res.scene;
  },
  onLaunch: function () {
    let t = this
    let systemSetting = wx.getWindowInfo()
    let info = wx.getMenuButtonBoundingClientRect()
    let CustomBar = info.bottom + info.top - systemSetting.statusBarHeight
    t.customBar = CustomBar
    
    t.setNavBarInfo()
    //查询是否登录
    t.getLogin()
    setTimeout(() => {
      util.check_update();
    }, 300)
  },
  getLogin(){
    let t = this;
    var userinfo = wx.getStorageSync('userinfo');
    if (!userinfo || userinfo.id == undefined || userinfo.id == 0) {
      wx.login({
        success: (res) => {
          if (res.code) {
            util.request({
              url: 'login/login',
              data: {
                code: res.code
              },
              method: 'post',
              success(res) {
                if (res.data.code == 0) {
                  t.globalData.do_request = true;
                  res.data.data.last_time = new Date().getTime();
                  wx.setStorageSync('userinfo', res.data.data)
                }
              }
            })
          }
        },
      })
    } else if (userinfo.last_time < new Date().getTime() - 1800000) {
      util.request({
        url: 'user/getInfo',
        data: {
          id: userinfo.id
        },
        method: 'post',
        success(res) {
          if (res.data.code == 0) {
            res.data.data.last_time = new Date().getTime();
            wx.setStorageSync('userinfo', res.data.data)
          }
        }
      })
    }
  },
  bindPid(user_id){
    let userinfo = wx.getStorageSync('userinfo');
    if (userinfo.is_agent > 1 || userinfo.pid > 0) {
      return false;
    }
    util.request({
      url: 'user/bindPid',
      data: {
        user_id: user_id
      },
      method: 'post',
      success(res) {
        if (res.data.code == 0 && res.data.data !== false) {
          wx.setStorageSync('userinfo', res.data.data)
        }
      }
    })
  },
  back(){
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    if (prevPage === undefined) {
      wx.redirectTo({
        url: '/pages/index/index',
      })
    } else {
      wx.navigateBack();
    }
  },
  switchTab(e, selected) {
    let url='';
    if (selected == 999) {
      return wx.redirectTo({
        url: e,
      })
    } else if (typeof e == 'string') {
      url = e;
      if (e.indexOf('?') > -1) {
        return wx.navigateTo({
          url: e,
        })
      }
    } else {
      const data = e.currentTarget.dataset
      if (data.index == selected) {
        return false;
      }
      url = data.path
    }
    let pages = getCurrentPages();
    let len = pages.length;
    var flag = true;
    var n=1;
    for (let i=len-2;i>=0;i--) {
      if ('/'+pages[i].route == url) {
        wx.navigateBack({delta:n});
        flag = false;
        return false;
      }
      n++;
    }
  
    if (flag) {
      return wx.navigateTo({
        url: url,
      })
    }
  },
  setNavBarInfo() {
    const systemInfo = wx.getWindowInfo();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    this.globalData.windowWidth = systemInfo.windowWidth
    this.globalData.windowHeight = systemInfo.windowHeight
    this.globalData.navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height + systemInfo.statusBarHeight;
    this.globalData.menuBotton = menuButtonInfo.top - systemInfo.statusBarHeight;
    this.globalData.menuRight = systemInfo.screenWidth - menuButtonInfo.right;
    this.globalData.screenWidth = systemInfo.screenWidth;
    this.globalData.menuHeight = menuButtonInfo.height;
  },
  request(url, data, ajax) {
    return new Promise((resolve, reject) => {
      util.request({
        url,
        method: ajax,
        data,
        success(res) {
          resolve(res)
        },
        fail(err) {
          reject(err)
        }
      })
    })
  },
})