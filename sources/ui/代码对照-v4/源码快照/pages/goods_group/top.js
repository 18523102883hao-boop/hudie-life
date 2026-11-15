const app = getApp();
const legacyCatalog = require('../../utils/legacy-catalog');
const definition = {
  data: {
    app: app,
  },
  onLoad(options) {
    let t = this;
    legacyCatalog.browse(function(){
      t.setData({userinfo: wx.getStorageSync('userinfo')});
      t.getFindSwiper()
      t.getLocation()
    })
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
    if (path != '') {
      if (path.substring(0,6) === '/pages' || path.substring(0,8) === '/package') {
        return app.switchTab(path)
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
          type:'排行榜',
        },
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            t.setData({
              swiperList: res.data.data
            })
          } else {
            app.util.showToast('加载失败!');
          }
          resolve()
        }
      })
    })
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
          t.getItemGoods();
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
      is_end: 0,
      list: [],
    })
    t.getItemGoods();
  },
  toBack(){
    app.switchTab('/pages/goods_group/index')
  },
  getItemGoods(){
    let t = this;
    app.util.request({
      url: 'goods_group/getTopList',
      data: {
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({
            list: res.data.data
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
};
Page(legacyCatalog.enhance(definition, app, {"url": "goods_group/getTopList", "method": "getItemGoods"}));