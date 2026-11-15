const theme = require('../../utils/theme');
const app = getApp()
Page({
  data: {
    app: app,
    is_get: 0,
    reward_list: [],
    my_reward_list: [],
    reward_num: 0,
    reward_info: '',
    invite_num: 0,
    order_num: 0,
    page: 1,
    size: 10,
    show_rule: 0,
    tableList: [
      { id: '1', type: 'prize', name: '奖品1', isSelected: false },
      { id: '2', type: 'prize', name: '奖品2', isSelected: false },
      { id: '3', type: 'prize', name: '奖品3', isSelected: false },
      { id: '4', type: 'prize', name: '奖品6', isSelected: false },
      { id: '5', type: 'prize', name: '奖品5', isSelected: false },
      { id: '6', type: 'prize', name: '奖品4', isSelected: false },
    ],
    tableList_old: [
      { id: '1', type: 'prize', name: '奖品1', isSelected: false },
      { id: '2', type: 'prize', name: '奖品2', isSelected: false },
      { id: '3', type: 'prize', name: '奖品3', isSelected: false },
      { id: '4', type: 'prize', name: '奖品8', isSelected: false },
      { id: '5', type: 'btn', name: '抽奖', isSelected: false },
      { id: '6', type: 'prize', name: '奖品4', isSelected: false },
      { id: '7', type: 'prize', name: '奖品7', isSelected: false },
      { id: '8', type: 'prize', name: '奖品6', isSelected: false },
      { id: '9', type: 'prize', name: '奖品5', isSelected: false },
    ],
    numArr: {1:'一',2:'二',3:'三',4:'四',5:'五',6:'六',7:'七',8:'八',9:'九',10:'十'},
    isTurnOver: true, //抽奖状态，是否旋转完（九宫格）
  },
  hideRule(){
    this.setData({show_rule: 0})
  },
  toGet(e){
    let t = this;
    let reward_info = e.currentTarget.dataset.item;
    if (reward_info.is_get != 0 || reward_info.auto_send != 0) {
      return;
    }
    let reward = JSON.parse(reward_info.reward);
    let page;
    if (reward.type == 1) {
      page = '/pages/goods/place';
    } else if (reward.type == 2) {
      page = '/pages/product/place';
    } else if (reward.type == 3) {
      page = '/pages/goods_group/place';
    } else {
      return;
    }
    app.switchTab(page+'?id='+reward.obj_id+'&reward_id='+reward_info.id);
  },
  selGift(e){
    this.setData({first_gift_index: e.currentTarget.dataset.index});
  },
  switchTab(e) {
    app.switchTab(e, this.data.selected);
  },
  //返回
  back(){
    app.back();
  },
  onLoad(options) {
    if (options.user_id > 0) {
      t.setData({user_id:options.user_id})
      app.bindPid(options.user_id);
      util.request({
        url: 'activity/addRewardNum',
        data: {
          user_id: options.user_id
        },
        method: 'post'
      })
    }
  },
  onShow() {
    let t = this
    app.util.checkLogin(function(){
      t.setData({userinfo:wx.getStorageSync('userinfo')});
      t.getUserInfo();
    });
  },
  getUserInfo() {
    let t = this
    app.util.request({
      url: 'user/getInfo',
      data: {
        get_reward: 1,
      },
      method: 'post',
      success: (res) => {
        if (res.data.code == 0 && res.data.data) {
          t.setData({
            userinfo: res.data.data,
            reward_num: res.data.data.reward_num,
            reward_list: res.data.data.reward_list,
            my_reward_list: res.data.data.my_reward_list,
          })
        }
      }
    })
  },
  showRule(e){
    let type = e.currentTarget.dataset.type;
    let str = '';
    if (type == 1) {
      str = '每天邀请好友参与抽奖活动，可获得2次抽奖次数';
    } else if (type == 3) {
      return this.setData({show_rule: 1})
    } else {
      str = '每天自购首单砍价产品，可获得1次抽奖次数';
    }
    wx.showModal({
      confirmColor: theme.action,
      title: '提示',
      content: str,
      showCancel: false,
      confirmText: '我知道了'
    })
  },
  toBuy(){
    app.switchTab('/pages/goods/list')
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    let t = this;
    return {
      title: app.name+'-幸运抽奖',
      path: '/pages/activity/nine_square_grid?user_id='+t.data.userinfo.id,
      imageUrl: app.domain + app.share_img
    }
  },
  
  dd() {
    let t = this;
    let order_arr = [0, 1, 2, 5, 4, 3];
    let tableList = t.data.tableList
    const rand = (m, n) => {
      return Math.ceil(Math.random() * (n - m + 1) + m - 1);
    };
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        // 清理掉选中的状态
        tableList.forEach((e) => {
          e.isSelected = false;
        });
        // 执行到第几个就改变它的选中状态
        tableList[order_arr[i]].isSelected = true;
        // 更新状态
        t.setData({
          tableList: tableList,
        });
        if (i==5) {
          setTimeout(function(){
            if (t.data.reward_info == '') {
              t.dd();
            } else if (t.data.reward_info === 1) {

            } else {
              t.lottery(rand(1, 6));
            }
          }, 90)
        }
      }, 90*i);
    }
  },
  closeAlert(){
    this.setData({showAlert:0});
  },
  onPrizeClick() {
    //如果不在抽奖状态中，则执行抽奖旋转动画
    if (this.data.isTurnOver) {
      let t = this;
      t.setData({isTurnOver: false,reward_info: ''})
      t.dd();
      app.util.request({
        url: 'activity/getReward9',
        method: 'post',
        data: {a:1},
        success(res) {
          if (res.data.code == 0) {
            let userinfo = t.data.userinfo;
            userinfo.reward_num--;
            t.setData({reward_info:res.data.data,userinfo:userinfo});
          } else {
            t.setData({reward_info:1,isTurnOver:true});
            app.util.showToast(res.data.msg);
          }
        }
      })
    } else {
      app.util.showToast('请勿重复点击');
    }
  },

  // 抽奖旋转动画方法
  lottery(prize_id) {
    console.log('中奖ID：' + prize_id);
    /*
     * 数组的长度就是最多所转的圈数，最后一圈会转到中奖后的位置
     * 数组里面的数字表示从一个奖品跳到另一个奖品所需要的时间
     * 数字越小速度越快
     * 想要修改圈数和速度的，更改数组个数和大小即可
     */
    // let num_interval_arr = [90, 80, 70, 60, 50, 50, 50, 100, 150, 250];
    let num_interval_arr = [90, 80, 70, 60, 250];
    // 旋转的总次数
    let sum_rotate = num_interval_arr.length;
    // 每一圈所需要的时间
    let interval = 0;
    num_interval_arr.forEach((delay, index) => {
      setTimeout(() => {
        this.rotateCircle(delay, index + 1, sum_rotate, prize_id);
      }, interval);
      //因为每一圈转完所用的时间是不一样的，所以要做一个叠加操作
      interval += delay * 6;
    });
  },

  /**
   *
   * @param {*} delay 表示一个奖品跳到另一个奖品所需要的时间
   * @param {*} index 表示执行到第几圈
   * @param {*} sum_rotate 表示旋转的总圈数
   * @param {*} prize_id 中奖的id号
   */
  rotateCircle(delay, index, sum_rotate, prize_id) {
    // console.log(index)
    let _this = this;
    /*
     * 页面中奖项的实际数组下标
     * 0  1  2
     * 3     5
     * 6  7  8
     * 所以得出转圈的执行顺序数组为 ↓
     */
    let order_arr = [0, 1, 2, 5, 4, 3];
    // 页面奖品总数组
    let tableList = this.data.tableList;
    // 如果转到最后一圈，把数组截取到奖品项的位置
    if (index == sum_rotate) {
      order_arr.splice(prize_id);
    }
    for (let i = 0; i < order_arr.length; i++) {
      setTimeout(() => {
        // 清理掉选中的状态
        tableList.forEach((e) => {
          e.isSelected = false;
        });
        // 执行到第几个就改变它的选中状态
        tableList[order_arr[i]].isSelected = true;
        // 更新状态
        _this.setData({
          tableList: tableList,
        });
        // 如果转到最后一圈且转完了，把抽奖状态改为已经转完了
        if (index == sum_rotate && i == order_arr.length - 1) {
          console.log(_this.data.reward_info.msg, /^\d+积分$/.test(_this.data.reward_info.msg));
          _this.setData({
            isTurnOver: true,
            showAlert: 1,
            is_integral: /^\d+积分$/.test(_this.data.reward_info.msg)
          });
          //弹窗
          /*
          wx.showModal({
            confirmColor: theme.action,
            title: '恭喜您',
            content: '抽中 '+_this.data.reward_info.msg,
            confirmText: '我知道了',
            showCancel: false,
            complete: (res) => {
              let old_list = _this.data.my_reward_list;
              let list = [
                _this.data.reward_info
              ];
              for (var i in old_list) {
                list.push(old_list[i]);
              }
              _this.setData({my_reward_list: list,reward_num:_this.data.reward_num-1});
              let reward_info = _this.data.reward_info;
              if (reward_info.type == 4) {
                //显示地址录入弹窗
                reward_info.reward = JSON.parse(reward_info.reward);
                _this.setData({show_addr: 1, reward_goods: reward_info, first_get: 0});
              }
            }
          })
          */
        }
      }, delay * i);
    }
  },
})