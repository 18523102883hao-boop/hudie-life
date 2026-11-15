const theme = require('../../utils/theme');
const tabbarData = require("../../utils/common/tabbar.js");
const app = getApp()
let js = null;
const legacyCatalog = require('../../utils/legacy-catalog');
const definition = {
  data: {
    app: app,
    showCustomer: false,
    show_follow: 0,
    hide_qrcode: 0,
    selected: 1,
    showArea: 0,
    nav_index: 0,
    cityList: [],
    goods: null,
    location: {
      lng: 0,
      lat: 0
    },
    scroll_top: 0,
    tabbarData: tabbarData,
    swiperList: [], //轮播图
    swiperIndex: 0,
    no_reload: 1,
    loading: false,
    keywords: '',
    limit: 10,
    is_end: 0,
    area_width: 126,
    province: '重庆市',
    city: '',
    county: '',
    cate: '',
    invite: 0,
    list: [],
    san: [],
    adv: [],
    new_list: [],
    top_goods: null,
    show_kf: 0
  },
  showKf(){
    this.setData({show_kf:1})
  },
  hideKf(){
    this.setData({show_kf:0})
  },
  showQrcode(){
    this.setData({hide_qrcode:1})
  },
  hide_qrcode(){
    this.setData({hide_qrcode:0})
  },
  hideFollow(){
    this.setData({show_follow:0});
  },
  getItemGoods(){
    let t = this;
    app.util.request({
      url: 'goods/getItemList',
      data: {
        get_cut_goods: 1,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let data = res.data.data;
          t.setData({
            new_list: data.new_list,
            top_goods: data.top_goods,
            show_follow: data.show_follow,
            show_cate: data.show_cate
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  searchAddress() {
    this.setData({showArea: 1});
  },
  selArea(e) {
    let t = this;
    let province = e.currentTarget.dataset.province;
    let city = e.currentTarget.dataset.city;
    let county = e.currentTarget.dataset.county;
    if (province == t.data.province && city == t.data.city && county == t.data.county) {
      t.setData({showArea: 0});
    } else {
      let area_width = ((county?county:(city?city:province)).length * 15 + 18)*2;
      area_width = area_width > 150 ? 150 : area_width;
      t.setData({
        province: province,
        city: city,
        county: county,
        area_width: area_width,
        showArea: 0
      });
      t.search();
    }
  },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  //轮播图
  swiperchange(e) {
    let {
      current
    } = e.detail
    let t = this
    t.setData({
      swiperIndex: current
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let t = this;
    console.log(options)
    if (options.scene) {
      let arr = options.scene.split('_');
      t.setData({user_id:arr[0],invite:arr.length == 2 ? arr[1] : ''})
    } else if (options.user_id > 0) {
      t.setData({user_id:options.user_id})
    }

    let m = new Date().getMonth() + 1;
    let d = new Date().getDate();
    t.setData({date: m+'/'+d});

    legacyCatalog.browse(function(){
      let userinfo = wx.getStorageSync('userinfo') || {id: 0};
      t.setData({userinfo: userinfo});
      if (t.data.user_id > 0 && t.data.user_id != userinfo.id && t.data.invite == 'invite' && userinfo.mobile == '') {
        //邀请得积分，必须授权手机号 userinfo.add_time + 3600 > new Date().getTime()/1000
        app.bindPid(t.data.user_id);
        app.util.showToast('您还未授权!');
        setTimeout(() => {
          app.switchTab('/pages/switch/login?pid='+t.data.user_id)
        }, 1000);
      } else if (userinfo.img == 'https://m.kttkj.com/static/img/head.jpg')  {
        t.checkAuth();
      }
      t.getFindSwiper()
      t.getArea()
      t.getLocation()
    })
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
          } else if (t.data.user_id != userinfo.id && (t.data.invite == 'invite' || t.data.invite == 'reg') && userinfo.mobile == '') {
            //邀请得积分，必须授权手机号 userinfo.add_time + 3600 > new Date().getTime()/1000
            app.util.showToast('您还未授权!');
            setTimeout(() => {
              app.switchTab('/pages/switch/login?pid='+t.data.user_id+'&scene='+t.data.invite)
            }, 1000);
          } else if (userinfo.img == 'https://m.kttkj.com/static/img/head.jpg')  {
            wx.showModal({
              confirmColor: theme.action,
              title: '提示',
              content: '为了方便您的使用，请授权获取您的昵称及头像！',
              confirmText: '前往授权',
              complete: (res) => {
                if (res.confirm) {
                  app.switchTab('/package2/webview/index?url='+encodeURIComponent(app.domain+'wechat/empower'))
                }
              }
            })
          }
        }
      }
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
          t.getItemGoods();
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
    t.getGoodsList();
    t.getQunQrcode();
    t.getItemGoods();
  },
  onPullDownRefresh(){
    let t = this;
    t.setData({is_end:0,list:[]});
    t.getFindSwiper()
    t.getGoodsList()
    t.getQunQrcode();
    t.getItemGoods();
    t.getArea()
    wx.stopPullDownRefresh();
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
  getArea() {
    let t = this
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'goods/getArea',
        data: {a:1},
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            t.setData({cityList:res.data.data});
          } else {
            app.util.showToast('加载失败!');
          }
          resolve()
        }
      })
    })
  },
  callTel(e){
    let t = this;
    let mobile = e.currentTarget.dataset.tel;
    wx.makePhoneCall({
      phoneNumber: mobile,
      success(res){
        t.setData({
          showCustomer: false
        })
      }
    })
  },
  setKeywords(e) {
    this.setData({keywords: e.detail.value});
  },
  searchCate(e) {
    let t = this;
    let cate = e.currentTarget.dataset.name;
    if (t.data.cate == cate) {
      cate = '';
    }
    t.setData({
      cate: cate,
      list: [],
      is_end: 0
    })
    t.getGoodsList();
  },
  search() {
    let t = this;
    t.setData({
      list: [],
      is_end: 0
    })
    t.getGoodsList();
  },
  swiperchange1(e){
    this.setData({nav_index:e.detail.current});
  },
  cutAmount(e) {
    let t = this;
    if (e.currentTarget.dataset.type != 1) {
      return t.viewGoods(e);
    }
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
              list[k].sale_price = app.util.delDotZero((list[k].price - list[k].cut_amount).toFixed(2));
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
  onReachBottom(){
    let t = this;
    setTimeout(() => {
      t.getGoodsList() // 加载新数据
    }, parseInt(Math.random()*500))
  },
  closeCutMsg() {
    this.setData({sec: 0,show_cut_msg:0});
  },
  closeShare() {
    this.setData({show_share: 0,goods: null});
  },
  toBuy(){
    app.switchTab('/pages/goods/place?id='+this.data.goods.id)
  },
  showCustomer(){
    let t = this;
    if (t.data.customer.corp_id) {
      wx.openCustomerServiceChat({
        corpId: 'ww5c8a68817007bb62',
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/'+t.data.customer.corp_id,
        },
      })
    } else {
      t.setData({show_customer:1});
    }
  },
  hideCustomer(){
    this.setData({show_customer:0});
  },
  getQunQrcode(){
    return;
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
  getGoodsList(){
    let t = this;
    if (t.data.loading || t.data.is_end) {
      return false;
    }
    t.setData({loading:true});
    app.util.request({
      url: 'goods/getListAll',
      data: {
        get_cut_goods: 1,
        page: t.data.page || 1,
        limit: t.data.limit,
        province: t.data.province,
        city: t.data.city,
        county: t.data.county,
        cate: t.data.cate == '全部' ? '' : t.data.cate,
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
            list[k].sale_price = app.util.delDotZero((list[k].price - list[k].cut_amount).toFixed(2));
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

  getFindSwiper() {
    let t = this
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'index/banner',
        data: {
          type: '砍价',
        },
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            let list = res.data.data;
            t.setData({
              swiperList: list,
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
  onPageScroll(e){
    // this.setData({scroll_top: e.scrollTop});
  },
  getNotice() {
    let t = this
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'index/banner',
        data: {
          type:'2',
        },
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            t.setData({
              notice: res.data.data
            })
          } else {
            app.util.showToast('加载失败!');
          }
          resolve()
        }
      })
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
  onShow: function(){
    let t = this;
    js = setInterval(function(){
      t.setData({now_time:parseInt(new Date().getTime()/1000)});
    }, 1000)
    let app = getApp();
    t.setData({scene: app.globalData.scene});
    app.util.checkLogin(function(){
      t.getPayQueue();
    });
  },
  getPayQueue() {
    let t = this;
    app.util.request({
      url: 'index/getPayQueue',
      data: {a:1},
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({
            payQueue: res.data.data,
          })
          t.checkPay();
        } else {
          // app.util.showToast('加载失败!');
        }
      }
    })
  },
  checkPay() {
    let t = this;
    let payQueue = t.data.payQueue;
    if (!payQueue.id) {
      return;
    }
    wx.requestMerchantTransfer({
      mchId: '1704641538',
      appId: 'wxYOUR_APPID',
      package: payQueue.res.package_info,
      success: (res) => {
        // res.err_msg将在页面展示成功后返回应用时返回ok，并不代表付款成功
        app.util.request({
          url: 'index/confirmPayQueue',
          data: {id:payQueue.id},
          method: 'post',
        });
        t.setData({payQueue: null});
        t.getPayQueue();
      },
      fail: (res) => {
        console.log('fail:', res);
      },
    });
  },
  onHide: function(){
    clearInterval(js);
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    let t = this;
    if (t.data.goods === null) {
      return {
        title: app.name,
        path: '/pages/index/index?user_id='+t.data.userinfo.id+'_invite',
        imageUrl: app.domain + app.share_img
      }
    } else {
      return {
        title: t.data.goods.shop_name +'|' + t.data.goods.title,
        path: '/pages/goods/cut?scene='+t.data.goods.id+'_'+t.data.userinfo.id,
        imageUrl: t.data.goods.share_img
      }
    }
  },
};
Page(legacyCatalog.enhance(definition, app, {"url": "goods/getListAll", "params": {"get_cut_goods": 1}}));