const productPrice = require('../../utils/product-price');
const theme = require('../../utils/theme');
const app = getApp();
let js = null;
Page({
  data: {
    app: app,
    goods_id: 0,
    goods: {},
    detail_show_partner_qr: false,
    show_share: 0,
    now_time: Math.floor(Date.now() / 1000),
    group_order_id: null,
    group_order: null
  },
  
  getShareImg() {
    let t = this;
    app.util.request({
      url: 'goods_group/getShareImg',
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
  showCustomer(){
    let t = this;
    if (t.data.customer.corp_id) {
      console.log(1233,wx.openCustomerServiceChat({
        corpId: 'ww5c8a68817007bb62',
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/'+t.data.customer.corp_id,
        },
      }))
    } else {
      t.setData({show_customer:1});
    }
  },
  hideCustomer(){
    this.setData({show_customer:0});
  },
  getQunQrcode(){
    let t = this;
    app.util.request({
      url: 'qrcode/getCustomer',
      data: {
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          t.setData({
            customer: res.data.data
          })
        }
      }
    })
  },
  onLoad(options) {
    let t = this;
    let scene = options.scene;
    if (!scene) {
      return wx.redirectTo({
        url: '/pages/index/index',
      })
    }
    let arr = scene.split('_');
    if (arr.length != 2 || arr[0]<=0) {
      return wx.redirectTo({
        url: '/pages/index/index',
      })
    }
    t.setData({goods_id: arr[0],user_id: arr[1],group_order_id:options.group_order_id});
    app.util.checkLogin(function(){
      t.setData({userinfo:wx.getStorageSync('userinfo')});
      wx.onCopyUrl((result) => {
        return {
          query: "scene="+t.data.goods_id+'_'+t.data.userinfo.id
        }
      })
      if (t.data.user_id > 0 && t.data.user_id != t.data.userinfo.id && t.data.userinfo.mobile == '') {
        app.bindPid(t.data.user_id);
      }
      t.getLocation();
      if (t.data.group_order_id > 0) {
        t.getGroupOrder();
      }
    });
  },
  checkAuth(){
    let t = this;
    app.util.request({
      url: 'user/getInfo',
      data: {a:1},
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let userinfo = res.data.data;
          wx.setStorageSync('userinfo', userinfo)
          if (userinfo.need_mobile) {
            app.util.showToast('您还未授权!');
            let params = '';
            if (t.data.user_id != userinfo.id && t.data.user_id > 0) {
              params = '?pid='+t.data.user_id;
              if (t.data.invite) {
                params += '&scene='+t.data.invite;
              }
            }
            setTimeout(() => {
              app.switchTab('/pages/switch/login'+params)
            }, 1000);
          } else if (t.data.user_id != userinfo.id && t.data.invite == 'invite' && userinfo.mobile == '') {
            //邀请得积分，必须授权手机号 userinfo.add_time + 3600 > new Date().getTime()/1000
            app.util.showToast('您还未授权!');
            setTimeout(() => {
              app.switchTab('/pages/switch/login?pid='+t.data.user_id+'&scene='+t.data.invite)
            }, 1000);
          } else if (t.data.user_id != userinfo.id && t.data.invite == 'invite' && userinfo.img == 'https://m.kttkj.com/static/img/head.jpg')  {
            wx.showModal({
              confirmColor: theme.action,
              title: '提示',
              content: '为了方便您的使用，请授权获取您的昵称及头像！',
              confirmText: '前往授权',
              complete: (res) => {
                if (res.confirm) {
                  app.switchTab('/package2/webview/index?url='+encodeURIComponent(app.domain+'wechat/empower?scene=group_'+t.data.goods_id+'_'+userinfo.id))
                }
              }
            })
          }
        }
      }
    })
  },
  onShow(){
    let t = this;
    t.setData({now_time: Math.floor(Date.now() / 1000)});
    app.util.checkLogin(function(){
      let userinfo = wx.getStorageSync('userinfo');
      t.setData({userinfo:userinfo});
      if (userinfo.img == 'https://m.kttkj.com/static/img/head.jpg') {
        return t.checkAuth();
      }
    });
    js = setInterval(function(){
      t.setData({now_time:parseInt(new Date().getTime()/1000)});
      if (!t.data.group_order || t.data.group_order.end_time <= 0) {
        return false;
      }
      let now_time = parseInt(new Date().getTime() / 1000);
      let ca = t.data.group_order.end_time - now_time;
      if (ca <= 0) {
        t.setData({group_order: null});
        return;
      }
      let hour = parseInt(ca / 3600);
      let min = parseInt((ca - hour * 3600) / 60);
      let sec = parseInt(ca - hour * 3600 - min * 60);
      t.setData({
        hour: hour < 10 ? ('0'+hour) : hour,
        min: min < 10 ? ('0'+min) : min,
        sec: sec < 10 ? ('0'+sec) : sec,
      })
    }, 1000)
  },
  onHide: function(){
    clearInterval(js);
  },
  toBuy(){
    app.switchTab('/pages/goods_group/place?id='+this.data.goods.id)
  },
  toGroupBuy(){
    let t = this;
    app.switchTab('/pages/goods_group/place?id='+t.data.goods.id+(t.data.group_order?('&group_order_id='+t.data.group_order.id):''))
  },
  toIndex(){
    app.switchTab('/pages/goods_group/index')
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
          t.getGoods();
          t.getQunQrcode();
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
    t.getGoods();
    t.getQunQrcode();
  },
  callPhone(e){
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.phone,
      success(res){
      }
    })
  },
  daohang(e){
    let item = e.currentTarget.dataset.item
    wx.openLocation({
      latitude: Number(item.lat),
      longitude: Number(item.lng),
      name: item.name,
      address: item.province + item.city + item.county + item.address
    })
  },
  viewStore(){
    app.switchTab('/pages/store/index?data='+encodeURIComponent(JSON.stringify(this.data.goods.store)))
  },
  viewLicense(){
    const license = this.data.goods && this.data.goods.license;
    if (!license) {
      wx.showModal({title:'商家资质',content:'暂无商家资质',showCancel:false});
      return;
    }
    wx.previewImage({
      current: license,
      urls: [license],
      fail: () => wx.showToast({title:'商家资质加载失败',icon:'none'})
    })
  },
  copyVideoGoodsId(){
    const id = this.data.goods && this.data.goods.video_goods_id;
    if (!id) return;
    wx.setClipboardData({
      data: String(id),
      success: () => wx.showToast({title:'复制成功',icon:'success'}),
      fail: () => wx.showToast({title:'复制失败，请重试',icon:'none'})
    });
  },
  openPartnerQr(){
    this.setData({detail_show_partner_qr:true});
  },
  closePartnerQr(){
    this.setData({detail_show_partner_qr:false});
  },
  stopPartnerQrTap(){},
  partnerQrError(){
    this.closePartnerQr();
    wx.showToast({title:'客服二维码暂不可用，请稍后再试',icon:'none'});
  },
  getGroupOrder(){
    let t = this;
    app.util.request({
      url: 'order_group/getGroupOrder',
      data: {
        group_order_id: t.data.group_order_id,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({
            group_order: res.data.data
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  
  getGoodsSpec() {
    let t = this;
    app.util.request({
      url: 'goods_group/getGoodsSpec',
      data: {
        shop_id: t.data.goods.shop_id,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({
            goods_list: productPrice.normalizeSpecs(res.data.data)
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  selGoodsSpec(e) {
    let goods = e.currentTarget.dataset.item;
    if (typeof goods.tag === 'string') goods.tag = goods.tag.split(' ').filter(Boolean);
    else if (!Array.isArray(goods.tag)) goods.tag = [];
    let t = this;
    t.setData({goods:goods});
    t.getShareImg()
    t.viewGoods();
  },
  viewGoods(){
    let t = this;
    app.util.request({
      url: 'goods_group/viewGoods',
      data: {
        id: t.data.goods.id,
      },
      method: 'post',
    });
  },
  getGoods() {
    let t = this;
    app.util.request({
      url: 'goods_group/getInfo',
      data: {
        id: t.data.goods_id,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let goods = res.data.data;
          if (typeof goods.tag === 'string') goods.tag = goods.tag.split(' ').filter(Boolean);
          else if (!Array.isArray(goods.tag)) goods.tag = [];
          t.setData({
            goods: goods
          })
          t.getGoodsSpec();
          t.getShareImg()
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  savePosterImg(){
    let t = this
    let goods = t.data.goods;
    wx.getImageInfo({
      src: goods.poster,
      success(res) {
        wx.saveImageToPhotosAlbum({
          filePath: res.path,
          success(res) {
            app.util.showToast('海报已保存', 1500, 'success')
          }
        })
      }
    })
  },
  copyText(){
    let t = this
    let goods = t.data.goods;
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
  },
  savePoster(){
    let t = this
    let goods = t.data.goods;
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'product/getQrcode',
        data: {goods_id:goods.id},
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            goods.poster = res.data.data;
            t.setData({goods:goods,show_share:1});
            if (!goods.copywriting) {
              t.savePosterImg();
            }
          } else {
            app.util.showToast(res.data.msg);
          }
          resolve()
        }
      })
    })
  },
  hide_share(){
    this.setData({show_share:0})
  },
  onPullDownRefresh(){
    let t = this;
    t.getGoods()
    t.getQunQrcode();
    wx.stopPullDownRefresh();
  },
  onShareAppMessage() {
    let t = this;
    return {
      title: t.data.goods.shop_name + '|' + t.data.goods.title,
      path: '/pages/goods_group/info?scene=' + t.data.goods.id+'_'+t.data.userinfo.id,
      imageUrl: t.data.goods.share_img
    }
  }
})
