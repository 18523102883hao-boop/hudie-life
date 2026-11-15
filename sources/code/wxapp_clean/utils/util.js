const theme = require('./theme');
import {
  base64_encode,
  base64_decode
} from 'base64';
import WxmpRsa from 'wxmp-rsa'
import md5 from 'md5';
const catalogProtocol = require('./catalog-protocol');
var util = {};
util.base64_encode = function (str) {
  return base64_encode(str)
};
util.base64_decode = function (str) {
  return base64_decode(str)
};
util.md5 = function (str) {
  return md5(str)
};
util.setImgSize = function(item, width, height) {
  let scale;
  if (item.img_height == 0 || item.img_width == 0) {
    item.show_height = height;
    item.show_width = width;
    item.show_offset_width = 0;
    item.show_offset_height = 0;
  } else {
    scale = item.img_width > item.img_height ? item.img_height/height : item.img_width/width;
    if (item.img_width < item.img_height) {
      scale = width/item.img_width;
      item.show_height = item.img_height*scale;
      item.show_width = width;
    } else {
      scale = height/item.img_height;
      item.show_height = height;
      item.show_width = item.img_width*scale;
    }
    item.show_offset_width = (width - item.show_width)/2;
    item.show_offset_height = (height - item.show_height)/2;
  }
  return item;
};
util.getData = function (obj) {
  let params = {};
  if (!obj.data) {
    obj.data = {v:1};
  }
  params.data = util.rsaEncode(obj.data);
  let timestamp = (new Date().getTime() / 1000).toFixed(0);
  let nonce = Math.random().toString().substring(2,8);
  let key = util.rsaEncode({timestamp:timestamp,nonce:nonce});
  let headers = obj.headers ? obj.headers : {};
  headers.timestamp = timestamp;
  headers.nonce = nonce;
  let userinfo = wx.getStorageSync('userinfo')
  headers.token = userinfo && userinfo.openid ? userinfo.openid : 'no-token';
  headers.key = key;
  headers.sign = util.getSign(params, timestamp, nonce, key);
  return [params, headers];
}
util.rsaEncode = function (obj) {
  // 实例化rsa
  const rsa = new WxmpRsa()
  // 定义待加密的字符串
  const str = encodeURI(JSON.stringify(obj));
  // 定义公钥
  const publicKey = `
    -----BEGIN PUBLIC KEY-----
    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApuTHGBhMOg4YeHBRQ4Ii
    cTJuouTD+d/nWOmHvvWcXxQXs+8F71wC6MUh1vdQUY6d6lbHSMCZZDViU0mvinQ5
    Uqp+DP8Yj4OKnr73J+1tbCBo2KfMXz5yMwiRCuk/Zpab7VW0cfnTpWH1pwQHv616
    LBD9OR7RdaaPhZ53StdHKPUANueN0rlrZ6o8/37AqksG8ZGO4ug2iYrQ3Ry5PYNK
    FfI6uQfBrZqULNF/hGcop0Wc8GPSwVHeQBi2XtEowaGuwTC2wiCp2AkTvPKodH4R
    LezGBT3djHr1/99YfJV/Y1r9v9nHzF4OMRS1Hx+GKFvoJIXMj9xftr1ZAfD3Fzl1
    qQIDAQAB
    -----END PUBLIC KEY-----
  `
  // 设置公钥
  rsa.setPublicKey(publicKey)
  // 加密
  const cryptStr = rsa.encryptLong(str)
  return cryptStr;
}
/**
  构造接口地址, 
  @params action 接口的路径，格式为 'wxapp/home/navs'
  @params querystring 格式为 {参数名1 : 值1, 参数名2 : 值2}
*/
util.api = function (action, querystring) {
  var app = getApp();
  var url = app.domain;
  if (action) url += action;
  if (querystring && typeof querystring === 'object') {
    for (let param in querystring) {
      if (param && querystring.hasOwnProperty(param) && querystring[param]) {
        url += '&' + param + '=' + querystring[param];
      }
    }
  }
  return url;
}
util.getSign = function (data, timestamp, nonce, key) {
  let params = '';
  let keys = Object.keys(data).sort();
  for (let k in keys) {
    if (data[keys[k]] === null || data[keys[k]] === '') {
      continue;
    }
    params += ''+keys[k]+data[keys[k]];
  }
  let str = (params + key + timestamp + nonce).replaceAll(' ', '');
  return util.md5(str).toLowerCase();
}
util.checkLogin = function(func){
  var app = getApp();
  var i = 0;
  var userinfo = null;
  var ti = setInterval(function(){
    i++;
    if (i > 20) {
      clearInterval(ti);
      app.switchTab('/pages/index/index')
      return false;
    }
    userinfo = wx.getStorageSync('userinfo');
    if (userinfo.id > 0) {
      clearInterval(ti);
      func()
    }
  }, 200);
}
/**
二次封装微信wx.request函数、增加交互体全、配置缓存、以及配合格式化返回数据
@params option 弹出参数表，
{
  url : 同微信,
  data : 同微信,
  header : 同微信,
  method : 同微信,
  success : 同微信,
  fail : 同微信,
  complete : 同微信,
  cachetime : 缓存周期，在此周期内不重复请求http，默认不缓存
}
*/
util.request = function (option) {
  var app = getApp();
  var option = option ? option : {};
  // 参数化商品接口禁止 URL 级缓存，网络失败也不能读取其他筛选的旧结果。
  option.noCache = option.noCache === true || catalogProtocol.noCache(option.url);
  option.publicBrowse = option.publicBrowse === true || catalogProtocol.publicBrowse(option.url);
  if (catalogProtocol.isScoped(option.url) && !option._catalogPrepared && !(option.data && option.data.contract_version == 2)) {
    return catalogProtocol.prepare(option, input => util.request(input)).then(input => util.request(input)).catch(error => {
      if (option.fail) option.fail({errMsg: error.message});
      if (option.complete) option.complete({errMsg: error.message});
    });
  }
  option.cachetime = option.noCache ? 0 : (option.cachetime ? option.cachetime : 0);
  option.showLoading = typeof option.showLoading != 'undefined' ? option.showLoading : false;
  option.mask = typeof option.mask != 'undefined' ? option.mask : false;
  let DATA = util.getData(option);
  var url = option.url;
  if (url.indexOf('http://') == -1 && url.indexOf('https://') == -1) {
    url = util.api(url);
  }
  let header = DATA[1];
  if (option.header) {
    for (let k in option.header) {
      header[k] = option.header[k];
    }
  }
  // let header = option.header ? option.header : {};
  header['content-type'] = 'application/x-www-form-urlencoded';
  header['mini-program'] = 'wechat_mini';
  if (!url) {
    return false;
  }
  if (option.cachetime) {
    var cachekey = md5(url);
    var cachedata = wx.getStorageSync(cachekey);
    var timestamp = Date.parse(new Date());
    if (cachedata && cachedata.data) {
      if (cachedata.expire > timestamp) {
        if (option.success && typeof option.success == 'function') {
          option.success(cachedata);
        }
        if (option.complete && typeof option.complete == 'function') {
          option.complete(cachedata);
        }
        console.log('命中缓存:' + url);
        wx.hideLoading();
        wx.hideNavigationBarLoading();
        return true;
      } else {
        wx.removeStorageSync(cachekey)
      }
    }
  }
  wx.request({
    url: url,
    // data: DATA[0],
    data: url==='index/upload' ? option.data : DATA[0],
    header: header,
    method: option.method ? option.method : 'GET',
    success: function (response) {
      wx.hideNavigationBarLoading();
      // wx.hideLoading();
      if (typeof (response.header.token) != 'undefined') {
        app.token = response.header.token;
      }
      if (response.data.code) {
        //登陆态失效，重新登陆
        if (response.data.code == '401' && !option.publicBrowse) {
          util.login(function () {
            util.request(option)
          });
          return;
        }
        if (option.success && typeof option.success == 'function') {
          option.success(response);
        }
        console.info(option.url, response.data.code, response.data.message, response.data.data);
      } else {
        if (option.success && typeof option.success == 'function') {
          option.success(response);
        }
        //写入缓存，减少HTTP请求，并且如果网络异常可以读取缓存数据
        if (option.cachetime) {
          var cachedata = {
            'data': response.data,
            'expire': timestamp + option.cachetime * 1000
          };
          wx.setStorageSync(cachekey, cachedata);
        }
      }
    },
    fail: function (response) {
      wx.hideNavigationBarLoading();
      wx.hideLoading();
      //如果请求失败，尝试从缓存中读取数据
      if (option.noCache) {
        if (option.fail) option.fail(response);
        return;
      }
      var md5 = require('md5.js');
      var cachekey = md5(url);
      var cachedata = wx.getStorageSync(cachekey);
      if (cachedata && cachedata.data) {
        if (option.success && typeof option.success == 'function') {
          option.success(cachedata);
        }
        console.log('请求失败读取缓存:' + url);
        return true;
      } else {
        if (option.fail && typeof option.fail == 'function') {
          option.fail(response);
        }
      }
    },
    complete: function (response) {
      // wx.hideNavigationBarLoading();
      // wx.hideLoading();
      if (option.complete && typeof option.complete == 'function') {
        option.complete(response);
      }
    }
  });
}
/**
 * 记录当前是否已经正在调用util.login()
 */
var isLoging = false;
/**
 * 微信小程序登陆
 */
util.login = function (callback) {
  if (isLoging) {
    //console.error('正在请求login中')
    let detect_login_complete = setInterval(function () {
      //console.info('检测login中')
      if (!isLoging) {
        //console.info('请求login完成')
        callback && callback();
        clearInterval(detect_login_complete);
      }
    }, 500);
    return;
  }
  isLoging = true;
  wx.login({
    success(res) {
      wx.request({
        url: util.api("api/user/selectUserByOpenId"),
        method: 'post',
        data: {
          code: res.code
        },
        success(response) {
          // console.log('loginOk', response)
          if (response.statusCode == 200 && response.data.code == 0) {
            // app.token = response.data.data.token;
            callback();
          } else if (response.data.code == 401) {
            wx.showToast({
              title: '请先授权登录!',
              icon: 'none'
            })
          }
        },
        complete() {
          isLoging = false;
        }
      })
    }
  })
}
/**
 * 注销登陆
 */
util.logout = function (callback) {
  let app = getApp();
  if (app.token == '') return;
  wx.request({
    url: util.url('entry/wxapp/logout'),
    header: {
      'token': app.token
    },
    success() {
      app.token = '';
    }
  })
}
/**
* 提示 默认提示信息为网络波动
* @param {String} title 提示标题
* @param {String} icon 提示icon
* @param {int} duration 提示时长
*/
util.showToast = function (title, duration, icon) {
  return new Promise((resolve, reject) => {
    wx.showToast({
      title: title || "网络波动,请刷新后重试",
      icon: icon || "none",
      duration: duration || 1200,
      success(res) {
        console.log(res);
        return resolve();
      }, fail(res) {
        return reject();
      }
    })
  })
}
/**
* 获取缓存信息
* @param key
* @returns {Promise<unknown>}
*/
util.getStorageSync = function (key) {
  return new Promise((resolve, reject) => {
    wx.getStorage({
      key: key,
      success: function (res) {
        return resolve(res)
      },
      fail: function (error) {
        console.log(key + "获取失败");
        return reject(error)
      }
    })
  })
}
/**
 * 预览单个图片
 * @param {*} event 点击事件
 */
util.showImage = function (event) {
  var url = event ? event.currentTarget.dataset.preview : '';
  if (!url) {
    return false;
  }
  wx.previewImage({
    urls: [url]
  });
}
/**
 * 检查wxapp版本更新
 */
util.check_update = function () {
  // 用户版本更新
  if (wx.canIUse("getUpdateManager")) {
    let updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate(
      function (res) {
        // 请求完新版本信息的回调
        console.log("是否有新版本：", res.hasUpdate);
      }
    );
    updateManager.onUpdateReady(
      function () {
        wx.showModal({
          confirmColor: theme.action,
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
              updateManager.applyUpdate();
            } else if (res.cancel) {
              return false;
            }
          }
        })
      }
    );
    updateManager.onUpdateFailed(
      function () {
        // 新的版本下载失败
        wx.hideLoading();
        wx.showModal({
          confirmColor: theme.action,
          title: '升级失败',
          content: '新版本下载失败，请检查网络！',
          showCancel: false
        });
      }
    );
  }
}
/**
 * 获取上个页面对象
 */
util.lastpage = () => {
  let pages = getCurrentPages();
  if (pages.length >= 2) {
    let lastpage = pages[pages.length - 2];
    return lastpage;
  } else {
    console.error("only one page now");
    throw new Error("only one page now")
  }
}
util.setPrice = function (price, w) {
  if (!w) {
    w = 100;
  }
  return util.delDotZero((price/w).toFixed(2));
}
util.delDotZero = function (price) {
  if (price.indexOf('.') < 0) {
    return price;
  }
  price = price.replace('.00', '');
  price = price.replace(/(^\d+\.\d)0$/g,'$1');
  return price;
}
util.getE = function (data) {
  return new Promise((resolve, reject) => {
    util.request({
      url: 'index/content',
      method: 'post',
      data: data,
      success(res) {
        if (res.data.code == 0) {
          let eArr = res.data.data
          return resolve(eArr)
        } else {
          util.showToast(res.data.msg)
          return reject()
        }
      },
      fail(res) {
        util.showToast()
        return reject()
      }
    })
  })
}
util.getEs = function (data) {
  return new Promise((resolve, reject) => {
    util.request({
      url: 'api/e/finds',
      method: 'post',
      data: data,
      success(res) {
        if (res.data.code == 0) {
          let eArr = res.data.data
          return resolve(eArr)
        } else {
          util.showToast(res.data.msg)
          return reject()
        }
      },
      fail(res) {
        util.showToast()
        return reject()
      }
    })
  })
}
util.formatDate = function formatDate(date, fmt) {
  //获取年份
  if (/(y+)/.test(fmt)) {
    // 把数字变成字符串
    let dateY = date.getFullYear() + "";
    //RegExp.$1 在判断中出现过，且是括号括起来的，所以 RegExp.$1 就是 "yyyy"
    fmt = fmt.replace(RegExp.$1, dateY.substr(4 - RegExp.$1.length));
  }
  //获取其他
  let o = {
    "M+": date.getMonth() + 1,
    "d+": date.getDate(),
    "h+": date.getHours(),
    "m+": date.getMinutes(),
    "s+": date.getSeconds(),
  };
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      let str = o[k] + "";
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? str : padLeftZero(str)
      );
    }
  }
  return fmt;
}
function padLeftZero(str) {
  return ("00" + str).substr(str.length);
}
module.exports = util;
