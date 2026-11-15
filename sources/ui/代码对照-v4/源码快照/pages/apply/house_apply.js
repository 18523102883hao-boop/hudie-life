const theme = require('../../utils/theme.js');
const app = getApp();
Page({
  data: {
    app: app,
    data:{"id":0,"residential_id":0,"name":"","sex":"","id_card":"","domiciliary_register":"","person_num":"","residential_address":"","mobile":"","total_annual_income":"","per_annual_income":"","person":[{"relation":"","name":"","id_card":"","company":"","annual_income":"","remark":""},{"relation":"","name":"","id_card":"","company":"","annual_income":"","remark":""},{"relation":"","name":"","id_card":"","company":"","annual_income":"","remark":""},{"relation":"","name":"","id_card":"","company":"","annual_income":"","remark":""},{"relation":"","name":"","id_card":"","company":"","annual_income":"","remark":""},{"relation":"","name":"","id_card":"","company":"","annual_income":"","remark":""}],"house":[{"name":"","addr":"","type":"","property_owner":"","building_area":"","use_area":"","per_area":""},{"name":"","addr":"","type":"","property_owner":"","building_area":"","use_area":"","per_area":""},{"name":"","addr":"","type":"","property_owner":"","building_area":"","use_area":"","per_area":""},{"name":"","addr":"","type":"","property_owner":"","building_area":"","use_area":"","per_area":""},{"name":"","addr":"","type":"","property_owner":"","building_area":"","use_area":"","per_area":""},{"name":"","addr":"","type":"","property_owner":"","building_area":"","use_area":"","per_area":""}],"remark_id_card":"","remark_id_card_imgs":[],"remark_hukou":"","remark_hukou_imgs":[],"remark_marriage_certificate":"","remark_marriage_certificate_imgs":[],"remark_income_certificate":"","remark_income_certificate_imgs":[],"remark_house_certificate":"","remark_house_certificate_imgs":[],"remark_special_certificate":"","remark_special_certificate_imgs":[],"num":0}
  },
  setValue(e){
    let t = this;
    let data = t.data.data;
    let name = e.currentTarget.dataset.name;
    let arr = name.split('.');
    if (arr.length == 3) {
      data[arr[0]][arr[1]][arr[2]] = e.detail.value;
    } else {
      data[arr[0]] = e.detail.value;
    }
    t.setData({data: data});
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
    if (data.sex == '') {
      app.util.showToast('请填写性别');
    }
    if (data.id_card == '') {
      app.util.showToast('请填写身份证号');
    }
    if (data.id_card.length != 18) {
      app.util.showToast('身份证号格式错误');
    }
    if (data.domiciliary_register == '') {
      app.util.showToast('请填写户籍地址');
    }
    if (data.person_num == '') {
      app.util.showToast('请填写家庭人口');
    }
    if (data.residential_address == '') {
      app.util.showToast('请填写居住地址');
    }
    if (data.mobile == '') {
      app.util.showToast('请填写电话');
    }
    if (!/^1[3-9]\d{9}$/.test(data.mobile)) {
      app.util.showToast('电话号码格式错误');
    }
    if (data.total_annual_income == '') {
      app.util.showToast('请填写家庭可支配收入');
    }
    if (data.per_annual_income == '') {
      app.util.showToast('请填写家庭人均可支配收入');
    }
    if (data.remark_id_card_imgs.length == 0) {
      app.util.showToast('请上传本人身份证复印件');
    }
    if (data.remark_hukou_imgs.length == 0) {
      app.util.showToast('请上传家庭户口簿复印件');
    }
    if (data.remark_marriage_certificate_imgs.length == 0) {
      app.util.showToast('请上传婚姻证明');
    }
    if (data.remark_income_certificate_imgs.length == 0) {
      app.util.showToast('请上传家庭成员收入证明原件');
    }
    if (data.remark_house_certificate_imgs.length == 0) {
      app.util.showToast('请上传家庭成员住房证明原件及复印件');
    }
    if (data.remark_special_certificate_imgs.length == 0) {
      app.util.showToast('请上传特殊证明文件');
    }
    app.util.request({
      url: 'apply/save',
      data: data,
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
  delImg(e) {
    let t = this;
    let src = e.currentTarget.dataset.src;
    let field = e.currentTarget.dataset.field
    let data = t.data.data;
    wx.showModal({
      confirmColor: theme.action,
      title: '提示',
      content: '请选择要执行的操作',
      cancelText: '查看图片',
      confirmText: '删除图片',
      complete: (res) => {
        if (res.cancel) {
          t.viewImgs(e);
        }
        if (res.confirm) {
          let arr = [];
          for (let k in data[field]) {
            if (data[field][k] !== src) {
              arr.push(data[field][k]);
            }
          }
          data[field] = arr;
          t.setData({data:data});
          t.calImgNum();
        }
      }
    })
  },
  calImgNum(){
    let t = this;
    let data = t.data.data;
    data.num = data.remark_id_card_imgs.length + data.remark_hukou_imgs.length + data.remark_marriage_certificate_imgs.length + data.remark_income_certificate_imgs.length + data.remark_house_certificate_imgs.length + data.remark_special_certificate_imgs.length;
    t.setData({data:data})
  },
  viewImgs(e){
    let t = this;
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: t.data.data[e.currentTarget.dataset.field],
    })
  },
  upImg(e){
    let t = this;
    let field = e.currentTarget.dataset.name;
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album','camera'],
      success: function(res){
        let tempFiles = res.tempFiles;
        for (let k in tempFiles) {
          wx.uploadFile({
            url: app.domain+'home/upload',
            filePath: tempFiles[k].tempFilePath,
            name: 'image',
            formData: {
              path: 'images'
            },
            success: (res) => {
              res = JSON.parse(res.data);
              if (res.code == 0) {
                let list = res.data;
                let data = t.data.data;
                data[field].push(list.src);
                t.setData({
                  data: data
                })
                t.calImgNum();
              } else {
                app.util.showToast('加载失败!');
              }
            }
          })
        }
      }
    })
  },
})