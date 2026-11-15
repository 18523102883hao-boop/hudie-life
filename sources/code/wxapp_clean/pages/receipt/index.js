const app = getApp();
Page({
  data: {
    app: app,
    house_id: 0,
    path_name: '',
    list: [],
    page: 1,
    limit: 10,
  },

  detail(e){
    let item = e.currentTarget.dataset.item;
    let type = e.currentTarget.dataset.type;
    app.util.request({
      url: 'houseBillPayment/getReceipt',
      data: {
        id: item.id,
      },
      method: 'post',
      success: (res) => {
        wx.downloadFile({
          // 示例 url，并非真实存在
          url: res.data.data,
          success: function (res) {
            const filePath = res.tempFilePath
            if (type == 1) {
              wx.getFileSystemManager().saveFile({
                tempFilePath: filePath, // 使用上一步获取的临时文件路径
                success: function (res) {
                  const savedFilePath = res.savedFilePath;
                  console.log('文件保存成功', savedFilePath);
                  // 可选：提示用户文件已保存
                  wx.showToast({
                    title: '保存成功',
                    icon: 'success'
                  });
                },
                fail: function (err) {
                  console.error('文件保存失败', err);
                  // 可选：提示用户保存失败
                  wx.showToast({
                    title: '保存失败',
                    icon: 'none'
                  });
                }
              });
            } else {
              wx.openDocument({
                filePath: filePath,
                success: function (res) {
                  console.log('打开文档成功')
                }
              })
            }
          }
        })
      }
    })
  },
  
  record(e){
    wx.navigateTo({
      url: '/pages/bill/record?house_id='+this.data.house_id,
    })
  },
  onLoad(options) {
    let t = this;
    app.util.checkLogin(function(){
      t.setData({house_id: options.house_id,path_name: decodeURIComponent(options.path_name)});
      t.getListAll();
    })
  },
  getListAll(){
    let t = this;
    app.util.request({
      url: 'houseBillPayment/index',
      data: {
        house_id: t.data.house_id,
        status: 1,
        page: t.data.page,
        limit: t.data.limit
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0) {
          t.setData({
            list: t.data.list.concat(res.data.data)
          })
        } else {
          app.util.showToast('加载失败!');
        }
      }
    })
  },
  
  onPullDownRefresh() {
    let t = this;
    t.getListAll();
    wx.stopPullDownRefresh();
  }
})