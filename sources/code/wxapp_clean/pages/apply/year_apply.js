const app = getApp();
Page({
  data: {
    app: app,
    data:{"house_id":0,"no":"","name":"","id_card":"","community":"","home_type":"","residential_address":"","mobile":"","house_status":[{"is_rent":"","type":"","area":"","person_num":""},{"is_owner":"","area":"","person_num":""},{"is_company":"","area":"","person_num":""},{"is_rental":"","area":"","person_num":""}],"is_reside":"","is_change":"","is_basic":"","is_hardship":"","per_annual_income":"","prev_overtop":"","source_of_income":"","other":"","old_person_num":"","change_person_num":"","person_num":"","person":[{"relation":"","name":"","id_card":"","sex":"","company":"","is_reside":""},{"relation":"","name":"","id_card":"","sex":"","company":"","is_reside":""},{"relation":"","name":"","id_card":"","sex":"","company":"","is_reside":""},{"relation":"","name":"","id_card":"","sex":"","company":"","is_reside":""}]},
    source_of_income:[0,0,0,0],
  },
  setValue(e){
    let t = this;
    let data = t.data.data;
    let name = e.currentTarget.dataset.name;
    let arr = name.split('.');
    if (arr.length == 3) {
      data[arr[0]][arr[1]][arr[2]] = e.detail.value.join(',');
    } else if (arr.length == 2) {
      console.log(arr)
      data[arr[0]][arr[1]] = e.detail.value;
    } else {
      data[arr[0]] = e.detail.value;
    }
    t.setData({data: data});
  },
  checkChange(e){
    let t = this;
    let data = t.data.data;
    let name = e.currentTarget.dataset.name;
    let val = e.detail.value;
    let arr;
    if (name === undefined) {
      if (typeof val === 'object') {
        val = val.join();
        arr = val.split('.');
        val = arr[3];
      } else {
        arr = val.split('.');
        val = arr[3];
      }
    } else {
      arr = name.split('.');
    }
    if (arr.length == 4) {
      data[arr[0]][arr[1]][arr[2]] = val;
      if (arr[2] === 'type') {
        data.house_status[0].is_rent = 1
      }
    } else if (arr.length == 2) {
      data[arr[0]] = arr[1];
    } else if (arr.length == 3) {
      data[arr[0]][arr[1]] = arr[2];
    } else {
      data[arr[0]] = val;
    }
    t.setData({data:data})
  },
  change0(e){
    let t = this;
    let data = t.data.data;
    if (e.detail.value.length <= 0) {
      data.house_status[0].is_rent = 0;
      data.house_status[0].type = 0;
      t.setData({data:data})
    } else {
      t.checkChange(e);
    }
  },
  change1(e){
    let t = this;
    let data = t.data.data;
    if (e.detail.value.length <= 0) {
      data.house_status[1].is_owner = 0;
      t.setData({data:data})
    } else {
      t.checkChange(e);
    }
  },
  change2(e){
    let t = this;
    let data = t.data.data;
    if (e.detail.value.length <= 0) {
      data.house_status[2].is_company = 0;
      t.setData({data:data})
    } else {
      t.checkChange(e);
    }
  },
  change3(e){
    let t = this;
    let data = t.data.data;
    if (e.detail.value.length <= 0) {
      data.house_status[3].is_rental = 0;
      t.setData({data:data})
    } else {
      t.checkChange(e);
    }
  },
  change4(e){
    let t = this;
    let data = t.data.data;
    if (e.detail.value.length <= 0) {
      data.is_reside = 0;
      t.setData({data:data})
    } else {
      t.checkChange(e);
    }
  },
  change5(e){
    let t = this;
    let data = t.data.data;
    if (e.detail.value.length <= 0) {
      data.is_change = 0;
      t.setData({data:data})
    } else {
      t.checkChange(e);
    }
  },
  change6(e){
    let t = this;
    let data = t.data.data;
    if (e.detail.value.length <= 0) {
      data.is_basic = 0;
      t.setData({data:data})
    } else {
      t.checkChange(e);
    }
  },
  change7(e){
    let t = this;
    let data = t.data.data;
    if (e.detail.value.length <= 0) {
      data.is_hardship = 0;
      t.setData({data:data})
    } else {
      t.checkChange(e);
    }
  },
  change8(e){
    let t = this;
    let data = t.data.data;
    data.source_of_income = e.detail.value.join(',');
    t.setData({data:data,source_of_income:[data.source_of_income.indexOf('工资')>-1,data.source_of_income.indexOf('股票')>-1,data.source_of_income.indexOf('经营性收入')>-1,data.source_of_income.indexOf('其他')>-1]});
  },
  submit() {
    let t = this;
    let data = t.data.data;
    for (let k in data) {
      if (typeof data[k] === 'string') {
        data[k] = data[k].trim();
      }
    }
    if (data.name == '') {
      app.util.showToast('请填写申请人姓名');
    }
    if (data.id_card == '') {
      app.util.showToast('请填写身份证号');
    }
    if (data.id_card.length != 18) {
      app.util.showToast('身份证号格式错误');
    }
    if (data.community == '') {
      app.util.showToast('请填写户口所在地社区');
    }
    if (data.home_type == '') {
      app.util.showToast('请填写家庭类别');
    }
    if (data.residential_address == '') {
      app.util.showToast('请填写家庭现住址');
    }
    if (data.mobile == '') {
      app.util.showToast('请填写联系电话');
    }
    if (!/^1[3-9]\d{9}$/.test(data.mobile)) {
      app.util.showToast('电话号码格式错误');
    }
    if (data.per_annual_income == '') {
      app.util.showToast('请填写家庭人均可支配收入');
    }
    if (data.prev_overtop == 0) {
      app.util.showToast('请填写上年人均收入高于认定标准多少');
    }
    if (data.old_person_num == 0) {
      app.util.showToast('请填写原保障人口数');
    }
    if (data.change_person_num == 0) {
      app.util.showToast('请填写增加（减少）人数');
    }
    if (data.person_num == 0) {
      app.util.showToast('请填写现需保障人数');
    }
    app.util.request({
      url: 'apply/year_save',
      data: {
        data: data
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          app.util.showToast(res.data.msg, 1500, 'success');
          setTimeout(function(){
            wx.navigateBack();
          }, 1500)
        } else {
          app.util.showToast(res.data.msg);
        }
      }
    });
  },
})