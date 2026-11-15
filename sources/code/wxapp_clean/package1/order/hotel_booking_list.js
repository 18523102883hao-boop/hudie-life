const app=getApp();
Page({
  data:{items:[],page:1,loading:false,ended:false,error:'',filterIndex:0,filters:[{name:'全部',value:''},{name:'待确认',value:'pending'},{name:'等待确认',value:'notify_pending'},{name:'已确认',value:'confirmed'},{name:'取消待审核',value:'cancel_pending'},{name:'退款处理中',value:'refund_pending'},{name:'已取消',value:'cancelled'},{name:'已拒绝',value:'rejected'},{name:'预约失败',value:'failed'}]},
  onShow(){app.util.checkLogin(()=>this.reset());},
  onReachBottom(){this.getList();},
  onPullDownRefresh(){this.reset();},
  changeFilter(e){if(this.data.loading)return;this.setData({filterIndex:Number(e.detail.value)});this.reset();},
  reset(){if(this.data.loading)return;this.setData({items:[],page:1,ended:false});this.getList();},
  open(e){wx.navigateTo({url:'/package1/order/hotel_booking_info?booking_id='+e.currentTarget.dataset.id});},
  getList(){
    if(this.data.loading||this.data.ended)return;this.setData({loading:true,error:''});
    app.util.request({url:'hotel_booking/merchantList',method:'post',noCache:true,data:{status:this.data.filters[this.data.filterIndex].value,page:this.data.page},success:res=>{
      if(res.data.code!=0){this.setData({error:res.data.msg||'加载失败'});return;}
      const data=res.data.data||{},list=data.items||[],items=this.data.items.concat(list);
      this.setData({items,page:this.data.page+1,ended:!list.length || items.length>=Number(data.total)});
    },fail:()=>this.setData({error:'网络异常'}),complete:()=>{this.setData({loading:false});wx.stopPullDownRefresh();}});
  }
});
