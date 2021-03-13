//app.js
App({

  // 基础url
  url: 'https://www.aialbum.net',

  globalData: {
    userInfo: null
  },

  // 统一请求接口
  doPost: async function (uri, data, option = {
    secret: true,
    method: "POST"
  }) {
    let times = 20
    const that = this
    let initStatus = false
    if (option.secret) {
      while (!initStatus && times > 0) {
        times = times - 1
        if (this.globalData.secret) {
          data.secret = this.globalData.secret
          initStatus = true
          break
        }
        await that.sleep(500)
      }
    } else {
      initStatus = true
    }
    if (initStatus) {
      return new Promise((resolve, reject) => {
        wx.request({
          url: that.url + uri,
          data: data,
          header: {
            "Content-Type": "text/plain"
          },
          method: option.type ? option.type : "POST",
          success: function (res) {
            if (res.data.Body && res.data.Body.Error && res.data.Body.Error == "UserInformationError") {
              wx.navigateTo({
                url: '/pages/login/index',
              })
            } else {
              resolve(res.data)
            }
          },
          fail: function (res) {
            reject(null)
          }
        })
      })
    }
  },

  sleep: function (milSec) {
    return new Promise(resolve => {
      setTimeout(resolve, milSec)
    })
  },

  login: async function () {
    const that = this
    const postData = {}
    let initStatus = false
    while (!initStatus) {
      if (this.globalData.token) {
        postData.token = this.globalData.token
        initStatus = true
        break
      }
      await that.sleep(200)
    }
    if (this.globalData.userInfo) {
      postData.username = this.globalData.userInfo.nickName
      postData.avatar = this.globalData.userInfo.avatarUrl
      postData.place = this.globalData.userInfo.country || "" + this.globalData.userInfo.province || "" + this.globalData.userInfo.city || ""
      postData.gender = this.globalData.userInfo.gender
    }
    try {
      this.doPost('/login', postData, {
        secret: false,
        method: "POST"
      }).then(function (result) {
        if (result.secret) {
          that.globalData.secret = result.secret
        } else {
          that.responseAction(
            "登陆失败",
            String(result.Body.Message)
          )
        }
      })
    } catch (ex) {
      wx.showToast({
        icon: "error",
        title: '服务连接异常',
      })
    }
  },

  onLaunch: async function () {
    const that = this
    wx.login({
      success: function (res) {
        // console.log(res)
        if (res.code) {
          try {
            that.doPost('/token', {
              code: res.code,
            }, {
              secret: false,
              method: "POST"
            }).then(function (result) {
              if (!result.Body.Error) {
                that.globalData.token = result.Body.openid
                // 获取用户信息
                wx.getSetting({
                  success: res => {
                    if (res.authSetting['scope.userInfo']) {
                      // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
                      wx.getUserInfo({
                        success: res => {
                          that.globalData.userInfo = res.userInfo
                          if (that.userInfoReadyCallback) {
                            that.userInfoReadyCallback(res)
                          }
                          that.login()
                        },
                        fail: res => {
                          console.log(1)
                          wx.navigateTo({
                            url: '/pages/login/index',
                          })
                        }
                      })
                    } else {
                      if (that.globalData.token != 1) {
                        wx.navigateTo({
                          url: '/pages/login/index',
                        })
                      }
                    }
                  },
                  fail: res => {
                    wx.navigateTo({
                      url: '/pages/login/index',
                    })
                  }
                })
              } else {
                wx.navigateTo({
                  url: '/pages/login/index',
                })
              }
            })
          } catch (ex) {
            wx.navigateTo({
              url: '/pages/login/index',
            })
          }
        } else {
          wx.navigateTo({
            url: '/pages/login/index',
          })
        }
      }
    });

    // 自定义头部
    wx.getSystemInfo({
      success: e => {
        that.globalData.StatusBar = e.statusBarHeight;
        let capsule = wx.getMenuButtonBoundingClientRect();
        if (capsule) {
          that.globalData.Custom = capsule;
          that.globalData.CustomBar = capsule.bottom + capsule.top - e.statusBarHeight;
        } else {
          that.globalData.CustomBar = e.statusBarHeight + 50;
        }
      }
    })
  },

  responseAction(title, content) {
    wx.showModal({
      title: title,
      content: content,
      cancelText: "关闭窗口",
      success: function (res) {
        if (res.confirm) {} else {}
      }
    });
  },

  newSortArray: function (sourceArray) {
    var newlist = [];
    var sourceArrayLen = sourceArray.length
    for (var i = 0; i < sourceArrayLen; i++) {
      var num = Math.floor(Math.random() * (sourceArray.length - 1));
      newlist.push(sourceArray[num]);
      sourceArray.splice(num, 1)
    }
    return newlist
  },
})