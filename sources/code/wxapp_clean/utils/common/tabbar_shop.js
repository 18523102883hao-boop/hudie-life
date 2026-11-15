var app = getApp();
var theme = require('../theme');
var tabbarData = {
  app: app,
  is_img: 0,
  color: "#8a8a8a",
  selectedColor: theme.brandStrong,
  icon_list: [{
    pagePath: "/package1/shop/index",
    iconPath: "icon-mendian",
    text: "首页"
  },{
    pagePath: "/package1/finance/stat",
    iconPath: "icon-hangyejingzhengli",
    text: "统计"
  },{
    pagePath: "/package1/finance/wallet",
    iconPath: "icon-customer-bussinessman",
    text: "我的"
  }],
}
module.exports = tabbarData;