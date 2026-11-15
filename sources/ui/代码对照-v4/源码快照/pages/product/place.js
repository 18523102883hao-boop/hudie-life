const theme = require('../../utils/theme');
const app = getApp();
Page({
  data: {
    app: app,
    is_place: 0,
    goods: {},
    userinfo: {},
    num: 1,
    total_price: 0,
    unit_price: 0,
    name: '',
    mobile: '',
    remark: '',
    idcard: '',
    playdate: '',
    area: '',
    ssq: ''
  },
  dec(){
    let t = this;
    let num = t.data.num;
    num = num <= 1 ? 1 : (num-1);
    t.setData({num: num})
    t.calcPrice();
  },
  checkRule(e){
    this.setData({check_rule:e.detail.value[0]})
  },
  add(){
    let t = this;
    if (t.data.reward_id) {
      return;
    }
    let num = t.data.num + 1;
    if (num > t.data.goods.stock) {
      num = t.data.goods.stock;
    }
    let max_num = 10;
    if (t.data.goods.limit_buy_num > 0) {
      max_num = t.data.goods.limit_buy_num - t.data.goods.self_buy_num;
    }
    if (max_num > t.data.goods.limit_buy_order_num && t.data.goods.limit_buy_order_num > 0) {
      max_num = t.data.goods.limit_buy_order_num;
    }
    if (max_num < num) {
      num = max_num
    }
    t.setData({num: num})
    t.calcPrice();
  },
  calcPrice(){
    let t = this;
    const goods = t.data.goods;
    const price = goods.subsidy_price == null ? goods.price : goods.subsidy_price;
    // 先将元转为整数分，再乘数量，避免金额出现浮点尾数。
    const cents = Math.round(Number(price) * 100);
    t.setData({unit_price: (cents / 100).toFixed(2), total_price: (cents * t.data.num / 100).toFixed(2)});
  },
  onLoad(options) {
    let t = this;
    t.setData({goods_id:options.id,reward_id:options.reward_id});
    app.util.checkLogin(function(){
      let userinfo = wx.getStorageSync('userinfo');
      t.setData({
        userinfo: userinfo,
        // name: userinfo.nickname,
        mobile: userinfo.mobile
      });
      t.getGoods();
    });
  },
  getGoods() {
    let t = this;
    app.util.request({
      url: 'product/getInfo',
      data: {
        id: t.data.goods_id,
        is_place: 1
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let goods = res.data.data;
          t.setData({
            goods: goods
          })
          t.calcPrice();
          if (goods.limit_buy_num > 0 && goods.limit_buy_num <= goods.self_buy_num) {
            wx.showModal({
              confirmColor: theme.action,
              title: '提示',
              content: '该产品每人限购'+goods.limit_buy_num+'份，您已购买'+goods.self_buy_num+'份，当前不可再次购买~！',
              showCancel: false,
              complete: (res) => {
                if (res.confirm) {
                  wx.redirectTo({
                    url: '/pages/product/index',
                  })
                }
              }
            })
          }
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
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
      url: 'order_seckill/place',
      data: {
        reward_id: t.data.reward_id,
        goods_id: t.data.goods.id,
        num: t.data.num,
        name: t.data.name,
        mobile: t.data.mobile,
        remark: t.data.remark,
        idcard: t.data.idcard,
        ssq: t.data.ssq,
        addr: t.data.area,
        playdate: t.data.playdate,
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
                url: '/pages/order_seckill/info?id='+res.data.data.order_id,
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
                    url: '/pages/order_seckill/info?id='+order_id,
                  })
                }, 1000);
              },
              fail(err) {
                app.util.request({
                  url: 'order_seckill/cancel',
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
            content: res.data.msg,
            showCancel: false
          })
        }
      },
      fail(err) {
        wx.hideLoading()
      }
    })
  },
})
