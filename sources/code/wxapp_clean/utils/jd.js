var jd = {};
function isInteger(obj) {
  return Math.floor(obj) === obj
}
/*
 * 将一个浮点数转成整数，返回整数和倍数。如 3.14 >> 314，倍数是 100
 * @param floatNum {number} 小数
 * @return {object}
 * {times:100, num: 314}
 */
function toInteger(floatNum) {
  var ret = {
    times: 1,
    num: 0
  }
  if (isInteger(floatNum)) {
    ret.num = floatNum
    return ret
  }
  var strfi = floatNum + ''
  var dotPos = strfi.indexOf('.')
  var len = strfi.substr(dotPos + 1).length
  var times = Math.pow(10, len)
  var intNum = parseInt(floatNum * times + 0.5, 10)
  ret.times = times
  ret.num = intNum
  return ret
}

/*
 * 核心方法，实现加减乘除运算，确保不丢失精度
 * 思路：把小数放大为整数（乘），进行算术运算，再缩小为小数（除）
 *
 * @param a {number} 运算数1
 * @param b {number} 运算数2
 * @param digits {number} 精度，保留的小数点数，比如 2, 即保留为两位小数
 * @param op {string} 运算类型，有加减乘除（add/subtract/multiply/divide）
 *
 */
function operation(a, b, digits, op) {
  var o1 = toInteger(a)
  var o2 = toInteger(b)
  // 判断两个数值取整的倍数 倍数小的那个再乘倍数差
  let cha = 0;
  if (o1.times > o2.times) {
    cha = o1.times / o2.times
    o2.num = o2.num * cha
  } else {
    cha = o2.times / o1.times
    o1.num = o1.num * cha
  }
  var max = o1.times > o2.times ? o1.times : o2.times
  var result = null
  switch (op) {
    case 'add':
      result = o1.num + o2.num
      return result / max
    case 'multiply':
      result = o1.num * o2.num
      return result / max / max
  }
}

// 加减乘除的四个接口
jd.add = function(a, b, digits) {
  return operation(a, b, digits, 'add')
}

jd.subtract = function subtract(a, b, digits) {
  return operation(a, b, digits, 'subtract')
}

jd.multiply = function multiply(a, b, digits) {
  return operation(a, b, digits, 'multiply')
}

jd.divide = function divide(a, b, digits) {
  return operation(a, b, digits, 'divide')
}

module.exports = jd;