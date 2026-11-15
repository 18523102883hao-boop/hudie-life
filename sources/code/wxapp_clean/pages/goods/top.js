const app = getApp();
const legacyCatalog = require('../../utils/legacy-catalog');
const definition = {
  data: {
    app: app,
    cate: '',
    is_end: 0,
    loading: false,
    limit: 10,
    list: []
  },
  viewGoods(e){
    let type = e.currentTarget.dataset.type;
    let page = '';
    if (type == 1) {
      page = 'goods/index';
    } else if (type == 2) {
      page = 'product/info';
    } else {
      page = 'goods_group/info';
    }
    app.switchTab('/pages/'+page+'?scene='+e.currentTarget.dataset.id+'_0')
  },
  cateSel(e){
    let t = this;
    let cate = e.currentTarget.dataset.cate;
    if (cate == t.data.cate) {
      return false;
    }
    t.setData({
      cate: cate,
      list: [],
      is_end: 0
    })
    t.getGoodsList();
  },
  
  getShareImg() {
    let t = this;
    app.util.request({
      url: 'goods/getShareImg',
      data: {
        id: t.data.goods.id
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          let goods = t.data.goods;
          goods.share_img = res.data.data;
          t.setData({
            goods: goods
          })
        }
      }
    })
  },
  cutAmount(e) {
    let t = this;
    if (wx.getStorageSync('userinfo').mobile == '') {
      app.util.showToast('请先授权绑定手机号', 1500);
      setTimeout(function(){
        app.switchTab('/pages/switch/login')
      }, 1000)
      return
    }

    let id = e.currentTarget.dataset.id;
    let list = t.data.list;
    let goods = null;
    for (let k in list) {
      if (list[k].id == id && list[k].cut_amount > 0) {
        goods = list[k];
        break;
      }
    }
    if (goods !== null) {
      if (goods.stock <= goods.today_sale_num) {
        return false;
      }
      t.setData({goods:goods, show_share: 1});
      t.getShareImg();
      return false;
    }
    wx.showLoading()
    app.util.request({
      url: 'goods/cutAmount',
      data: {
        goods_id: id,
        user_id: t.data.userinfo.id
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          for (let k in list) {
            if (list[k].id == id) {
              list[k].cut_num = res.data.data.cut_num;
              list[k].cut_amount = res.data.data.cut_amount;
              list[k].sale_price = (list[k].price - list[k].cut_amount).toFixed(2);
              break;
            }
          }
          t.setData({
            cut_price: res.data.data.cut_price,
            sec: 3,
            show_cut_msg: 1,
            list: list
          })
          let it = setInterval(function(){
            if (t.data.sec <= 0) {
              t.setData({show_cut_msg:0})
              return clearInterval(it);
            }
            t.setData({sec: t.data.sec-1});
          }, 1000);
        } else {
          app.util.showToast(res.data.msg);
        }
      }
    })
  },
  
  savePoster(){
    let t = this
    let goods = t.data.goods;
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'goods/getQrcode',
        data: {goods_id:goods.id},
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            goods.poster = res.data.data;
            t.setData({goods:goods});
            wx.getImageInfo({
              src: res.data.data,
              success(res) {
                wx.saveImageToPhotosAlbum({
                  filePath: res.path,
                  success(res) {
                    
                  }
                })
              }
            })
            
            if (goods.copywriting) {
              setTimeout(function(){
                wx.setClipboardData({
                  data: goods.copywriting,
                  success (res) {
                    wx.getClipboardData({
                      success (res) {
                        app.util.showToast('文案已复制成功', 2000, 'success')
                        // console.log(res.data) // data
                      }
                    })
                  }
                })
              }, 1000)
            }
          } else {
            app.util.showToast(res.data.msg);
          }
          resolve()
        }
      })
    })
  },
  onLoad(options) {
    let t = this;
    legacyCatalog.browse(function(){
      t.setData({userinfo: wx.getStorageSync('userinfo')});
      t.getFindSwiper()
      t.getLocation()
      t.getCate()
    })
  },
  toBuy(){
    app.switchTab('/pages/goods/place?id='+this.data.goods.id)
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    console.log(t.data.goods)
    let t = this;
    if (t.data.goods === null) {
      return {
        title: app.name,
        path: '/pages/index/index?user_id='+t.data.userinfo.id+'_invite',
        imageUrl: app.domain + app.share_img
      }
    } else {
      return {
        title: t.data.goods.title,
        path: '/pages/goods/cut?scene='+t.data.goods.id+'_'+t.data.userinfo.id,
        imageUrl: t.data.goods.share_img
      }
    }
  },
  
  closeCutMsg() {
    this.setData({sec: 0,show_cut_msg:0});
  },
  closeShare() {
    this.setData({show_share: 0,goods: null});
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
          type:'砍价排行',
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
  
  getCate() {
    let t = this
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'index/getCate',
        data: {a:1},
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            t.setData({
              cateList: res.data.data
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
          t.getGoodsList();
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
    t.getGoodsList();
  },
  toBack(){
    app.switchTab('/pages/index/index')
  },
  getGoodsList(){
    let t = this;
    if (t.data.loading || t.data.is_end) {
      return false;
    }
    t.setData({loading:true});
    app.util.request({
      url: 'goods/getTopList',
      data: {
        page: t.data.page || 1,
        limit: t.data.limit,
        province: t.data.province,
        city: t.data.city,
        county: t.data.county,
        cate: t.data.cate,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
        title: t.data.keywords
      },
      method: 'post',
      success: (res) => {
        t.setData({loading:false});
        if (res.data.code == 0) {
          let is_end = 0;
          if (res.data.data.length < t.data.limit) {
            is_end = 1;
          }
          let list = res.data.data;
          for (let k in list) {
            list[k].sale_price = (list[k].price - list[k].cut_amount).toFixed(2);
            list[k].tag = list[k].tag.split(' ');
          }
          t.setData({
            is_end: is_end,
            list: t.data.list.concat(list)
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  onPullDownRefresh(){
    let t = this;
    t.setData({is_end:0,list:[]});
    t.getFindSwiper()
    t.getGoodsList()
    wx.stopPullDownRefresh();
  },
  onReachBottom(){
    let t = this;
    setTimeout(() => {
      t.getGoodsList() // 加载新数据
    }, parseInt(Math.random()*500))
  },
};
Page(legacyCatalog.enhance(definition, app, {"url": "goods/getTopList"}));