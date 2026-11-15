const theme = require('../../utils/theme.js');
import Toast from '@vant/weapp/toast/toast';
import tool from '../../utils/tool.js'
const app = getApp()
Page({
  data: {
    app: app,
    amount: '',
    userinfo: {},
    shop: {},
  },
  save() {
    return new Promise((resolve, reject) => {
      let t = this
      let amount = t.data.amount;
      if (amount == undefined || amount == null || amount == '' || amount < 0) {
        app.util.showToast("请输入正确的提现金额")
        return reject();
      }
      amount = parseFloat(amount);
      if (amount > parseFloat(t.data.shop.balance)) {
        app.util.showToast("余额不足")
        return reject();
      }
      wx.showModal({
        confirmColor: theme.action,
        title: '提现确认',
        content: '当前提现金额 '+amount+' 元',
        complete: (res) => {
          if (res.confirm) {
            app.util.request({
              url: "shop_withdraw/apply",
              method: 'post',
              data: {
                shop_id: t.data.shop.id,
                amount: amount
              },
              success(res) {
                if (res.data.code == 0) {
                  app.util.showToast(res.data.msg)
                  t.setData({
                    amount: ''
                  })
                  t.initialization();
                  return resolve();
                } else {
                  app.util.showToast(res.data.msg)
                  return reject();
                }
              },
              fail(error) {
                app.util.showToast('操作失败')
                return reject();
              }
            })
          }
        }
      })
    })
  },
  async initialization() {
    let t = this;
    app.util.checkLogin(function(){
      app.util.request({
        url: "shop/getInfo",
        method: 'post',
        data: {shop_id:t.data.shop.id},
        success(res) {
          if (res.data.code == 0) {
            let shop = res.data.data
            shop.balance = app.util.setPrice(shop.balance);
            t.setData({shop:shop})
          }
        },
        fail(error) {
          app.util.showToast()
          return reject();
        }
      })
    })
  },
  // 返回上一页
  onClickLeft() {
    wx.navigateBack();
  },
  //跳转页面
  goto(e) {
    wx.navigateTo({
      url: e.currentTarget.dataset.url
    })
  },
  onLoad() {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({
        shop: wx.getStorageSync('shop'),
        userinfo: wx.getStorageSync('userinfo')
      })
      t.initialization()
    })
  },
  onShow() {
    if (this.data.shop && this.data.shop.id > 0) {
      this.initialization()
    }
  },
})