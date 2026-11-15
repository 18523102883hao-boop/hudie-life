const theme = require('../../utils/theme');
const app = getApp();
let js = null;
function normalizeGoodsTag(goods) {
  if (typeof goods.tag === 'string') goods.tag = goods.tag.split(' ').filter(Boolean);
  else if (!Array.isArray(goods.tag)) goods.tag = [];
  return goods;
}
Page({
  data: {
    app: app,
    goods_id: 0,
    goods: {},
    detail_show_partner_qr: false,
    show_share: 0,
    show_cut_msg: 0,
    cut_price: 0,
    now_time: Math.floor(Date.now() / 1000),
    show_qun_qrcode: 0,
    cut_details: [],
    show_cut_details: 0,
    time_cut_details: 0,
  },
  toCutQun(){
    app.switchTab('/pages/join_us/qun')
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
                  app.switchTab('/package2/webview/index?url='+encodeURIComponent(app.domain+'wechat/empower?scene=goods_'+t.data.goods_id+'_'+userinfo.id))
                }
              }
            })
          }
        }
      }
    })
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
  getQunQrcode(){
    return;
    let t = this;
    app.util.request({
      url: 'qrcode/getQun',
      data: {
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          t.setData({
            qun: res.data.data
          })
        }
      }
    })
  },
  hide_qun_qrcode() {
    this.setData({show_qun_qrcode:0})
  },
  show_qun_qrcode() {
    this.setData({show_qun_qrcode:1})
  },
  showCutDetails(){
    let t = this;
    if (t.data.now_time < t.data.time_cut_details) {
      return this.setData({show_cut_details:1});
    }
    wx.showLoading()
    t.getCutDetails(1)
  },
  getCutDetails(show_cut_details){
    let t = this;
    app.util.request({
      url: 'goods/getCutDetails',
      data: {
        id: t.data.goods.id
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          let goods = t.data.goods;
          goods.cut_amount = res.data.data.cut_amount;
          goods.sale_price = (goods.price - goods.cut_amount).toFixed(2);
          goods.ca_price = (goods.sale_price - goods.min_price).toFixed(2);
          
          if (goods.cut_user_num > 0) {
            goods.person_num = goods.cut_user_num - res.data.data.cut_num;
          } else {
            goods.person_num = Math.ceil((goods.sale_price - goods.min_price) / ((goods.cut_max_new + goods.cut_min_new) / 100 / 2))
          }
          t.setData({
            goods: goods,
            show_cut_details: show_cut_details == 1 ? 1 : 0,
            cut_details: res.data.data.list,
            time_cut_details: t.data.now_time + 300
          })
        } else {
          app.util.showToast(res.data.msg);
        }
      }
    })
  },
  hide_cut_details(){
    this.setData({show_cut_details:0})
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
    t.setData({goods_id: arr[0],user_id: arr[1]});
    app.util.checkLogin(function(){
      t.setData({userinfo:wx.getStorageSync('userinfo')});
      wx.onCopyUrl((result) => {
        return {
          query: "scene="+t.data.goods_id+'_'+t.data.userinfo.id
        }
      })
      if (t.data.user_id > 0 && t.data.user_id != t.data.userinfo.id) {
        t.needCut();
      }
      t.getLocation();
      if (t.data.user_id > 0 && t.data.user_id != t.data.userinfo.id && t.data.userinfo.mobile == '') {
        app.bindPid(t.data.user_id);
      }
    });
  },
  needCut() {
    let t = this;
    app.util.request({
      url: 'goods/needCut',
      data: {
        id: t.data.goods_id,
        user_id: t.data.user_id
      },
      method: 'post',
      success: (res) => {
        if (res.data.data) {
          app.switchTab('/pages/goods/cut?scene='+t.data.goods_id+'_'+t.data.user_id);
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
      if (!t.data.goods || t.data.goods.cut_amount <= 0) {
        return false;
      }
      let now_time = parseInt(new Date().getTime() / 1000);
      let today_end_time = t.data.goods.today_end_time;
      let ca = today_end_time - now_time;
      if (ca <= 0) {
        t.getGoods();
        return;
      }
      let hour = parseInt(ca / 3600);
      let min = parseInt((ca - hour * 3600) / 60);
      let sec = parseInt(ca - hour * 3600 - min * 60);
      t.setData({
        hour: hour < 10 ? ('0'+hour) : hour,
        min: min < 10 ? ('0'+min) : min,
        sec1: sec < 10 ? ('0'+sec) : sec,
      })
    }, 1000)
  },
  onHide: function(){
    clearInterval(js);
  },
  toBuy(){
    app.switchTab('/pages/goods/place?id='+this.data.goods.id)
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
      url: 'goods/getInfo',
      data: {
        id: t.data.goods_id,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          res.data.data.sale_price = (res.data.data.price - res.data.data.cut_amount).toFixed(2);
          res.data.data.ca_price = (res.data.data.sale_price - res.data.data.min_price).toFixed(2);
          res.data.data.person_num = Math.ceil((res.data.data.sale_price - res.data.data.min_price) / ((res.data.data.cut_max_new + res.data.data.cut_min_new) / 100 / 2))
          t.setData({
            goods: normalizeGoodsTag(res.data.data)
          })
          t.getGoodsSpec();
          if (res.data.data.cut_amount > 0) {
            t.getCutDetails();
          }
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
      url: 'goods/getGoodsSpec',
      data: {
        shop_id: t.data.goods.shop_id,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let goods_list = res.data.data;
          for (var i in goods_list) {
            goods_list[i].sale_price = (goods_list[i].price - goods_list[i].cut_amount).toFixed(2);
            goods_list[i].ca_price = (goods_list[i].sale_price - goods_list[i].min_price).toFixed(2);
            goods_list[i].person_num = Math.ceil((goods_list[i].sale_price - goods_list[i].min_price) / ((goods_list[i].cut_max_new + goods_list[i].cut_min_new) / 100 / 2))
          }
          t.setData({
            goods_list: goods_list
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  selGoodsSpec(e) {
    let goods = normalizeGoodsTag(e.currentTarget.dataset.item);
    let t = this;
    t.setData({goods:goods});
    if (goods.cut_amount > 0) {
      t.getCutDetails();
    }
    t.getShareImg()
    t.viewGoods();
  },
  viewGoods(){
    let t = this;
    app.util.request({
      url: 'goods/viewGoods',
      data: {
        id: t.data.goods.id,
      },
      method: 'post',
    });
  },
  cutAmount() {
    let t = this;
    if (wx.getStorageSync('userinfo').mobile == '') {
      app.util.showToast('请先授权绑定手机号', 1500);
      setTimeout(function(){
        app.switchTab('/pages/switch/login')
      }, 1000)
      return
    }
    let goods = t.data.goods;
    if (goods.cut_amount > 0) {
      if (goods.stock <= goods.today_sale_num) {
        app.util.showToast('商品库存不足')
        return false;
      }
      t.setData({goods:goods, show_share: 1});
      return false;
    }
    wx.showLoading()
    app.util.request({
      url: 'goods/cutAmount',
      data: {
        goods_id: t.data.goods.id,
        user_id: t.data.userinfo.id
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          goods.cut_num = res.data.data.cut_num;
          goods.cut_amount = res.data.data.cut_amount;
          goods.sale_price = (goods.price - goods.cut_amount).toFixed(2);
          goods.ca_price = (goods.sale_price - goods.min_price).toFixed(2);
          goods.person_num = Math.ceil((goods.sale_price - goods.min_price) / ((goods.cut_max_new + goods.cut_min_new) / 100 / 2))
          
          let goods_list = t.data.goods_list;
          for (var i in goods_list) {
            if (goods_list[i].id == goods.id) {
              goods_list[i] = goods;
              break;
            }
          }
          t.setData({
            cut_price: res.data.data.cut_price,
            sec: 3,
            show_cut_msg: 1,
            goods: goods,
            goods_list: goods_list
          })
          let it = setInterval(function(){
            if (t.data.sec <= 0) {
              t.setData({show_cut_msg:0})
              return clearInterval(it);
            }
            t.setData({sec: t.data.sec-1});
          }, 1000);
          t.getCutDetails();
        } else {
          app.util.showToast(res.data.msg);
        }
      }
    })
  },
  closeCutMsg() {
    this.setData({sec: 0,show_cut_msg:0});
  },
  closeShare() {
    this.setData({show_share: 0});
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
        url: 'goods/getQrcode',
        data: {goods_id:goods.id},
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            goods.poster = res.data.data;
            t.setData({goods:goods,show_share:t.data.show_share==0?2:1});
            if (t.data.show_share == 1 || !goods.copywriting) {
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
  onPullDownRefresh(){
    let t = this;
    t.getGoods()
    t.getQunQrcode();
    t.getCutDetails();
    wx.stopPullDownRefresh();
  },
  onShareAppMessage() {
    let t = this;
    return {
      title: t.data.goods.shop_name + '|' + t.data.goods.title,
      path: (t.data.show_share ? ('/pages/goods/cut?scene=') : ('/pages/goods/index?scene=')) + t.data.goods.id+'_'+t.data.userinfo.id,
      imageUrl: t.data.goods.share_img
    }
  }
})
