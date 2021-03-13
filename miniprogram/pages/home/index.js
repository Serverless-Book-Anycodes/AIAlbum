//获取应用实例
const app = getApp()

Page({

  data: {
    userInfo: {},
    cancellation: false,
    about: false
  },

  onLoad: function (options) {
    this.setData({
      userInfo: app.globalData.userInfo,
      step: 3,
      welcomeDisplay: false,
      startDisplay: true
    })
  },
  cancellation: function () {
    this.setData({
      cancellation: true
    })
  },
  closeCancellation: function () {
    this.setData({
      cancellation: false
    })
  },
  confirmCancellation: function () {
    try {
      app.doPost('/user/cancellation', {}).then(function (result) {
        if (!result.Body.Error) {
          wx.clearStorageSync()
        } else {
          app.responseAction(
            "操作失败",
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
    this.setData({
      cancellation: false
    })
  },
  about: function () {
    this.setData({
      about: true
    })
  },
  closeAbout: function () {
    this.setData({
      about: false
    })
  },
  blacklist: function () {
    wx.navigateTo({
      url: '/pages/blacklist/index',
    })
  },
  friends: function () {
    wx.navigateTo({
      url: '/pages/friends/index',
    })
  },
  recycle: function () {
    wx.navigateTo({
      url: '/pages/recycle/index',
    })
  },
  timeline: function () {
    wx.redirectTo({
      url: '/pages/index/index',
    })
  },
  find() {
    wx.redirectTo({
      url: `/pages/find/index`
    })
  },
  upload: function () {
    wx.redirectTo({
      url: '/pages/upload/index',
    })
  },
  manage: function () {
    wx.redirectTo({
      url: '/pages/manage/index',
    })
  },
  home: function () {
    wx.redirectTo({
      url: '/pages/home/index',
    })
  }
})