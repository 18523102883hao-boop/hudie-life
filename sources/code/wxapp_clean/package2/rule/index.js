const app = getApp()
Page({
  data: {
    app: app,
    node:'',
    type: '',
    id: 0
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({type:options.type,id:options.id});
      t.getRule();
    })
  },
  getRule() {
    let t = this
    app.util.getE({ type:t.data.type,id:t.data.id }).then(resolve => {
      t.setData({
        node: resolve.content.replace(/<img/gi, '<img style="max_width:100%;height:auto;margin:0 auto;display:block;"')
      })
      wx.setNavigationBarTitle({
        title: resolve.name ? resolve.name : app.name,
      })
    })
  }
})