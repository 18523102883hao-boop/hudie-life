const app = getApp();
Page({
  data: {loading:false,loaded:false,error:'',external:false,booking:{},roomTypes:[],roomIndex:0,roomName:'请选择房型',days:[],selectedDays:[],available:false,calendarLoading:false,busy:false,today:'',minCheckout:'',form:{checkin:'',checkout:'',room_count:1,guest_name:'',guest_mobile:''},cancelReason:''},
  onLoad(options) {
    this.orderId=options.order_id;this.calendarSerial=0;this.requestKey='';
    const today=this.dateText(new Date());this.setData({today,'form.checkin':today,'form.checkout':this.nextDate(today),minCheckout:this.nextDate(today)});
    app.util.checkLogin(()=>this.load());
  },
  dateText(date) { return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'); },
  nextDate(value) { const date=new Date(value+'T00:00:00');date.setDate(date.getDate()+1);return this.dateText(date); },
  toast(title) { wx.showToast({title,icon:'none'}); },
  load() {
    if(this.data.loading)return;this.setData({loading:true,error:''});
    app.util.request({url:'order_seckill/getInfo',method:'post',noCache:true,data:{order_id:this.orderId},success:res=>{
      if(res.data.code!=0){this.setData({error:res.data.msg||'加载失败'});return;}
      const info=res.data.data,booking=info.hotel_booking||{};
      if(!booking.is_hotel){this.setData({loaded:false,error:'当前订单不支持酒店预约'});return;}
      this.setData({booking,loaded:true,external:booking.source==='taimu','form.guest_name':info.name||'','form.guest_mobile':info.mobile||''});
      if(booking.source==='taimu'){wx.showModal({title:'预约提示',content:'请前往购买的小程序预约使用',showCancel:false});return;}
      if(booking.can_submit)this.getCalendar();
    },fail:()=>this.setData({error:'网络异常，请重试'}),complete:()=>this.setData({loading:false})});
  },
  changeField(e) { const field=e.currentTarget.dataset.field;this.setData({['form.'+field]:e.detail.value});this.requestKey='';this.updateAvailability(); },
  changeReason(e) { this.setData({cancelReason:e.detail.value}); },
  changeRoom(e) { const roomIndex=Number(e.detail.value);this.setData({roomIndex,roomName:this.data.roomTypes[roomIndex].name});this.requestKey='';this.updateAvailability(); },
  changeCheckin(e) { const checkin=e.detail.value;const patch={'form.checkin':checkin,minCheckout:this.nextDate(checkin)};if(this.data.form.checkout<=checkin)patch['form.checkout']=this.nextDate(checkin);this.setData(patch);this.requestKey='';this.getCalendar(); },
  changeCheckout(e) { this.setData({'form.checkout':e.detail.value});this.requestKey='';this.getCalendar(); },
  updateAvailability() {
    const {form,roomTypes,roomIndex,days,calendarLoading}=this.data,room=roomTypes[roomIndex];
    const selectedDays=days.filter(day=>room && day.room_type_code===room.code && day.date>=form.checkin && day.date<form.checkout);
    const nights=Math.round((new Date(form.checkout+'T00:00:00')-new Date(form.checkin+'T00:00:00'))/86400000),count=Number(form.room_count);
    this.setData({selectedDays,available:!calendarLoading && Number.isInteger(count) && count>0 && nights>0 && selectedDays.length===nights && selectedDays.every(day=>Number(day.is_open)===1 && Number(day.remain)>=count)});
  },
  getCalendar() {
    const serial=++this.calendarSerial;this.setData({calendarLoading:true,days:[],available:false});
    app.util.request({url:'hotel_booking/getCalendar',method:'post',noCache:true,data:{order_id:this.orderId,start_date:this.data.form.checkin,end_date:this.data.form.checkout},success:res=>{
      if(serial!==this.calendarSerial)return;if(res.data.code!=0){this.toast(res.data.msg||'房量查询失败');return;}
      const data=res.data.data||{},roomTypes=data.room_types||[];let roomIndex=this.data.roomIndex;if(roomIndex>=roomTypes.length)roomIndex=0;
      this.setData({roomTypes,roomIndex,roomName:roomTypes[roomIndex]?roomTypes[roomIndex].name:'暂无可约房型',days:data.days||[]});
    },fail:()=>{if(serial===this.calendarSerial)this.toast('房量查询失败，请重试');},complete:()=>{if(serial===this.calendarSerial){this.setData({calendarLoading:false});this.updateAvailability();}}});
  },
  submit() {
    if(this.data.busy||!this.data.available)return;const form=this.data.form;
    if(!form.guest_name.trim())return this.toast('请输入入住人姓名');if(!/^1\d{10}$/.test(form.guest_mobile))return this.toast('请输入正确的手机号');
    if(!this.requestKey)this.requestKey='hotel_'+this.orderId+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    this.setData({busy:true});app.util.request({url:'hotel_booking/submit',method:'post',noCache:true,data:Object.assign({},form,{order_id:this.orderId,room_type_code:this.data.roomTypes[this.data.roomIndex].code,request_key:this.requestKey}),success:res=>{if(res.data.code!=0)return this.toast(res.data.msg||'预约提交失败');this.toast('预约已提交');this.requestKey='';this.load();},fail:()=>this.toast('网络异常，请重试'),complete:()=>this.setData({busy:false})});
  },
  applyCancel() {
    if(this.data.busy)return;if(!this.data.cancelReason.trim())return this.toast('请输入取消原因');
    wx.showModal({title:'申请取消',content:'确认申请取消本次预约？',success:result=>{if(!result.confirm)return;this.setData({busy:true});app.util.request({url:'hotel_booking/applyCancel',method:'post',noCache:true,data:{booking_id:this.data.booking.latest.id,reason:this.data.cancelReason.trim()},success:res=>{if(res.data.code!=0)return this.toast(res.data.msg||'申请失败');this.toast('取消申请已提交');this.load();},fail:()=>this.toast('网络异常，请重试'),complete:()=>this.setData({busy:false})});}});
  }
});

