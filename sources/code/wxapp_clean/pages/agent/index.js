const theme = require('../../utils/theme');
const app = getApp()
Page({
  data: {
    app: app,
    tar_bar: 0,
    name: '',
    info: {},
    phones:'',
    showCustomer: false,
    customer: [],
    index: 1,
    list: [],
    user_list: [],
    limit: 10,
    is_end_order: 0,
    is_end_user: 0,
    loading: 0,
  },
  toWithdraw(){
    app.switchTab('/pages/agent/withdraw')
  },
  getOrderList() {
    let t = this;
    if (t.data.loading || t.data.is_end_order) {
      return false;
    }
    t.setData({loading: 1});
    app.util.request({
      url: 'order/getListAgent',
      data: {
        page: t.data.list.length / t.data.limit + 1,
        limit: t.data.limit,
      },
      method: 'post',
      success: (res) => {
        t.setData({loading: 0});
        if (res.data.code == 0) {
          let list = res.data.data;
          for (let k in list) {
            list[k].commission = app.util.setPrice(list[k].commission)
          }
          let is_end_order = 0;
          if (list.length < t.data.limit) {
            is_end_order = 1;
          }
          t.setData({
            list: t.data.list.concat(list),
            is_end_order: is_end_order
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  getUserList() {
    let t = this;
    if (t.data.loading || t.data.is_end_user) {
      return false;
    }
    t.setData({loading: 1});
    app.util.request({
      url: 'user/getUserList',
      data: {
        page: t.data.user_list.length / t.data.limit + 1,
        limit: t.data.limit,
      },
      method: 'post',
      success: (res) => {
        t.setData({loading: 0});
        if (res.data.code == 0) {
          let list = res.data.data;
          let is_end_user = 0;
          if (list.length < t.data.limit) {
            is_end_user = 1;
          }
          t.setData({
            user_list: t.data.user_list.concat(list),
            is_end_user: is_end_user
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  
  getCommissionStat() {
    let t = this;
    app.util.request({
      url: 'user/getCommissionStat',
      data: {a:1},
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let commission_stat = res.data.data;
          commission_stat.today.coin = app.util.setPrice(commission_stat.today.coin)
          commission_stat.yesterday.coin = app.util.setPrice(commission_stat.yesterday.coin)
          commission_stat.week.coin = app.util.setPrice(commission_stat.week.coin)
          commission_stat.month.coin = app.util.setPrice(commission_stat.month.coin)
          t.setData({
            commission_stat: commission_stat
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  onPullDownRefresh(){
    let t = this;
    t.getUserInfo();
    t.setData({
      list: [],
      user_list: [],
      is_end_order: 0,
      is_end_user: 0,
      loading: 0,
    })
    if (t.data.index == 2) {
      t.getOrderList();
    } else if (t.data.index == 3) {
      t.getUserList();
    }
    wx.stopPullDownRefresh();
  },
  onReachBottom(){
    let t = this;
    if (t.data.index == 2) {
      t.getOrderList();
    } else if (t.data.index == 3) {
      t.getUserList();
    }
  },
  selIndex(e){
    let t = this;
    let index = e.currentTarget.dataset.index;
    if (index == t.data.index) {
      return false;
    }
    t.setData({index: index})
    if (index == 2 && t.data.list.length <= 0) {
      t.getOrderList();
    } else if (index == 3 && t.data.user_list.length <= 0) {
      t.getUserList();
    }
  },
  callTel(e){
    let t = this;
    wx.makePhoneCall({
      phoneNumber: t.data.customer_tel,
      success(res){
        t.setData({
          showCustomer: false
        })
      }
    })
  },
  back(){
    app.back()
  },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  toPage(e) {
    app.switchTab(e.currentTarget.dataset.page)
  },
  getCustomerTel() {
    let t = this;
    app.util.request({
      url: 'index/getCustomerTel',
      data: {a:1},
      method: 'post',
      success: (res) => {
        t.setData({customer_tel: res.data.data});
      }
    });
  },
  onLoad(options){
    let t = this;
    let index = options.index ? options.index : 1;
    t.setData({index: index})
    if (index == 2 && t.data.list.length <= 0) {
      t.getOrderList();
    } else if (index == 3 && t.data.user_list.length <= 0) {
      t.getUserList();
    }
    t.getCustomerTel()
  },
  getUserInfo() {
    let t = this;
    app.util.request({
      url: 'user/getInfo',
      data: {a:1},
      method: 'post',
      success: (res) => {
        let userinfo = res.data.data;
        if (userinfo.is_agent == 1) {
          return wx.redirectTo({
            url: '/pages/mine/mine',
          })
        }
        userinfo.coin = app.util.setPrice(userinfo.coin);
        t.setData({userinfo: userinfo});
        t.getAgentStat();
        t.getCommissionStat();
        // t.getUserList();
      }
    });
  },
  tipCoin(){
    wx.showModal({
      confirmColor: theme.action,
      title: '提示',
      content: '用户到店核销后可获得蝴蝶币',
      showCancel: false,
      confirmText: '我知道了'
    })
  },
  tipExchanged(){
    wx.showModal({
      confirmColor: theme.action,
      title: '已兑现金额说明',
      content: '已兑现金额 = 自购省的金额 + 佣金提现金额',
      showCancel: false,
      confirmText: '我知道了'
    })
  },
  tipWithdrawing(){
    wx.showModal({
      confirmColor: theme.action,
      title: '提示',
      content: '申请兑现后需等待客服审核',
      showCancel: false,
      confirmText: '我知道了'
    })
  },
  getAgentStat() {
    let t = this;
    app.util.request({
      url: 'user/getAgentStat',
      data: {get_coin:1},
      method: 'post',
      success: (res) => {
        let stat = res.data.data;
        let rawExchanged = parseFloat(stat.exchanged) || 0;
        let rawWithdrew = parseFloat(stat.withdrew) || 0;
        stat.total = app.util.setPrice(t.data.userinfo.coin*100 + parseInt(stat.withdrew) + parseInt(stat.withdrawing));
        stat.coin = app.util.setPrice(stat.coin);
        stat.min_withdraw = app.util.setPrice(stat.min_withdraw);
        stat.withdrew = app.util.setPrice(stat.withdrew);
        stat.withdrawing = app.util.setPrice(stat.withdrawing);
        stat.direct_coin = app.util.setPrice(stat.direct_coin);
        stat.group_coin = app.util.setPrice(stat.group_coin);
        stat.exchanged_withdrew = app.util.setPrice(rawExchanged + rawWithdrew);
        t.setData({stat: stat});
      }
    });
  },
  onShow() {
    let t = this;
    app.util.checkLogin(function(){
      t.getUserInfo();
    })
  },
})
