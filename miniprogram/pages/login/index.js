//获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    stepList: [{
      name: '欢迎'
    }, {
      name: '协议'
    }, {
      name: '授权'
    }, {
      name: '开始'
    }, ],
    step: 0,
    welcomeDisplay: true,
    documentDisplay: false,
    loginDisplay: false,
    startDisplay: false,
    logining: false,
    loginText: '点击授权',
    userInfo: {},
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    hasUserInfo: false,
    redirectPages: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function () {

    const pageData = getCurrentPages()[0]
    let tempArgs = "?"
    for (const key in pageData.options) {
      tempArgs = `${tempArgs}${tempArgs == "?" ? "" : "&"}${key}=${pageData.options[key]}`
    }
    this.setData({
      redirectPages: '/' + pageData['route'] + tempArgs
    })

    if ('/' + pageData['route'] + tempArgs.includes('/share/')) {
      wx.showToast({
        title: '请先注册/登陆',
        icon: 'none',
        duration: 2000
      })
    }
    const tempData = {
      hasUserInfo: true,
      step: 3,
      welcomeDisplay: false,
      startDisplay: true
    }
    if (app.globalData.userInfo) {
      tempData.userInfo = app.globalData.userInfo
      this.setData(tempData)
      this.goIndex()
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        tempData.userInfo = res.userInfo
        app.globalData.userInfo = res.userInfo
        this.setData(tempData)
        this.goIndex()
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          tempData.userInfo = res.userInfo
          app.globalData.userInfo = res.userInfo
          this.setData(tempData)
          this.goIndex()
        }
      })
    }
  },

  /**
   * 获取用户信息
   */
  getUserInfo: function (e) {
    // 登录
    this.loginSteps()
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
    this.loginSteps()
  },

  /**
   * 顶部登陆进度事件
   */
  loginSteps: function () {
    var thisStep = this.data.step + 1
    var tempData = {
      step: thisStep,
      welcomeDisplay: false,
      documentDisplay: false,
      loginDisplay: false,
      startDisplay: false,
    }
    if (thisStep == 1) {
      tempData.documentDisplay = true
    } else if (thisStep == 2) {
      tempData.loginDisplay = true
    } else if (thisStep == 3) {
      // 授权UI变化
      tempData.loginDisplay = true
      tempData.logining = true
      tempData.loginText = "授权中"
    } else if (thisStep == 4) {
      // 授权成功UI变化
      tempData.startDisplay = true
    }
    this.setData(tempData)
  },
  goIndex: function () {
    app.login()
    console.log(this.data.redirectPages)
    wx.redirectTo({
      url: this.data.redirectPages || '/pages/index/index',
    })
  }
})