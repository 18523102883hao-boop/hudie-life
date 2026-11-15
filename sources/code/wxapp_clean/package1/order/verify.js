const theme = require('../../utils/theme.js');
const app = getApp()
Page({
  data: {
    app: app,
    list: [],
    limit: 20,
    loading: 0,
    code: ''
  },
  search(e){
    let t = this;
    if (t.data.code.length <= 0) {
      return app.util.showToast('请输入券码');
    }
    t.getPage();
  },
  verifyOrder(e){
    let item = e.currentTarget.dataset.item;
    if (item.status == 3) {
      wx.showModal({
        confirmColor: theme.action,
        title: '提示',
        content: '该订单已于'+item.verify_time+'核销',
        showCancel: false,
        confirmText: '我知道了'
      })
      return;
    }
    let order_page = '';
    if (item.order_type == '拼团订单') {
      order_page = 'order_group';
      item.code = item.no;
    } else if (item.order_type == '特价订单') {
      order_page = 'order_seckill';
      item.code = item.no;
    } else if (item.order_type == '砍价订单') {
      order_page = 'order';
    } else {
      return app.util.showToast('操作错误')
    }
    app.switchTab('/pages/'+order_page+'/verify?scene='+item.id+'_'+item.code)
  },
  scan() {
		wx.scanCode({
			success(res) {
        console.log(res);
        if (res.path) {
          app.switchTab('/'+res.path)
        }
			}
		})
	},
  getPage(order_id) {
    let t = this
    if (t.data.loading) {
      return false;
    }
    t.setData({loading: 1});
    app.util.request({
      url: "order/searchOrder",
      method: 'post',
      data: {
        shop_id: t.data.shop.id,
        code: t.data.code,
        order_id: order_id?order_id:0
      },
      success(res) {
        t.setData({loading: 0});
        if (res.data.code == 0) {
          let list = res.data.data
          t.setData({list:list});
        } else {
          app.util.showToast(res.msg)
        }
      },
      fail(error) {
        console.log(error);
        app.util.showToast()
      }
    })
  },
  onLoad(){
    let t = this;
    console.log(wx.getStorageSync('shop'))
    app.util.checkLogin(function(){
      t.setData({
        shop: wx.getStorageSync('shop'),
        userinfo: wx.getStorageSync('userinfo')
      })
    });
  },
  // 返回上一页
  onClickLeft() {
    wx.navigateBack();
  },
})