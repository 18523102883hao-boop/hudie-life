const theme = require('../../utils/theme');
import Toast from '@vant/weapp/toast/toast';
import tool from '../../utils/tool.js'
const app = getApp()
Page({
  data: {
    app: app,
    amount: '',
    userinfo: {},
    ruleReady: false,
    ruleError: false
  },
  closeSub(){
    this.setData({show_sub:0})
  },
  // save: tool.debounce(function () {
  //   let t = this
  //   t.save2();
  // }),
  // 上传
  save() {
    return new Promise((resolve, reject) => {
      let t = this
      let amount = t.data.amount;
      if (amount == undefined || amount == null || amount == '' || amount <= 0) {
        app.util.showToast("请输入正确的提现金额")
        return reject();
      }
      amount = parseFloat(amount);
      if (amount > parseFloat(t.data.userinfo.coin)) {
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
              url: "withdraw/apply",
              method: 'post',
              data: {
                amount: amount
              },
              success(res) {
                if (res.data.code == 0) {
                  // app.util.showToast(res.data.msg)
                  t.setData({
                    amount: '',
                    show_sub: 1,
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
    t.setData({ruleReady:false,ruleError:false});
    app.util.checkLogin(function(){
      app.util.request({
        url: "user/getInfo",
        method: 'post',
        data: {a:1},
        success(res) {
          if (res.data.code == 0) {
            let userinfo = res.data.data
            wx.setStorageSync('userinfo', userinfo);
            userinfo.coin = app.util.setPrice(userinfo.coin);
            t.setData({userinfo:userinfo,ruleReady:true,ruleError:false})
          } else {
            t.setData({ruleReady:true,ruleError:true})
          }
        },
        fail(error) {
          console.log(error);
          t.setData({ruleReady:true,ruleError:true})
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
  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.initialization()
  },
})
