const app = getApp();
Page({
  data: {
    app: app,
    order_id: 0,
    info: null,
    location: {},
    showAlert: 0,
    show_code_url: 0,
    code_url: '',
  },
  showCodeUrl(e){
    this.setData({show_code_url: 1,code_url: e.currentTarget.dataset.code_url})
  },
  hideCodeUrl(){
    this.setData({show_code_url: 0,code_url: ''})
  },
  toPage(e){
    var t = this;
    let title = e.currentTarget.dataset.title;
    let path = e.currentTarget.dataset.path;
    let item;
    if (title) {
      for (var k in t.data.san) {
        if (t.data.san[k].name == title) {
          item = t.data.san[k];
        }
      }
    } else {
      item = e.currentTarget.dataset.item;
    }
    if (!path) {
      path = item.path;
    }
    console.log(item)
    if (path != '') {
      if (path.substring(0,6) === '/pages' || path.substring(0,8) === '/package') {
        app.switchTab(path)
      } else {
        app.switchTab('/package2/webview/index?url='+encodeURIComponent(path))
      }
    } else if (item.layer_img) {
      this.setData({isTip:1,adv_img:item.layer_img})
    } else if (item.content) {
      app.switchTab('/package2/rule/index?type=banner&id='+item.id)
    } else {
      t.setData({no_reload: 1});
      wx.previewImage({
        current: item.img,
        urls: [item.img],
      })
    }
  },
  getFindSwiper() {
    let t = this
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'index/banner',
        data: {
          type: '订单弹窗',
        },
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            t.setData({
              showAlert: res.data.data.length > 0 ? 1 : 0,
              alertList: res.data.data
            })
          } else {
            app.util.showToast('加载失败!');
          }
          resolve()
        }
      })
    })
  },
  hideAlert(){
    this.setData({showAlert:0})
  },
  viewQrcode(){
    app.switchTab('/package2/webview/index?url='+encodeURIComponent(this.data.info.code_url))
  },
  copyQrcode(){
    let t = this;
    wx.setClipboardData({
      data: t.data.info.code_url,
      success (res) {
        wx.getClipboardData({
          success (res) {
            app.util.showToast('券码链接已复制，请在默认浏览器打开~！')
            console.log(res.data) // data
          }
        })
      }
    })
  },
  onLoad(options) {
    let t = this;
    t.setData({order_id: options.id});
    app.util.checkLogin(function(){
      t.setData({userinfo:wx.getStorageSync('userinfo')});
      t.getLocation();
    });
  },
  callPhone(e){
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.phone,
      success(res){
      }
    })
  },
  viewGoods(){
    app.switchTab('/pages/order/goods?id='+this.data.order_id)
  },
  viewStore(){ 
    app.switchTab('/pages/store/index?data='+encodeURIComponent(JSON.stringify(this.data.info.store)))
  },
  getLocation() {
    let t = this;
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting["scope.userLocation"]) {
          app.util.showToast('请点击右上角设置，开启位置权限');
          wx.authorize({
            scope: 'scope.userLocation',
            success () {
              t.setData({
                is_end: 0,
                list: []
              })
              t.getLocation();
            }
          })
          setTimeout(function(){
            if (t.data.info == null) {
              t.getOrderInfo();
            }
          }, 2000)
        } else if (res.authSetting['scope.userInfo'] == undefined) {
          wx.getLocation({
            type: 'wgs84',
            success(response) {
              t.setLocation(response)
            }
          })
        } else {
          wx.getLocation({
            type: 'gcj02',
            success(response) {
              t.setLocation(response)
            }
          })
        }
      }
    })
  },
  setLocation(response){
    var t = this;
    var location = {
      lat : response.latitude,
      lng : response.longitude,
      expire_time : new Date().getTime() + 1800000
    };
    wx.setStorageSync('location', location)
    //获取到经度纬度
    t.setData({
      location: location,
    })
    t.getOrderInfo();
  },
  copyCode(){
    let t = this;
    wx.setClipboardData({
      data: t.data.info.code,
      success (res) {
        wx.getClipboardData({
          success (res) {
            console.log(res.data) // data
          }
        })
      }
    })
  },
  getOrderInfo() {
    let t = this;
    app.util.request({
      url: 'order/getInfo',
      data: {
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
        order_id: t.data.order_id
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let order = res.data.data;
          order.goods.price = app.util.setPrice(order.goods.price);
          order.goods.market_price = app.util.setPrice(order.goods.market_price);
          order.old_amount = app.util.setPrice(order.amount + order.cut_amount);
          order.amount = app.util.setPrice(order.amount);
          order.cut_amount = app.util.setPrice(order.cut_amount);
          t.setData({info: order});
          
          if (order.pay_time + 900 >= new Date().getTime() / 1000) {
            t.getFindSwiper();
          }
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
})