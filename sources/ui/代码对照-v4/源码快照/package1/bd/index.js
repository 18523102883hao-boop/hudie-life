const app = getApp()
Page({
  data: {
    app: app,
    account: {},
    shop: {},
    start: '开始日期',
    end: '结束日期'
  },
  bindDateChange(e) {
    let that = this;
    that.setData({
      start: e.detail.value,
    })
  },
  bindDateChange2(e) {
    let that = this;
    that.setData({
      end: e.detail.value,
    })
  },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  //跳转页面
  goto(e) {
    wx.navigateTo({
      url: e.currentTarget.dataset.url
    })
  },
  getDateRange() {
    let today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    let day = today.getDate();
    let xq = today.getDay();
    xq = xq == 0 ? 7 : xq;
    let lastDay = new Date(year, month, day-1);
    let startOfWeek = new Date(year, month, day-(xq-1));
    let endOfWeek = new Date(year, month, day+(7-xq));
    let startOfLastWeek = new Date(year, month, day-(xq-1)-7);
    let endOfLastWeek = new Date(year, month, day+(7-xq)-7);
    let quarter = Math.floor(month / 3);
    let startOfMonth = new Date(year, month, 1);
    let endOfMonth = new Date(year, month + 1, 0);
    let startOfLastMonth = new Date(year, month - 1, 1);
    let endOfLastMonth = new Date(year, month, 0);
    let startOfQuarter = new Date(year, quarter * 3, 1);
    let endOfQuarter = new Date(year, quarter * 3 + 3, 0);
    let startOfLastQuarter = new Date(year, (quarter - 1) * 3, 1);
    let endOfLastQuarter = new Date(year, quarter * 3, 0);
    let startOfYear = new Date(year, 0, 1);
    let endOfYear = new Date(year, 11, 31);
    return {
      today,
      startOfLastWeek,
      endOfLastWeek,
      startOfWeek,
      endOfWeek,
      lastDay,
      startOfMonth,
      endOfMonth,
      startOfLastMonth,
      endOfLastMonth,
      startOfQuarter,
      endOfQuarter,
      startOfLastQuarter,
      endOfLastQuarter,
      startOfYear,
      endOfYear,
    };
  },
  setTime(e){
    var t = this;
    var f = e.currentTarget.dataset.field
    if (f == 1) {
      t.setData({
        start: t.getDate('today'),
        end: t.getDate('today'),
      });
    } else if (f == 2) {
      t.setData({
        start: t.getDate('lastDay'),
        end: t.getDate('lastDay'),
      });
    } else if (f == 3) {
      t.setData({
        start: t.getDate('startOfWeek'),
        end: t.getDate('endOfWeek'),
      });
    } else if (f == 4) {
      t.setData({
        start: t.getDate('startOfLastWeek'),
        end: t.getDate('endOfLastWeek'),
      });
    } else if (f == 5) {
      t.setData({
        start: this.getDate('startOfMonth'),
        end: this.getDate('endOfMonth'),
      });
    } else if (f == 6) {
      t.setData({
        start: this.getDate('startOfLastMonth'),
        end: this.getDate('endOfLastMonth'),
      });
    }
    t.getStat();
  },
  getDate(field){
    var dateRange = this.getDateRange();
    let year = dateRange[field].getFullYear();
    let month = dateRange[field].getMonth() + 1;
    let day = dateRange[field].getDate();
    month = month < 10 ? '0'+month : month;
    day = day < 10 ? '0'+day : day;
    return year+'-'+month+'-'+day;
  },
  onLoad(options) {
    let t = this;
    t.setData({
      start: t.getDate('startOfMonth'),
      end: t.getDate('endOfMonth'),
    });
    app.util.checkLogin(function(){
      t.setData({
        account: wx.getStorageSync('userinfo'),
        shop: wx.getStorageSync('shop')
      })
      t.getStat();
    })
  },
  getStat() {
    var t = this;
    app.util.request({
      url: 'bd/getStat',
      method: 'post',
      data: {
        start: t.data.start,
        end: t.data.end,
      },
      success(res){
        if (res.data.code == 0) {
          wx.setNavigationBarTitle({
            title: res.data.data.name,
          })
          let list = res.data.data.list;
          let verify_num = 0;
          let verify_amount = 0;
          let commission = 0;
          for (let k in list) {
            verify_num += parseInt(list[k].verify_num);
            verify_amount += list[k].verify_amount;
            commission += list[k].commission;
            list[k].verify_amount = app.util.setPrice(list[k].verify_amount);
            list[k].commission = app.util.setPrice(list[k].commission);
          }
          t.setData({
            list:list,
            verify_num:verify_num,
            verify_amount:app.util.setPrice(verify_amount),
            commission:app.util.setPrice(commission)
          });
        } else {
          app.util.showToast(res.data.msg);
          setTimeout(function(){
            wx.redirectTo({
              url: '/pages/mine/mine',
            })
          },1000);
        }
      }
    });
  },
  back() {
    wx.navigateBack()
  }
})