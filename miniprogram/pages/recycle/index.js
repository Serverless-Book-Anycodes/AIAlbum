//获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    pictureAction: false,
    currentPicture: {},
    pictureList: []
  },


  onLoad: function (options) {
    this.getRecycle()
  },

  getRecycle: function () {
    const that = this
    try {
      app.doPost('/picture/delete/get', {}).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            pictureList: result.Body
          })
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
  },

  pictureActionOpen(e) {
    this.setData({
      currentPicture: this.data.pictureList[e.currentTarget.dataset.index],
      pictureAction: true
    })
  },

  pictureActionClose(e) {
    this.setData({
      pictureAction: false
    })
  },

  pictureActionDelete(e) {
    const that = this
    try {
      app.doPost('/picture/action', {
        photo: that.data.currentPicture.id,
        type: -2
      }).then(function (result) {
        if (!result.Body.Error) {
          wx.showToast({
            icon: "success",
            title: '删除成功'
          })
          that.getRecycle()
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
    that.setData({
      pictureAction: false
    })
  },

  pictureActionRecovery(e) {
    const that = this
    try {
      app.doPost('/picture/action', {
        photo: that.data.currentPicture.id,
        type: 1
      }).then(function (result) {
        if (!result.Body.Error) {
          wx.showToast({
            icon: "success",
            title: '恢复成功'
          })
          that.getRecycle()
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
    that.setData({
      pictureAction: false
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