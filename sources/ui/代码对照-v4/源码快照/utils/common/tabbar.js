var app = getApp();
var theme = require('../theme');
var tabbarData = {
  app: app,
  is_img: 1,
  color: "#d0d0d0",
  selectedColor: theme.brandStrong,
  icon_list: [{
    pagePath: "/pages/index/index",
    img_on: '/img/tj-on-blue-v1.png',
    img: app.domain + 'static/img/tj.png',
    size: [52,50],
    iconPath: "icon-connections",
    text: "首页"
  },{
  //   pagePath: "/pages/goods/list",
  //   img_on: app.domain + 'static/img/ktt-on.png',
  //   img: app.domain + 'static/img/ktt.png',
  //   size: [52,50],
  //   iconPath: "icon-business-icon-festivals",
  //   text: "砍价"
  // },{
    pagePath: "/pages/foodmap/index",
    img_on: '/img/nearby-food-active-v1.png',
    img: '/img/nearby-food-v1.png',
    size: [50,50],
    iconPath: "icon-order-fill",
    text: "吃喝玩乐"
  },{
  //   pagePath: "/pages/goods_group/index",
  //   img_on: app.domain + 'static/img/pt-on.png',
  //   img: app.domain + 'static/img/pt.png',
  //   size: [54,50],
  //   iconPath: "icon-customer-group",
  //   text: "拼团"
  // },{
  //   pagePath: "/pages/order/index",
  //   iconPath: "icon-dingdan",
  //   text: "订单"
  // },{
    pagePath: "/pages/mine/mine",
    img_on: '/img/my-on-blue-v1.png',
    img: app.domain + 'static/img/my.png',
    size: [43,50],
    iconPath: "icon-iconwonor",
    text: "我的"
  }],
}
module.exports = tabbarData;
