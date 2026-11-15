const productPrice = require('../../utils/product-price');
const theme = require('../../utils/theme');
const app = getApp();
let js = null;
function formatCountdown(endTime, nowTime) {
  const remaining = Math.max(0, Number(endTime || 0) - nowTime);
  const twoDigits = (value) => (value < 10 ? '0' : '') + value;
  return {
    days: Math.floor(remaining / 86400),
    hours: twoDigits(Math.floor(remaining % 86400 / 3600)),
    minutes: twoDigits(Math.floor(remaining % 3600 / 60)),
    seconds: twoDigits(remaining % 60)
  };
}
function prepareGoods(goods) {
  const id = String(goods.id || '');
  goods.display_id = id.length >= 6 ? id : ('000000' + id).slice(-6);
  const marketPrice = Number(goods.market_price);
  const price = Number(goods.price);
  goods.discount_text = marketPrice > 0 && Number.isFinite(price) ? (price / marketPrice * 10).toFixed(1) : '';
  if (typeof goods.tag === 'string') goods.tag = goods.tag.split(' ').filter(Boolean);
  else if (!Array.isArray(goods.tag)) goods.tag = [];
  goods.display_sale_num = (Number(goods.sale_num) || 0) + (Number(goods.virtual_sale_num) || 0);
  const content = goods.extend && goods.extend.package_content;
  goods.package_content_visible = !!(content && Number(content.enabled) === 1 && Array.isArray(content.groups) && content.groups.length > 0);
  return goods;
}
Page({
  data: {
    app: app,
    goods_id: 0,
    goods: {},
    detail_show_partner_qr: false,
    show_share: 0,
    now_time: Math.floor(Date.now() / 1000),
    countdown: formatCountdown(0, Math.floor(Date.now() / 1000))
  },
  toCutQun(){
    app.switchTab('/pages/join_us/qun')
  },
  hideKf(){
    this.setData({show_kf:0})
  },
  getShareImg() {
    let t = this;
    app.util.request({
      url: 'product/getShareImg',
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
    if (0&&t.data.customer.corp_id) {
      wx.openCustomerServiceChat({
        corpId: 'ww5c8a68817007bb62',
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/'+t.data.customer.corp_id,
        },
      })
    } else {
      t.setData({show_kf:1});
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
    console.log(options)
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
    t.setData({goods_id: arr[0],user_id: arr[1]});
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
                  app.switchTab('/package2/webview/index?url='+encodeURIComponent(app.domain+'wechat/empower?scene=product_'+t.data.goods_id+'_'+userinfo.id))
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
    const nowTime = Math.floor(Date.now() / 1000);
    t.setData({now_time: nowTime, countdown: formatCountdown(t.data.goods.end_time, nowTime)});
    app.util.checkLogin(function(){
      let userinfo = wx.getStorageSync('userinfo');
      t.setData({userinfo:userinfo});
      if (userinfo.img == 'https://m.kttkj.com/static/img/head.jpg') {
        return t.checkAuth();
      }
    });
    js = setInterval(function(){
      const nowTime = Math.floor(Date.now() / 1000);
      t.setData({now_time: nowTime, countdown: formatCountdown(t.data.goods.end_time, nowTime)});
    }, 1000)
  },
  onHide: function(){
    clearInterval(js);
  },
  toBuy(){
    app.switchTab('/pages/product/place?id='+this.data.goods.id)
  },
  toIndex(){
    app.switchTab('/pages/index/index')
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
  getGoods() {
    let t = this;
    app.util.request({
      url: 'product/getInfo',
      data: {
        id: t.data.goods_id,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let goods = prepareGoods(res.data.data);
          t.setData({
            goods: goods,
            countdown: formatCountdown(goods.end_time, Math.floor(Date.now() / 1000))
          })
          t.getGoodsSpec();
          t.getShareImg()
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  
  getGoodsSpec() {
    let t = this;
    app.util.request({
      url: 'product/getGoodsSpec',
      data: {
        shop_id: t.data.goods.shop_id,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({
            goods_list: productPrice.normalizeSpecs(res.data.data).map(prepareGoods)
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  selGoodsSpec(e) {
    const dataset = e.currentTarget.dataset;
    const selected = dataset.item || (this.data.goods_list || []).find(item => String(item.id) === String(dataset.id));
    if (!selected) return;
    let goods = prepareGoods(selected);
    let t = this;
    t.setData({goods:goods, countdown:formatCountdown(goods.end_time, Math.floor(Date.now() / 1000))});
    t.getShareImg()
    t.viewGoods();
  },
  viewGoods(){
    let t = this;
    app.util.request({
      url: 'product/viewGoods',
      data: {
        id: t.data.goods.id,
      },
      method: 'post',
    });
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
      path: '/pages/product/info?scene=' + t.data.goods.id+'_'+t.data.userinfo.id,
      imageUrl: t.data.goods.share_img
    }
  }
})
