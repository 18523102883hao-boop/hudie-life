const app = getApp()
Page({
  data: {
    app: app,
    page: 1,
    size: 10,
    list: [],
    isEnd: false,
    loading: false,
    i: 1
  },
  getUserInfo() {
    let t = this;
    app.util.request({
      url: 'user/getInfo',
      data: {a:1},
      method: 'post',
      success: (res) => {
        let userinfo = res.data.data;
        wx.setStorageSync('userinfo', userinfo)
        userinfo.mobile = userinfo.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
        userinfo.coin = app.util.setPrice(userinfo.coin);
        userinfo.p = parseInt(userinfo.check_in_num/7);
        if (new Date(userinfo.check_in_date).getTime() + 86400000 < new Date(userinfo.today).getTime()) {
          userinfo.check_in_num = 0;
        }
        t.setData({userinfo: userinfo});
      }
    });
  },
  onLoad(options) {
    this.getUserInfo();
  },
  find(e) {
    let { i } = e.currentTarget.dataset
    let t = this
    t.setData({
      i,
      page:1,
      size:10,
      list:[],
      isEnd:false
    })
    t.getFindList()
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (wx.getStorageSync('userinfo') == undefined || wx.getStorageSync('userinfo') == '' || wx.getStorageSync('userinfo') == null) {
      app.switchTab('/pages/switch/login')
    }
    let t = this
    t.getFindList()
  },
  getFindList() {
    let t = this
    app.util.request({
      url: 'user/getIntegralDetails',
      method: 'post',
      data: {
        user_id: wx.getStorageSync('userinfo').id,
        page: t.data.page,
        limit: t.data.size
      },
      success(res) {
        if (res.data.code == 0) {
          let reqList = res.data.data // 新数据
          for (let k in reqList) {
            reqList[k].integral = reqList[k].integral;
          }
          let oldList = t.data.list  // 旧数据
          // 新数据长度为 0 的时候便是最后一页
          var len = reqList.length;
          if (len < t.data.size) {
            t.setData({
              isEnd: true // 所有数据加载完毕
            })
            if (reqList.length === 0) {
              return app.util.showToast('没有更多数据了');
            }
          }
          // 赋值
          t.setData({
            list: oldList.concat(reqList) // 新数据拼接到旧数据
          })
        }
      }
    })
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    let t = this
    t.setData({
      page: 1,
      size: 10,
      list: [],
      isEnd: false
    })
  },
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    let t = this
    t.setData({
      page: 1,
      size: 10,
      list: [],
      isEnd: false
    })
  },
  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    let t = this
    let page = t.data.page
    // 数据是否全部加载完毕
    if (!t.data.isEnd) {
      t.setData({
        page: ++page
      })
      setTimeout(() => {
        t.getFindList() // 加载新数据
      }, 500)
    }
  },
})