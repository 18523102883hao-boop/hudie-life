const app = getApp()
Page({
  data: {
    app: app,
    list: []
  },
  onLoad(options) {
    this.setData({list:JSON.parse(decodeURIComponent(options.data))})
    console.log(this.data)
  },
  callPhone(e){
    wx.makePhoneCall({
      phoneNumber: e.currentTarget.dataset.phone,
      success(res){
      }
    })
  },
  daohang(e){
    let item = e.currentTarget.dataset.item
    wx.openLocation({
      latitude: Number(item.lat),
      longitude: Number(item.lng),
      name: item.name,
      address: item.province + item.city + item.county + item.address
    })
  },
})