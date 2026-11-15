const theme = require('../../utils/theme.js');
const app = getApp();
Page({
  data: {
    app: app,
    id: 0,
    data:{}
  },
  
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({id: options.id})
      t.getInfo()
    })
  },
  viewImgs(e){
    wx.previewImage({
      urls: e.currentTarget.dataset.item,
    })
  },
  getInfo(){
    let t = this;
    app.util.request({
      url: 'apply/getInfo',
      data: {
        id: t.data.id
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          let data = res.data.data;
          data.info.add_time = app.util.formatDate(new Date(data.info.add_time*1000), 'yyyy.MM.dd hh:mm')
          data.num = 0;
          data.catalog = {};
          for (let k in data.list) {
            data.catalog[data.list[k].field] = (data.list[k]);
            data.num += parseInt(data.list[k].num)
          }
          if (data.examine.length > 0) {
            for (let k in data.examine) {
              if (data.examine[k].status == 1) {
                data.examine[k].state = '待受理';
                data.examine[k].color = '#f7c643';
              } else if (data.examine[k].status == 2) {
                data.examine[k].state = '已受理';
                data.examine[k].color = '#00a1f3';
              } else if (data.examine[k].status == -2) {
                data.examine[k].state = '已驳回';
                data.examine[k].color = '#f5222d';
              } else if (data.examine[k].status == 3) {
                data.examine[k].state = '初审公示中';
                data.examine[k].color = '#f7c643';
              } else if (data.examine[k].status == 4) {
                data.examine[k].state = '初审通过';
                data.examine[k].color = '#6f57ff';
              } else if (data.examine[k].status == -4) {
                data.examine[k].state = '初审驳回';
                data.examine[k].color = '#f5222d';
              } else if (data.examine[k].status == 5) {
                data.examine[k].state = '复审公示中';
                data.examine[k].color = '#f7c643';
              } else if (data.examine[k].status == 6) {
                data.examine[k].state = '复审通过';
                data.examine[k].color = '#1aad19';
              } else if (data.examine[k].status == -6) {
                data.examine[k].state = '复审驳回';
                data.examine[k].color = '#f5222d';
              } else if (data.examine[k].status == 7) {
                data.examine[k].state = '终审通过';
                data.examine[k].color = '#001e36';
              } else if (data.examine[k].status == -7) {
                data.examine[k].state = '终审驳回';
                data.examine[k].color = '#f5222d';
              }
            }
          }
          t.setData({
            data: data
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  showReason(e){
    let item = e.currentTarget.dataset.item;
    if (item.reason.length > 0) {
      wx.showModal({
        confirmColor: theme.action,
        title: '审核批注',
        content: item.name+'：'+item.reason,
        showCancel: false,
        confirmText: '关闭'
      })
    }
  },
})