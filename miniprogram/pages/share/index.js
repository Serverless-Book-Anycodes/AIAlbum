const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    picture: {
      user: "",
      time: "",
      avatar: "",
      photo: "",
      type: -1
    },
    showPhoto: 'https://download.aialbum.net/static/images/share/default.png',
    haveTime: 8,
    show: true,
    timeArea: false,
    main: 0,
    showDefault: false
  },

  onLoad: async function (options) {
    this.getPhoto(options.token)
    while (this.data.picture.type == -1) {
      await app.sleep(1000)
    }
  },

  showPicture: async function (options) {
    this.setData({
      showPhoto: this.data.picture.photo
    })
    if (this.data.picture.type != 3) {
      this.setData({
        timeArea: true
      })
      for (let i = 0; i < 8; i++) {
        await app.sleep(1000)
        this.setData({
          haveTime: this.data.haveTime - 1
        })
      }
      this.setData({
        show: false
      })
    } else {

    }
  },

  getPhoto: function (token) {
    wx.showLoading({
      icon: "loading",
      title: '图片加载中 ...',
    })
    const that = this
    try {
      app.doPost('/share/get', {
        token: token
      }).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            main: 1,
            picture: result.Body
          })
          that.setCachePhoto(result.Body.photo)
        } else {
          that.setData({
            main: 2
          })
          wx.hideLoading()
        }
      })
    } catch (ex) {
      wx.hideLoading()
      wx.showToast({
        icon: "error",
        title: '服务连接异常',
      })
    }
  },

  setCachePhoto: function (url) {
    var that = this
    wx.downloadFile({
      url: url,
      success(res) {
        const picture = that.data.picture
        picture.photo = res.tempFilePath
        that.setData({
          picture: picture,
          showDefault: true
        })
        wx.hideLoading()
      }
    })
  },

  deletePhoto: function(options){
    this.setData({
      show: false
    })
  }
})