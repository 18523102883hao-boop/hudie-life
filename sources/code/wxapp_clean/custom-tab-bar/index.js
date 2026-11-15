Component({
  /**
   * 组件的初始数据
   */
  data: {
    active: 0,
    "list": [
      {
        "text": "首页",
        "pagePath": "pages/index/index",
        "iconPath": "/img/1.png",
        "selectedIconPath": "/img/2-blue-v1.png"
      },
      {
        "text": "会员充值",
        "pagePath": "pages/shop/union",
        "iconPath": "/img/3.png",
        "selectedIconPath": "/img/4-blue-v1.png"
      },
      {
        "text": "订单",
        "pagePath": "pages/order/order",
        "iconPath": "/img/5.png",
        "selectedIconPath": "/img/6-blue-v1.png"
      },
      {
        "text": "我的",
        "pagePath": "pages/mine/mine",
        "iconPath": "/img/7.png",
        "selectedIconPath": "/img/8-blue-v1.png"
      }
  ]
  },
  /**
   * 组件的方法列表
   */
  methods: {
    onChange(event) {
      console.log(wx.switchTab({
        url: '/'+this.data.list[event.detail].pagePath,
      }))
    },
  }
})