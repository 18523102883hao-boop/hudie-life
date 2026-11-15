const app = getApp();
Page({
  data: {
    app: app,
    check_arr:[1,2,3,4,5,6,7],
    userinfo: {}
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
        console.log(t.data.userinfo)
      }
    });
  },
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.getUserInfo();
    })
  },
  checkin(){
    var t = this;
    if (t.data.userinfo.is_check == 1 || t.data.checking == 1) {
      return false;
    }
    t.setData({checking:1});
    app.util.request({
      url: 'user/checkin',
      data: {
        a: 1
      },
      method: 'post',
      success(res) {
        if (res.data.code == 0) {
          var userinfo = t.data.userinfo;
          userinfo.integral = parseInt(userinfo.integral) + parseInt(res.data.data);
          userinfo.check_in_num = parseInt(userinfo.check_in_num + 1);
          userinfo.is_check = 1;
          t.setData({
            userinfo: userinfo
          })
        } else {
          t.setData({checking:0});
          if (res.data.msg == 'false') {
            t.getUserInfo();
          } else {
            app.util.showToast(res.data.msg);
          }
        }
      }
    })
  },
})