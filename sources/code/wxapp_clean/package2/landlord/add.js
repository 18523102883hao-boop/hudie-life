const app = getApp();
Page({
  data: {
    app: app,
    house_id: 0,
    name: '',
    mobile: '',
    id_card: ''
  },

  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({house_id: options.house_id,path_name: decodeURIComponent(options.path_name)});
    })
  },
  add(){
    let t = this;
    let data = {
      house_id: t.data.house_id,
      name: t.data.name,
      mobile: t.data.mobile,
      id_card: t.data.id_card
    };
    if (!data.name) {
      return app.util.showToast('请填写姓名');
    }
    app.util.request({
      url: 'landlord/add',
      data: data,
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          app.util.showToast(res.data.msg, 1500, 'success');
          let pages = getCurrentPages();
          let prevPage = pages[pages.length - 2];
          prevPage.getLandlordList(prevPage);
          setTimeout(function(){
            wx.navigateBack()
          }, 1200)
        } else {
          app.util.showToast(res.data.msg);
        }
      }
    })
  }
})