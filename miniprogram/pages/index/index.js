//获取应用实例
const app = getApp()

Page({
  data: {
    tabList: ["相册", "图片"],
    tabCur: 0,
    colorList: ["red", "blue", "orange", "yellow", "olive", "green", "cyan", "purple", "mauve", "pink", "brown", "grey", "gray"],
    albumList: [],
    photoList: [],
    photoDisplay: false,
    photoContentDisplay: false,
    albumDisplay: true,
    currentPhotoShow: false,
    currentPhotoUrl: "",
    currentPhotoIndex: null,
    customBar: app.globalData.CustomBar,
    rowCount: 1,
    distance: false,
    bgWidth: wx.getSystemInfoSync().windowWidth,
    bgHeight: wx.getSystemInfoSync().windowHeight - 30,
    rowWidthHeight: 0,
    windowRate: parseInt(Math.sqrt(Math.pow(wx.getSystemInfoSync().windowWidth, 2) + Math.pow(wx.getSystemInfoSync().windowHeight, 2)) / 7),
    deletePhotoShow: false,
    deletePhotoIndex: null,
    getResult: 0,
    programResult: "",
    description: false,
    programCode: "print('这是一段Python代码，你可以自己修改。')",
    share: false,
    showShareButtom: false,
  },

  init: function () {
    wx.showLoading({
      icon: "loading",
      title: '数据加载中 ...',
    })
    this.setData({
      colorList: app.newSortArray(this.data.colorList),
    })
    this.getAlbumList()
    this.getPhotoList()
  },

  onLoad: async function (options) {
    // wx.hideShareMenu()
    if (app.globalData.userInfo) {
      this.init()
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.init()
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          this.init()
        }
      })
    }
    while (app.globalData.token != this.data.getResult) {
      console.log("Test", app.globalData.token)
      this.setData({
        getResult: app.globalData.token
      })
      await app.sleep(500)
    }
  },

  // 获取相册列表
  getAlbumList: function () {
    const that = this
    try {
      app.doPost('/album/list', {}).then(function (result) {
        if (!result.Body.Error) {
          wx.hideLoading()
          that.setData({
            albumList: result.Body,
            getResult: app.globalData.token
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

  copyLink: function (e) {
    const that = this
    try {
      app.doPost('/picture/temporary/url/get', {
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

  // 获取图片列表
  getPhotoList: function () {
    const that = this
    try {
      app.doPost('/picture/list', {}).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            photoList: result.Body,
            getResult: app.globalData.token,
            rowCount: wx.getStorageSync('photoRowCount') || 1,
            distance: wx.getStorageSync('photoRowDistance') || false,
            rowWidthHeight: wx.getStorageSync('photoRowWidthHeight') || 0
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

  tabSelect: function (e) {
    this.setData({
      tabCur: e.currentTarget.dataset.id,
      albumDisplay: e.currentTarget.dataset.id == 0 ? true : false,
      photoDisplay: e.currentTarget.dataset.id == 1 ? true : false,
      photoContentDisplay: false,
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
   * 图片长按
   */
  photoLongClick: function (e) {
    const index = e.currentTarget.dataset.index
    const src = this.data.photoList[index].pictureSource
    const currentPhotoType = String(this.data.photoList[index].type) == '1' ? false : true
    this.setData({
      currentPhotoShow: true,
      currentPhotoUrl: src,
      currentPhotoIndex: index,
      currentPhotoType: currentPhotoType
    })
  },

  /**
   * 删除图片
   */
  deletePhoto: function (e) {
    const that = this
    if (that.data.deletePhotoIndex == null) {
      that.setData({
        deletePhotoShow: true,
        deletePhotoIndex: that.data.photoList[that.data.currentPhotoIndex].id,
        currentPhotoShow: false
      })
    } else {
      try {
        app.doPost('/picture/action', {
          photo: that.data.deletePhotoIndex,
          type: -1,
        }).then(function (result) {
          if (!result.Body.Error) {
            wx.showToast({
              icon: "success",
              title: '图片删除成功'
            })
            that.setData({
              deletePhotoShow: false,
              deletePhotoIndex: null
            })
            that.getPhotoList()
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
    }
  },

  hideDeleteModal: function (e) {
    this.setData({
      deletePhotoShow: false,
      deletePhotoIndex: null,
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
              content: JSON.stringify(res),
            })
          }
        })
      },
      fail(res) {
        wx.showModal({
          title: '保存失败',
          content: JSON.stringify(res),
        })
      }
    })
  },


  /**
   * 关闭图片弹窗
   */
  hideModal: function (e) {
    this.setData({
      currentPhotoShow: false,
    })
  },

  /**
   * 调整图片
   */
  touchendCallback: function (e) {
    this.setData({
      distance: null
    })
  },

  touchmoveCallback: function (e) {
    if (e.touches.length == 1) {
      return
    }
    // 监测到两个触点
    let xMove = e.touches[1].clientX - e.touches[0].clientX
    let yMove = e.touches[1].clientY - e.touches[0].clientY
    let distance = Math.sqrt(xMove * xMove + yMove * yMove)
    if (this.data.distance) {
      // 已经存在前置状态
      let tempDistance = this.data.distance - distance
      let scale = parseInt(Math.abs(tempDistance / this.data.windowRate))
      if (scale >= 1) {
        let rowCount = tempDistance > 0 ? this.data.rowCount + scale : this.data.rowCount - scale
        rowCount = rowCount <= 1 ? 1 : (rowCount >= 5 ? 5 : rowCount)
        wx.setStorageSync('photoRowCount', rowCount)
        wx.setStorageSync('photoRowWidthHeight', wx.getSystemInfoSync().windowWidth / rowCount)
        wx.setStorageSync('photoRowDistance', distance)
        this.setData({
          rowCount: rowCount,
          rowWidthHeight: wx.getSystemInfoSync().windowWidth / rowCount,
          distance: distance
        })
      }
    } else {
      // 不存在前置状态
      this.setData({
        distance: distance
      })
    }
  },

  addDescription: function () {
    this.setData({
      description: true,
      currentPhotoShow: false
    })
  },

  sharePhoto: function () {
    this.setData({
      share: true,
      currentPhotoShow: false
    })
  },

  hideShareModal: function () {
    this.setData({
      share: false
    })
  },
  hideShareButton: function () {
    this.setData({
      shareButton: false
    })
  },

  getShareCode: function (e) {
    const that = this
    that.setData({
      shareButton: true,
      share: false
    })
    try {
      app.doPost('/share/create', {
        photo: that.data.photoList[that.data.currentPhotoIndex].id,
        type: e.target.dataset.data,
      }).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            shareContent: {
              title: "图片分享",
              path: `/pages/share/index?token=${result.Body.code}`,
              imageUrl: 'http://download.aialbum.net/static/images/share/share.jpg',
            },
            showShareButtom: true
          })
        } else {
          app.responseAction(
            "分享失败",
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

  onShareAppMessage: function (options) {
    if (options.from == "menu") {
      return {
        title: "人工智能Blog: 共建相册、AI搜索、快捷分享",
        path: "/pages/index/index",
        imageUrl: `http://download.aialbum.net/static/images/album/${Math.floor((Math.random() * 10))}.jpg`
      }
    } else {
      this.setData({
        shareButton: false
      })
      return this.data.shareContent
    }
  },

  onShareTimeline: function (options) {
    return {
      title: "人工智能Blog",
      imageUrl: `http://download.aialbum.net/static/images/album/${Math.floor((Math.random() * 10))}.jpg`
    }
  },

  hideDescription: function () {
    this.setData({
      description: false
    })
  },

  inputDescription: function (e) {
    this.setData({
      currentDescription: e.detail.value
    })
  },

  gettedDescription: function (e) {
    const that = this
    try {
      app.doPost('/picture/description', {
        photo: that.data.photoList[that.data.currentPhotoIndex].id,
        description: that.data.currentDescription,
      }).then(function (result) {
        const tempPhotos = that.data.photoList
        tempPhotos[that.data.currentPhotoIndex]['description'] = that.data.currentDescription
        if (!result.Body.Error) {
          that.setData({
            description: false,
            photoList: tempPhotos
          })
          wx.showToast({
            title: '描述添加成功',
          })
        } else {
          app.responseAction(
            "添加失败",
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
  },

  // 临时方法
  getProgramCode: function (e) {
    this.setData({
      programCode: e.detail.value
    })
  },

  runCode: function (e) {
    const that = this
    that.setData({
      programResult: `运行中，请稍后`
    })
    wx.request({
      url: 'https://1583208943291465.cn-hongkong.fc.aliyuncs.com/2016-08-15/proxy/ai-album/temp-function-oj/',
      data: {
        code: this.data.programCode
      },
      header: {
        "Content-Type": "text/plain"
      },
      method: "POST",
      success: function (res) {
        that.setData({
          programResult: res.data.Response.result
        })
      },
      fail: function (res) {
        that.setData({
          programResult: `运行出错：${res}`
        })
      }
    })
  }
})