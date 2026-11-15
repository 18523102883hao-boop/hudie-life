const tabbarData = require("../../utils/common/tabbar.js");
const app = getApp()
let js = null;
const legacyCatalog = require('../../utils/legacy-catalog');
const definition = {
  data: {
    app: app,
    showCustomer: false,
    selected: 1,
    area_width: 126,
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
    province: '重庆市',
    city: '',
    county: '',
    cate: '',
    be_agent: 0,
    list: [],
    san: [],
    adv: [],
    new_list: [],
    top_goods: null
  },
  getItemGoods(){
    let t = this;
    app.util.request({
      url: 'product/getItemList',
      data: {
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let data = res.data.data;
          t.setData({
            new_list: data.new_list,
            top_goods: data.top_goods
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
        area_width: area_width,
        province: province,
        city: city,
        county: county,
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
    if (options.scene) {
      let arr = options.scene.split('_');
      t.setData({user_id:arr[0],be_agent:arr[1]?arr[1]:0})
    } else if (options.user_id > 0) {
      t.setData({user_id:options.user_id})
    }

    let m = new Date().getMonth() + 1;
    let d = new Date().getDate();
    t.setData({date: m+'/'+d});

    legacyCatalog.browse(function(){
      let userinfo = wx.getStorageSync('userinfo') || {id: 0}
      t.setData({userinfo: userinfo});
      if (t.data.user_id > 0 && t.data.user_id != userinfo.id && userinfo.mobile == '') {
        //邀请得积分，必须授权手机号 userinfo.add_time + 3600 > new Date().getTime()/1000
        app.bindPid(t.data.user_id)
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
    t.getItemGoods();
  },
  onPullDownRefresh(){
    let t = this;
    t.setData({is_end:0,list:[]});
    t.getFindSwiper()
    t.getGoodsList()
    t.getItemGoods();
    t.getArea()
    wx.stopPullDownRefresh();
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
    app.switchTab('/pages/product/info?scene='+e.currentTarget.dataset.id+'_0')
  },
  getArea() {
    let t = this
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'product/getArea',
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
    this.setData({
      showCustomer: false
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
    app.switchTab('/pages/product/place?id='+this.data.goods.id)
  },
  getGoodsList(){
    let t = this;
    if (t.data.loading || t.data.is_end) {
      return false;
    }
    t.setData({loading:true});
    app.util.request({
      url: 'product/getList',
      data: {
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
            list[k].tag = (typeof list[k].tag === 'string') ? list[k].tag.split(' ').filter(Boolean) : (Array.isArray(list[k].tag) ? list[k].tag : []);
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
          type:'秒杀',
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
  onPageScroll(e){
    this.setData({scroll_top: e.scrollTop});
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
  },
  onHide: function(){
    clearInterval(js);
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    let t = this;
    return {
      title: app.name,
      path: '/pages/product/index?user_id='+t.data.userinfo.id+'_invite',
      imageUrl: app.domain + app.share_img
    }
  },
};
Page(legacyCatalog.enhance(definition, app, {"url": "product/getList"}));