const theme = require('../../utils/theme');
const app = getApp();
Page({
  data: {
    app: app,
    user_id: 0,
    goods_id: 0,
    cut_user_id: 0,
    limit: 10,
    is_end: 0,
    goods: {},
    tmp_goods: {},
    list: []
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
    if (arr.length != 2 || arr[0]<=0 || arr[1]<=0) {
      return wx.redirectTo({
        url: '/pages/index/index',
      })
    }
    t.setData({goods_id: arr[0],user_id: arr[1]});
    app.util.checkLogin(function(){
      let userinfo = wx.getStorageSync('userinfo')
      t.setData({cut_user_id:userinfo.id});
      if (t.data.user_id > 0 && t.data.user_id != userinfo.id && userinfo.mobile == '') {
        app.bindPid(t.data.user_id);
      }
      t.getGoods();
      t.getLocation()
    });
  },
  getGoods() {
    let t = this;
    app.util.request({
      url: 'goods/getInfo',
      data: {
        id: t.data.goods_id,
        user_id: t.data.user_id,
        is_cut: 1
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          res.data.data.sale_price = (res.data.data.price - res.data.data.cut_amount).toFixed(2);
          t.setData({
            goods: res.data.data
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  toBuy(){
    let t = this;
    console.log(t.data.goods)
    if (t.data.user_id == t.data.cut_user_id) {
      app.switchTab('/pages/goods/place?id='+t.data.goods.id)
    } else {
      app.switchTab('/pages/goods/index?scene='+t.data.goods.id+'_0')
    }
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
          } else if (userinfo.img == 'https://m.kttkj.com/static/img/head.jpg')  {
            wx.showModal({
              confirmColor: theme.action,
              title: '提示',
              content: '为了方便您的使用，请授权获取您的昵称及头像！',
              confirmText: '前往授权',
              complete: (res) => {
                if (res.confirm) {
                  app.switchTab('/package2/webview/index?url='+encodeURIComponent(app.domain+'wechat/empower?scene=cut_'+t.data.goods_id+'_'+t.data.user_id))
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
        id: t.data.tmp_goods.id
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          let goods = t.data.tmp_goods;
          goods.share_img = res.data.data;
          t.setData({
            tmp_goods: goods
          })
        }
      }
    })
  },
  cutAmount(e) {
    let t = this;
    let userinfo = wx.getStorageSync('userinfo');
    if (userinfo.img == 'https://m.kttkj.com/static/img/head.jpg') {
      return t.checkAuth();
    } else if (userinfo.mobile == '') {
      app.util.showToast('请先授权绑定手机号', 1500);
      setTimeout(function(){
        app.switchTab('/pages/switch/login?pid='+t.data.user_id)
      }, 1000)
      return
    }
    let id = e.currentTarget.dataset.id;
    let type = e.currentTarget.dataset.type;
    let goods = null;
    if (type > 0) {
      //1自己砍 2邀请帮砍 3帮砍
      goods = t.data.goods;
      if (goods.stock <= goods.today_sale_num) {
        return app.util.showToast('库存不足');
      }
      if (type == 2) {
        t.getShareImg();
        t.setData({tmp_goods:goods, show_share: 1});
        return false;
      } else if (type == 1) {
        t.selfCut(id);
      } else {
        t.helpCut(id);
      }
    } else {
      let list = t.data.list;
      for (let k in list) {
        if (list[k].id == id && list[k].cut_amount > 0) {
          goods = list[k];
          break;
        }
      }
      if (goods !== null) {
        if (goods.stock <= goods.today_sale_num) {
          return app.util.showToast('库存不足');
        }
        t.setData({tmp_goods:goods, show_share: 1});
        t.getShareImg();
        return false;
      }
      t.selfCut(id);
    }
  },
  helpCut(id) {
    let t = this;
    wx.showLoading()
    let cut_user_id = wx.getStorageSync('userinfo').id;
    app.util.request({
      url: 'goods/cutAmount',
      data: {
        goods_id: t.data.goods_id,
        user_id: t.data.user_id,
        cut_user_id: cut_user_id
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          let goods = t.data.goods;
          if (t.data.goods.id == id) {
            goods.cut_amount = res.data.data.cut_amount;
            goods.sale_price = (goods.price - goods.cut_amount).toFixed(2);
          }
          t.setData({
            goods: goods,
            integral: res.data.data.integral,
            cut_price: res.data.data.cut_price,
            sec: 3,
            show_cut_msg: 2
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
  selfCut(id) {
    let t = this;
    wx.showLoading()
    app.util.request({
      url: 'goods/cutAmount',
      data: {
        goods_id: t.data.goods_id,
        user_id: wx.getStorageSync('userinfo').id
      },
      method: 'post',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code == 0) {
          let list = t.data.list;
          for (let k in list) {
            if (list[k].id == id) {
              list[k].cut_num = res.data.data.cut_num;
              list[k].cut_amount = res.data.data.cut_amount;
              list[k].sale_price = (list[k].price - list[k].cut_amount).toFixed(2);
              break;
            }
          }
          let goods = t.data.goods;
          if (t.data.goods.id = id) {
            goods.cut_amount = res.data.data.cut_amount;
            goods.sale_price = (goods.price - goods.cut_amount).toFixed(2);
          }
          t.setData({
            goods: goods,
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
  closeCutMsg() {
    this.setData({sec: 0,show_cut_msg:0});
  },
  closeShare() {
    this.setData({show_share: 0,tmp_goods: null});
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
  getGoodsList(){
    let t = this;
    if (t.data.loading || t.data.is_end) {
      return false;
    }
    t.setData({loading:true});
    app.util.request({
      url: 'goods/getList',
      data: {
        page: t.data.list.length / t.data.limit + 1,
        limit: t.data.limit,
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
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
            list[k].tag = list[k].tag.split(' ');
            list[k].sale_price = (list[k].price - list[k].cut_amount).toFixed(2);
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
  viewGoods(e){
    app.switchTab('/pages/goods/index?scene='+e.currentTarget.dataset.id+'_0')
  },
  onReachBottom() {
    let t = this
    // 数据是否全部加载完毕
    if (!t.data.is_end) {
      setTimeout(() => {
        t.getGoodsList() // 加载新数据
      }, parseInt(Math.random()*500))
    }
  },
  savePoster(){
    let t = this
    let goods = t.data.tmp_goods;
    return new Promise((resolve, reject) => {
      app.util.request({
        url: 'goods/getQrcode',
        data: {goods_id:goods.id},
        method: 'post',
        success: (res) => {
          if (res.data.code == 0) {
            goods.poster = res.data.data;
            t.setData({tmp_goods:goods});
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
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    let t = this;
    if (t.data.tmp_goods === null) {
      return {
        title: app.name,
        path: '/pages/index/index?user_id='+wx.getStorageSync('userinfo').id+'_invite',
        imageUrl: app.domain + app.share_img
      }
    } else {
      return {
        title: t.data.tmp_goods.title,
        path: '/pages/goods/cut?scene='+t.data.tmp_goods.id+'_'+wx.getStorageSync('userinfo').id,
        imageUrl: t.data.tmp_goods.share_img
      }
    }
  },
})