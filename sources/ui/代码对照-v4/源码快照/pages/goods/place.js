const theme = require('../../utils/theme');
const app = getApp();
Page({
  data: {
    app: app,
    is_place: 0,
    goods: {},
    name: '',
    mobile: '',
    remark: '',
    idcard: '',
    playdate: '',
    area: '',
    ssq: ''
  },
  checkRule(e){
    this.setData({check_rule:e.detail.value[0]})
  },
  onLoad(options) {
    let t = this;
    t.setData({goods_id:options.id,reward_id:options.reward_id});
    app.util.checkLogin(function(){
      let userinfo = wx.getStorageSync('userinfo')
      t.setData({userinfo:userinfo,mobile:userinfo.mobile});
      t.getGoods();
    });
  },
  ssq() {
    let t = this
    if (t.data.showLoading) {
      return false;
    }
    t.setData({
      showLoading: true
    })
    wx.chooseLocation({
      success(res) {
        t.setData({
          ssq: res.address,
          area: res.name,
          showLoading: false
        })
      }
    })
  },
  bindDateChange(e){
    this.setData({playdate:e.detail.value})
  },
  getIntegral(){
    let t = this;
    app.util.request({
      url: 'user/getIntegral',
      data: {a: 1},
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let integral = res.data.data;
          let goods = t.data.goods;
          let ca = parseInt(goods.sale_price * 100) - parseInt(goods.min_price * 100);
          if (ca <= 0) {
            //已经到最低价，不可使用积分
            integral = 0;
          } else if (ca > 500) {
            integral = integral >= 500 ? 500 : integral;
          } else {
            integral = integral >= ca ? ca : integral;
          }
          t.setData({
            integral: integral,
            deduct_amount: app.util.setPrice(integral)
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  getGoods() {
    let t = this;
    app.util.request({
      url: 'goods/getInfo',
      data: {
        id: t.data.goods_id,
        is_place: 1
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          res.data.data.sale_price = app.util.delDotZero((res.data.data.price - res.data.data.cut_amount).toFixed(2));
          t.setData({
            goods: res.data.data,
            total_amount: res.data.data.sale_price
          })
          if (res.data.data.need_idcard) {
            t.setData({name: ''})
          } else {
            t.setData({name: t.data.userinfo.nickname})
          }
          if (res.data.data.need_playdate) {
            t.setData({min_date: app.util.formatDate(new Date(new Date().getTime() + 86400000*res.data.data.forward_days), 'yyyy-MM-dd')})
          }
          t.getIntegral();
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  toPay(){
    let t = this;
    if (!t.data.goods || !String(t.data.goods.title || '').trim()) {
      return app.util.showToast('商品名称未加载，请稍后重试', 1500);
    }
    if (wx.getStorageSync('userinfo').mobile == '') {
      app.util.showToast('请先授权绑定手机号', 1500);
      setTimeout(function(){
        app.switchTab('/pages/switch/login')
      }, 1000)
      return
    }
    if (!t.data.check_rule) {
      return app.util.showToast('请先认真阅读购买须知', 1500);
    }
    if (t.data.name == '') {
      return app.util.showToast('请输入姓名', 1500);
    }
    if (t.data.mobile == '') {
      return app.util.showToast('请输入手机号', 1500);
    }
    if (t.data.goods.is_virtual == 2) {
      if (t.data.ssq == '') {
        return app.util.showToast('请选择收货地址', 1500);
      }
      if (t.data.area == '') {
        return app.util.showToast('请输入门牌号', 1500);
      }
    }
    if (t.data.goods.need_idcard && t.data.idcard == '') {
      return app.util.showToast('请输入身份证号', 1500);
    }
    if (t.data.goods.need_playdate && t.data.playdate == '') {
      return app.util.showToast('请选择游玩日期', 1500);
    }
    if (t.data.is_place == 1) {
      return false;
    }
    t.setData({is_place: 1})
    wx.showLoading()
    app.util.request({
      url: 'order/place',
      data: {
        reward_id: t.data.reward_id,
        goods_id: t.data.goods.id,
        use_integral: t.data.use_integral,
        name: t.data.name,
        mobile: t.data.mobile,
        idcard: t.data.idcard,
        ssq: t.data.ssq,
        addr: t.data.area,
        playdate: t.data.playdate,
        remark: t.data.remark,
      },
      method: 'post',
      success(res) {
        wx.hideLoading();
        t.setData({is_place:0})
        if (res.data.code == 0) {
          if (res.data.data.status == 2) {
            app.util.showToast(res.data.msg, '', 'success');
            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/order/info?id='+res.data.data.order_id,
              })
            }, 1000);
          } else {
            let order_id = res.data.data.order_id;
            wx.requestPayment({
              timeStamp: res.data.data.timeStamp,
              nonceStr: res.data.data.nonceStr,
              package: res.data.data.package,
              signType: res.data.data.signType,
              paySign: res.data.data.paySign,
              success() {
                app.util.showToast('支付成功！', '', 'success');
                setTimeout(() => {
                  wx.redirectTo({
                    url: '/pages/order/info?id='+order_id,
                  })
                }, 1000);
              },
              fail(err) {
                app.util.request({
                  url: 'order/cancel',
                  data: {
                    id: order_id
                  },
                  method: 'post'
                });
                app.util.showToast('支付取消！');
              },
            })
          }
        } else {
          wx.showModal({
            confirmColor: theme.action,
            title: '提示',
            content: res.data.msg
          })
        }
      },
      fail(err) {
        wx.hideLoading()
      }
    })
  },
  useIntegral(e){
    let t = this;
    let total_amount = app.util.delDotZero((t.data.goods.sale_price - t.data.deduct_amount).toFixed(2));
    if (total_amount < t.data.goods.min_price) {
      total_amount = t.data.goods.min_price;
    }
    if (!e.detail.value[0]) {
      total_amount = t.data.goods.sale_price;
    }

    t.setData({
      use_integral:e.detail.value[0],
      total_amount: total_amount
    })
  }
})
