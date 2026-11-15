const theme = require('../../utils/theme.js');
const app = getApp();
Page({
  data: {
    app: app,
    id: 0,
  },

  toPage(e) {
    let t = this;
    let url = '/package2/landlord/add?house_id=' + t.data.id + '&path_name=' + encodeURIComponent(t.data.house.path_name + ' | ' + t.data.house.room);
    app.switchTab(url)
  },
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({id: options.id});
      t.getMyHouse();
      t.getLandlordList(t);
    })
  },
  del(e){
    let t = this;
    wx.showModal({
      confirmColor: theme.action,
      title: '确认操作',
      content: '您确定要删除该住户吗！？',
      complete: (res) => {
        if (res.confirm) {
          app.util.request({
            url: 'landlord/remove',
            data: {id:e.currentTarget.dataset.id},
            method: 'post',
            success: (res) => {
              if (res.data.code == 0) {
                let list = t.data.landlord;
                list.splice(e.currentTarget.dataset.index, 1)
                t.setData({landlord:list})
              } else {
                app.util.showToast('加载失败!');
              }
            }
          })
        }
      }
    })
  },
  getLandlordList(t){
    app.util.request({
      url: 'landlord/getListAll',
      data: {house_id:t.data.id},
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({landlord:res.data.data});
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  getMyHouse() {
    let t = this;
    app.util.request({
      url: 'house/getMyHouse',
      data: {id:t.data.id},
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({house:res.data.data});
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  }
})