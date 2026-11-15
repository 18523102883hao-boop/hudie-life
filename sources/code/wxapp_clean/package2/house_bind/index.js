const app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    app: app,
    step: 1,
    mobile: '',
    residential_list: [],
    building_list: [],
    unit_list: [],
    floor_list: [],
    house_list: [],
    residential_id: 0,
    building_id: 0,
    unit_id: 0,
    floor_id: 0,
    house_id: 0,
    title_arr: ["","选择小区","选择楼栋","选择单元","选择楼层","选择房屋","身份确认"]
  },
  back(){
    let t = this;
    if (t.data.step == 1) {
      wx.navigateBack();
    } else if (t.data.step == 6) {
      t.setData({step:5})
    } else {
      let data = t.data;
      data.step = 1;
      data.path_name = '';
      data.building_list = [];
      data.unit_list = [];
      data.floor_list = [];
      data.house_list = [];
      data.building_id = [];
      data.unit_id = [];
      data.floor_id = [];
      data.house_id = [];
      t.setData(data);
    }
  },
  sel(e){
    let field = e.currentTarget.dataset.field;
    let value = e.currentTarget.dataset.value;
    let step = e.currentTarget.dataset.step;
    let path_name = e.currentTarget.dataset.path_name;
    let t = this;
    let data = t.data;
    data[field] = value;
    data.step = step;
    data.path_name = path_name;
    if (step == 2) {
      data.building_list = [];
      data.unit_list = [];
      data.floor_list = [];
      data.house_list = [];
      data.building_id = [];
      data.unit_id = [];
      data.floor_id = [];
      data.house_id = [];
      t.getBuildingList();
    } else if (step == 3) {
      data.unit_list = [];
      data.floor_list = [];
      data.house_list = [];
      data.unit_id = [];
      data.floor_id = [];
      data.house_id = [];
      t.getUnitList();
    } else if (step == 4) {
      data.floor_list = [];
      data.house_list = [];
      data.floor_id = [];
      data.house_id = [];
      t.getFloorList();
    } else if (step == 5) {
      data.house_list = [];
      data.house_id = [];
      t.getHouseList();
    } else {
      let index = e.currentTarget.dataset.index;
      let house = data.house_list[index];
      if (house.has_landlord <= 0) {
        app.util.showToast('该房屋未绑定承租人');
        data.step = 5;
      }
    }
    t.setData(data);
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.getResidentialList();
      let userinfo = wx.getStorageSync('userinfo');
      t.setData({mobile: userinfo.mobile})
    })
  },

  getResidentialList() {
    let t = this;
    app.util.request({
      url:'residential/getListAll',
      method: 'post',
      data: {a:1},
      success(res) {
        if (res.data.code == 0) {
          t.setData({residential_list: res.data.data})
        } else {
          app.util.showToast(res.data.msg, 1500);
        }
      }
    })
  },
  getBuildingList() {
    let t = this;
    app.util.request({
      url:'building/getListAll',
      method: 'post',
      data: {residential_id: t.data.residential_id},
      success(res) {
        if (res.data.code == 0) {
          t.setData({building_list: res.data.data})
        } else {
          app.util.showToast(res.data.msg, 1500);
        }
      }
    })
  },
  getUnitList() {
    let t = this;
    app.util.request({
      url:'unit/getListAll',
      method: 'post',
      data: {building_id: t.data.building_id},
      success(res) {
        if (res.data.code == 0) {
          t.setData({unit_list: res.data.data})
        } else {
          app.util.showToast(res.data.msg, 1500);
        }
      }
    })
  },
  getFloorList() {
    let t = this;
    app.util.request({
      url:'floor/getListAll',
      method: 'post',
      data: {unit_id: t.data.unit_id},
      success(res) {
        if (res.data.code == 0) {
          t.setData({floor_list: res.data.data})
        } else {
          app.util.showToast(res.data.msg, 1500);
        }
      }
    })
  },
  getHouseList() {
    let t = this;
    app.util.request({
      url:'house/getListAll',
      method: 'post',
      data: {floor_id: t.data.floor_id},
      success(res) {
        if (res.data.code == 0) {
          t.setData({house_list: res.data.data})
        } else {
          app.util.showToast(res.data.msg, 1500);
        }
      }
    })
  },
  submit(){
    let t = this;
    let data = {
      house_id: t.data.house_id,
      name: t.data.name,
      id_card: t.data.id_card
    };
    if (!data.name) {
      return app.util.showToast('请填写承租人姓名');
    }
    if (!data.id_card) {
      return app.util.showToast('请填写承租人身份证后六位');
    }
    wx.showLoading()
    app.util.request({
      url:'house/bindLandlord',
      method: 'post',
      data: data,
      success(res) {
        wx.hideLoading()
        if (res.data.code == 0) {
          app.util.showToast(res.data.msg, 1500, 'success');
          setTimeout(function(){
            wx.redirectTo({url: '/pages/mine/mine'});
          }, 1200)
        } else {
          app.util.showToast(res.data.msg, 1500);
        }
      }
    })
  }
})