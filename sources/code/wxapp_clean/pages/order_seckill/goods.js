const app = getApp();
Page({
  data: {
    app: app,
    order_id: 0,
    goods: {}
  },
  onLoad(options) {
    let t = this;
    t.setData({order_id: options.id});
    t.getGoods();
  },
  getGoods(){
    let t = this;
    app.util.request({
      url: 'order_seckill/getGoods',
      data: {
        order_id: t.data.order_id
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let goods = res.data.data;
          goods.price = app.util.setPrice(goods.price);
          goods.market_price = app.util.setPrice(goods.market_price);
          t.setData({goods: goods});
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  }
})