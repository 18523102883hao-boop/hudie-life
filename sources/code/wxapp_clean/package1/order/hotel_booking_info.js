const app=getApp();
Page({
  data:{info:{},loading:false,busy:false,error:'',reason:'',auditReason:''},
  onLoad(options){this.bookingId=options.booking_id;app.util.checkLogin(()=>this.load());},
  toast(title){wx.showToast({title,icon:'none'});},
  changeReason(e){this.setData({reason:e.detail.value});},
  changeAuditReason(e){this.setData({auditReason:e.detail.value});},
  load(){
    if(this.data.loading)return;this.setData({loading:true,error:''});
    app.util.request({url:'hotel_booking/merchantInfo',method:'post',noCache:true,data:{booking_id:this.bookingId},success:res=>{if(res.data.code!=0){this.setData({error:res.data.msg||'加载失败'});return;}this.setData({info:res.data.data||{}});},fail:()=>this.setData({error:'网络异常'}),complete:()=>this.setData({loading:false})});
  },
  confirmBooking(){this.act('merchantConfirm');},
  rejectBooking(){this.act('merchantReject');},
  act(action){if(this.data.busy||this.data.loading)return;if(action==='merchantReject'&&!this.data.reason.trim())return this.toast('请填写拒绝原因');this.confirm(action==='merchantConfirm'?'确认接受本次预约？':'确认拒绝本次预约？',action,{booking_id:this.bookingId,reason:this.data.reason.trim()});},
  approveCancel(){this.audit(true);},
  rejectCancel(){this.audit(false);},
  audit(approve){if(this.data.busy||this.data.loading)return;if(!approve&&!this.data.auditReason.trim())return this.toast('请填写拒绝原因');this.confirm(approve?'确认同意取消本次预约？':'确认拒绝本次取消申请？','auditCancel',{application_id:this.data.info.cancel_application.id,approve:approve?1:0,reason:this.data.auditReason.trim()});},
  confirm(content,action,data){
    wx.showModal({title:'操作确认',content,success:result=>{if(!result.confirm||this.data.busy)return;this.setData({busy:true});app.util.request({url:'hotel_booking/'+action,method:'post',noCache:true,data,success:res=>{if(res.data.code!=0)return this.toast(res.data.msg||'操作失败');this.toast('操作成功');this.setData({reason:'',auditReason:'',info:{}});this.load();},fail:()=>this.toast('网络异常，请重试'),complete:()=>this.setData({busy:false})});}});
  }
});
