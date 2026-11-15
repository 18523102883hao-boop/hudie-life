/**
 * 七牛云微信小程序SDK
 * @version 1.0
 * @author SHIH
 */

/**
 * 七牛云配置参数
 */
let config = {
  /**
   * bucket 所在区域
   * ECN, SCN, NCN, NA, ASG，
   * 分别对应：华东，华南，华北，北美，新加坡 5 个区域
   */
  region: "",

  /**
   * 七牛云bucket 外链前缀，外链在下载资源时用到
   */
  prefix: "",

  /**
   * bucket绑定加速域名
   */
  domain: "",

  /**
   * 指定上传token
   */
  qiniuUploadToken: "",

  /**
   * 是否使用七牛云自动生成文件名
   * 默认false 即使用wxuuid函数生成随机字串+文件后缀
   */
  useQiniuFilename: false,
};

/**
 * 根据七牛云区域代码匹配上传域名
 * 对应域名应在小程序后台添加上传域名白名单
 * @param {*} code 区域代码
 * ECN, SCN, NCN, NA, ASG，分别对应七牛云的：华东，华南，华北，北美，新加坡 5 个区域
 */
function uploadURLFromRegionCode(code) {
  let uploadURL = null;
  switch (code) {
    case "ECN":
      uploadURL = "https://up.qiniup.com";
      break;
    case "NCN":
      uploadURL = "https://up-z1.qiniup.com";
      break;
    case "SCN":
      uploadURL = "https://up-z2.qiniup.com";
      break;
    case "NA":
      uploadURL = "https://up-na0.qiniup.com";
      break;
    case "ASG":
      uploadURL = "https://up-as0.qiniup.com";
      break;
    default:
      console.error("region not in [ECN, SCN, NCN, NA, ASG]");
  }
  return uploadURL;
}

/**
 * 获取唯一字串
 */
function wxuuid() {
  let s = [];
  let hexDigits = "0123456789abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  // bits 12-15 of the time_hi_and_version field to 0010
  s[14] = "4";
  // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
  s[8] = s[13] = s[18] = s[23] = "-";

  let uuid = s.join("");
  return uuid;
}

/**
 * 初始化七牛云配置参数,整个程序生命周期只需调用一次
 * @param {Object} options
 * @param {*} options
 */
function init(options) {
  if (!options.region) {
    console.error("qiniu uploader need your bucket region");
    return;
  }
  if (!options.uptoken) {
    console.error("qiniu uploader need your upload token");
    return;
  }
  if (!options.domain) {
    console.error("qiniu uploader need your upload token");
    return;
  }
  config.region = options.region;
  config.domain = options.domain;
  config.prefix = typeof options.prefix == "undefined" ? "" : options.prefix;
  config.qiniuUploadToken = options.uptoken;
  config.useQiniuFilename = options.useQiniuFilename;
  console.log("Qiniu Uploader  initialization is complete.");
}

/**
 * 七牛云上传文件(异步) 未调用init时options必传
 *  @param {Object} params
 *  @param {String} params.filePath : 文件本地临时路径 必填
 *  @param {Object} params.options : 配置参数，init过可以不传
 *  @callback params.success : 成功回调函数
 *  @callback params.fail : 失败回调函数
 *  @callback params.progress : 上传进度回调函数
 */
function upload(params) {
  //filePath, success, fail, options, progress, cancelTask
  if (null == params.filePath || "" == params.filePath) {
    console.error("qiniu uploader need filePath to upload");
    return;
  }

  params.options = typeof params.options != "undefined" ? params.options : {};
  params.success = typeof params.success != "undefined" ? params.success : () => { };
  params.fail = typeof params.fail != "undefined" ? params.fail : () => { };
  params.progress = typeof params.progress != "undefined" ? params.progress : () => { };

  if (params.options != {}) {
    init(params.options);
  }
  if (config.qiniuUploadToken == "") {
    console.error("qiniu uploader need uptoken");
    return;
  }
  doUpload(params);
}

/**
 * 执行上传任务
 * @param {*} params 同upload参数
 */
function doUpload(params) {
  if (config.qiniuUploadToken == "") {
    console.error("qiniu UploadToken is null, upload tast cancel.");
    return;
  }
  let url = uploadURLFromRegionCode(config.region);

  //示例:http://tmp/wxxxx0.o6xxxxxxxg.PHxxxx96.mp4
  let ext = params.filePath.split(".")[params.filePath.split(".").length - 1];
  // 自定义上传key（即自定义上传文件名）
  // 如果 params.options.key 非空，则使用options中的key作为fileName
  let fileName = config.prefix + (params.options.key ? params.options.key : wxuuid()) + "." + ext;

  let formData = {
    token: config.qiniuUploadToken,
  };
  if (!config.useQiniuFilename) {
    formData["key"] = fileName;
  }
  let uploadTask = wx.uploadFile({
    url: url,
    filePath: params.filePath,
    name: "file",
    formData: formData,
    success(upload_res) {
      let upload_res_data = upload_res.data;
      try {
        let dataObject =
          typeof upload_res_data == "string"
            ? JSON.parse(upload_res_data)
            : upload_res_data;
        if (dataObject.key) {
          // 拼接fileURL
          let fileURL = config.domain + "/" + config.prefix + dataObject.key;
          dataObject.fileURL = fileURL;
        }
        console.log("Qiniu upload response:", dataObject);
        if (dataObject.error == "expired token") {
          console.log("Qiniu Uploader Token has expired,please check your token.");
          params.fail(dataObject);
        } else {
          params.success(dataObject);
        }
      } catch (error) {
        console.log(
          "An error occurred while the Qiniu uploader was processing the data:",
          error
        );
        params.fail(error);
      }
    },
    fail(error) {
      console.error(error);
      params.fail(error);
    },
  });

  // 文件上传进度
  uploadTask.onProgressUpdate((res) => {
    params.progress && params.progress(res);
  });
}

module.exports = {
  init: init,
  upload: upload,
};
