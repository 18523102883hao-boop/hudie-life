const theme = require('../../utils/theme.js');
const app = getApp()
Page({
  data: {
    app: app,
    info: {},
    store_list: [],
    worker: {},
    store: null,
    id: 0,
    show_msg: 0,
    no: '',
    num: 0,
    code: ''
  },
  hideMsg(){
    this.setData({show_msg:0});
  },
  showMsg(){
    let t = this;
    if (t.data.store === null) {
      return app.util.showToast('请选择核销门店');
    }
    if (t.data.num === 0) {
      return app.util.showToast('请选择核销券码');
    }
    this.setData({show_msg:1});
  },
  onLoad(options) {
    let t = this;
    if (!/\d+_\w\d{19}/.test(options.scene)) {
      app.util.showToast('操作有误');
      setTimeout(function(){
        wx.redirectTo({
          url: '/pages/index/index',
        })
      }, 1000)
      return;
    }
    let arr = options.scene.split('_');
    t.setData({id: arr[0],no: arr[1]});
    app.util.checkLogin(function(){
      t.setData({userinfo:wx.getStorageSync('userinfo')});
      t.getLocation();
    });
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
          t.getOrderInfo();
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
  getOrderInfo() {
    let t = this;
    app.util.request({
      url: 'order_group/getOrderInfoVerify',
      data: {
        lng: t.data.location ? t.data.location.lng : 0,
        lat: t.data.location ? t.data.location.lat : 0,
        order_id: t.data.id,
        no: t.data.no
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let order = res.data.data.order;
          order.goods.price = app.util.setPrice(order.goods.price);
          order.goods.market_price = app.util.setPrice(order.goods.market_price);
          order.old_amount = app.util.setPrice(order.amount + order.cut_amount);
          order.amount = app.util.setPrice(order.amount);
          order.cut_amount = app.util.setPrice(order.cut_amount);
          let store_list = res.data.data.store_list;
          let worker = res.data.data.worker;
          let store = null;
          for (let k in store_list) {
            store_list[k].distant = t.calculateDistance(t.data.location.lat, t.data.location.lng, store_list[k].lat, store_list[k].lng);
            store_list[k].disabled = worker.store_ids.indexOf(','+store_list[k].id+',') < 0;
            if (order.verify_store_id == store_list[k].id) {
              store = store_list[k];
            }
          }
          store_list.sort((a,b) => a.distant - b.distant);
          let store_id = 0;
          if (store_list.length == 1) {
            store_id = store_list[0].id;
          }
          t.setData({info: order, store_list: store_list, worker: worker, store_id: store_id, store: store});
        } else {
          app.util.showToast(res.data.msg);
          setTimeout(function(){
            wx.redirectTo({
              url: '/pages/index/index',
            })
          }, 1500)
        }
      }
    })
  },
  onPullDownRefresh(){
    let t = this;
    t.getOrderInfo()
    wx.stopPullDownRefresh();
  },
  selCode(e){
    let t = this;
    let code = t.data.info.code;
    let index = e.currentTarget.dataset.index;
    if (code[index].verify_time) {
      wx.showModal({
        confirmColor: theme.action,
        title: '提示',
        content: '该券码已于['+code[index].verify_time+']在【'+code[index].verify_store+'】消费',
        showCancel: false,
        confirmText: '我知道了'
      })
      return false;
    }
    if (t.data.info.status != 2 && t.data.info.status != 4 && t.data.info.status != 20) {
      return false;
    }
    if (code[index].is_sel) {
      code[index].is_sel = 0;
    } else {
      code[index].is_sel = 1;
    }
    let info = t.data.info;
    info.code = code;
    let num = 0;
    let code_arr = [];
    for (var i in code) {
      if (code[i].is_sel) {
        num++;
        code_arr.push(code[i].code);
      }
    }
    t.setData({info:info,num:num,code:code_arr.join(',')});
  },
  selStore(e){
    let store = e.currentTarget.dataset.item;
    let t = this;
    if (t.data.info.status != 2 && t.data.info.status != 4 && t.data.info.status != 20) {
      return false;
    }
    if (t.data.worker.store_ids.indexOf(','+store.id+',') < 0) {
      return app.util.showToast('您没有该门店的核销权限');
    }
    t.setData({store: store})
  },
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径，单位：km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  },
  doVerify() {
    let t = this;
    setTimeout(function(){
      if (t.data.is_submit) {
        return false;
      }
      t.setData({is_submit: 1})
      wx.showLoading()
      app.util.request({
        url: 'order_group/verify',
        data: {
          order_id: t.data.id,
          store_id: t.data.store.id,
          code: t.data.code
        },
        method: 'post',
        success: (res) => {
          wx.hideLoading();
          t.setData({is_submit: 0})
          if (res.data.code == 0) {
            t.setData({code:'',num:0})
          }
          t.getOrderInfo();
          wx.showModal({
            confirmColor: theme.action,
            title: '提示',
            content: res.data.msg,
            showCancel: false,
            confirmText: '我知道了'
          })
          if (res.data.code == 0) {
            t.setData({show_msg: 0})
          }
        }
      })
    }, Math.random()*500)
  },
})