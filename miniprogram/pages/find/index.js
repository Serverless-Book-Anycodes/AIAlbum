//获取应用实例
const app = getApp()

Page({

  data: {
    customBar: app.globalData.CustomBar,
    sentence: "好好学习，天天向上",
    colorList: ["red", "blue", "orange", "yellow", "olive", "green", "cyan", "purple", "mauve", "pink", "brown", "grey", "gray"],
    tags: [],
    tagsShow: [],
    photoListColor: ["gray", "blue"],
    photoList: [],
    resultShow: false,
    searchWord: "",
    page: 1,
    currentPhotoShow: false,
    currentPhotoUrl: "",
    currentPhotoIndex: null,
  },

  onLoad: function (options) {
    this.getTags()
    this.getSentence()
  },

  getTags: function () {
    const that = this
    try {
      app.doPost('/common/tags/get', {}).then(function (result) {
        if (!result.Body.Error) {
          const tagsShow = []
          for (let i = 0; i < result.Body.length; i++) {
            tagsShow.push({
              "name": result.Body[i],
              "color": that.data.colorList[i % 13]
            })
          }
          that.setData({
            colorList: app.newSortArray(that.data.colorList),
            tagsShow: tagsShow
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

  getSentence: function () {
    const that = this
    try {
      app.doPost('/common/daily/sentence', {}).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            sentence: result.Body
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

  searchInput: function (e) {
    this.setData({
      searchWord: e.detail.value
    })
  },
  /**
   * 图片短按
   */
  photoClick: function (e) {
    var index = e.currentTarget.dataset.index
    var src = index >= 0 ? this.data.photoList[index].pictureSource : e.currentTarget.dataset.url
    wx.previewImage({
      current: src, // 当前显示图片的http链接
      urls: [src] // 需要预览的图片http链接列表
    })
  },
  /**
   * 保存到本地
   */
  saveToPhone: function (e) {
    wx.getImageInfo({
      src: e.currentTarget.dataset.url,
      success(res) {
        wx.saveImageToPhotosAlbum({
          filePath: res.path,
          success(res) {
            wx.showToast({
              title: '成功成功',
              icon: 'success',
              duration: 2000
            })
          },
          fail(res) {
            wx.showModal({
              title: '保存失败',
              content: "保存过程被取消",
            })
          }
        })
      },
      fail(res) {
        wx.showModal({
          title: '保存失败',
          content: "图片本地化失败",
        })
      }
    })
  },
  /**
   * 进入相册
   */
  toAlbum: function (e) {
    wx.navigateTo({
      url: `/pages/album/index?album=${e.currentTarget.dataset.name=="photo" ? this.data.photoList[this.data.currentPhotoIndex].album.id : e.currentTarget.dataset.album}`
    })
  },

  searchTags: function (e) {
    this.setData({
      searchWord: e.currentTarget.dataset.value
    })
    this.searchPhoto(true)
  },

  copyLink: function (e) {
    const that = this
    try {
      app.doPost('/picture/temporary/url/get', {
        secret: app.globalData.token,
        photo: that.data.photoList[that.data.currentPhotoIndex].id
      }).then(function (result) {
        if (!result.Body.Error) {
          wx.setClipboardData({
            data: result.Body.url,
            success(res) {
              wx.getClipboardData({
                success(res) {
                  app.responseAction(
                    "复制成功",
                    `地址：${result.Body.url}`
                  )
                  that.setData({
                    currentPhotoShow: false,
                  })
                }
              })
            }
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
  /**
   * 图片长按
   */
  photoLongClick: function (e) {
    var index = e.currentTarget.dataset.index
    var src = this.data.photoList[index].pictureSource
    this.setData({
      currentPhotoShow: true,
      currentPhotoUrl: src,
      currentPhotoIndex: index
    })
  },

  searchPhoto: function (e) {
    const that = this
    if (e) {
      that.setData({
        page: 1,
        photoList: []
      })
    }
    try {
      app.doPost('/picture/search', {
        keyword: this.data.searchWord,
        page: this.data.page
      }).then(function (result) {
        if (!result.Body.Error) {
          const tempData = that.data.photoList.concat(result.Body)
          if(tempData.length == 0){
            wx.showToast({
              icon: 'none',
              title: '未搜索到数据',
            })
          }else{
            that.setData({
              photoList: that.data.photoList.concat(result.Body),
              resultShow: true
            })
          }
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

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    this.setData({
      page: this.data.page + 1
    })
    this.searchPhoto(false)
  },


  preImage: function (e) {
    const photo = this.data.photoList[e.currentTarget.dataset.id]
    wx.previewImage({
      current: photo.pictureThumbnail, // 当前显示图片的http链接
      urls: [photo.pictureSource] // 需要预览的图片http链接列表
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