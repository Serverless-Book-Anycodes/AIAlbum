//获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    album: {},
    albumId: 0,
    albumName: "相册详情",
    photoList: [],
    currentPhotoShow: false,
    currentPhotoUrl: "",
    currentPhotoIndex: null,
    rowCount: 1,
    distance: false,
    bgWidth: wx.getSystemInfoSync().windowWidth,
    bgHeight: wx.getSystemInfoSync().windowHeight - 30,
    rowWidthHeight: 0,
    windowRate: parseInt(Math.sqrt(Math.pow(wx.getSystemInfoSync().windowWidth, 2) + Math.pow(wx.getSystemInfoSync().windowHeight, 2)) / 7),
    deletePhotoShow: false,
    deletePhotoIndex: null,
    password: false,
    inputPasswordData: undefined,
    share: false,
    showShareButtom: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      rowWidth: wx.getSystemInfoSync().windowWidth / this.data.rowCount,
      rowHeight: wx.getSystemInfoSync().windowWidth / this.data.rowCount,
      albumId: options.album,
      rowCount: wx.getStorageSync('photoRowCount') || 1,
      distance: wx.getStorageSync('photoRowDistance') || false,
      rowWidthHeight: wx.getStorageSync('photoRowWidthHeight') || 0
    })
    this.getAlbum(options.album)
  },

  getAlbum: function (id, password = undefined) {
    wx.showToast({
      icon: "loading",
      title: '相册加载中 ...',
    })
    const that = this
    try {
      app.doPost('/album/get', {
        id: id,
        password
      }).then(function (result) {
        if (!result.Body.Error) {
          that.getPhotoList(that.data.albumId, that.data.inputPasswordData)
          that.setData({
            albumName: result.Body.name,
            album: result.Body
          })
          if (![1, 2].includes(result.Body.acl)) {
            wx.hideShareMenu()
          }
        } else {
          if (result.Body.Error == "AlbumNotExist") {
            wx.showModal({
              title: "温馨提示",
              content: "未获得到可操作的相册",
              showCancel: false,
              confirmText: "确认",
              success: function (res) {
                wx.redirectTo({
                  url: '/pages/index/index',
                })
              }
            });
          } else if (result.Body.Error == "PermissionException") {
            that.setData({
              password: true
            })
          } else {
            wx.showToast({
              icon: "error",
              title: '请求数据失败',
            })
          }
        }
      })
    } catch (ex) {
      wx.showToast({
        icon: "error",
        title: '服务连接异常',
      })
    }
  },

  inputPassword: function (e) {
    this.setData({
      inputPasswordData: e.detail.value
    })
  },

  gettedPassword: function (e) {
    this.getAlbum(this.data.albumId, this.data.inputPasswordData)
    this.setData({
      password: false
    })
  },

  /**
   * 
   * 获取图片列表
   * @param {*} 相册Id
   * @param {*} 相册密码
   */
  getPhotoList: function (id, password) {
    wx.showToast({
      icon: "loading",
      title: '图片加载中 ...',
    })
    const that = this
    try {
      app.doPost('/picture/album/list', {
        secret: app.globalData.token,
        album: id,
        password
      }).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            photoList: result.Body
          })
        } else {
          wx.showModal({
            title: "温馨提示",
            content: String(result.Body.Message),
            success: function (res) {
              that.setData({
                password: true
              })
            }
          });
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
   * 复制链接地址，复制临时地址
   */
  copyLink: function (e) {
    const that = this
    try {
      app.doPost('/picture/temporary/url/get', {
        secret: app.globalData.token,
        photo: that.data.photoList[that.data.currentPhotoIndex].id,
        password: that.data.inputPasswordData
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
            },
            fail(res) {
              app.responseAction(
                "温馨提示",
                "数据复制失败"
              )
            }
          })
        } else {
          app.responseAction(
            "温馨提示",
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
   * 图片短按
   */
  photoClick: function (e) {
    var index = e.currentTarget.dataset.index
    var src = index >= 0 ? this.data.photoList[index].pictureSource : e.currentTarget.dataset.url
    if (!this.data.distance) {
      wx.previewImage({
        current: src, // 当前显示图片的http链接
        urls: [src] // 需要预览的图片http链接列表
      })
    }
  },

  /**
   * 图片长按
   */
  photoLongClick: function (e) {
    const index = e.currentTarget.dataset.index
    const src = this.data.photoList[index].pictureSource
    const currentPhotoType = String(this.data.photoList[index].type) == '1' ? false : true
    if (!this.data.distance) {
      this.setData({
        currentPhotoShow: true,
        currentPhotoUrl: src,
        currentPhotoIndex: index,
        currentPhotoType: currentPhotoType
      })
    }
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
        const postData = {
          photo: that.data.deletePhotoIndex,
          type: -1,
          password: that.data.inputPasswordData
        }
        if (that.data.inputPasswordData) {
          postData['password'] = that.data.inputPasswordData
        }
        app.doPost('/picture/action', postData).then(function (result) {
          if (!result.Body.Error) {
            wx.showToast({
              icon: "success",
              title: '图片删除成功'
            })
            that.setData({
              deletePhotoShow: false,
              deletePhotoIndex: null
            })
            that.getPhotoList(that.data.albumId)
          } else {
            app.responseAction(
              "温馨提示",
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

  hidePassword: function (e) {
    wx.redirectTo({
      url: '/pages/index/index',
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

  onShareAppMessage: function (res) {
    const that = this;
    that.setData({
      shareButton: false
    })
    if (res.from == "menu") {
      return {
        title: `${that.data.albumName}`,
        path: `/pages/album/index?album=${that.data.albumId}`,
      }
    } else if (res.from == "button") {
      return that.data.shareContent
    }
  },

  onShareTimeline: function (options) {
    return {
      title: `${that.data.albumName}`,
      query: `album=${that.data.albumId}`,
      path: `/pages/album/index?`,
    }
  },


  addDescription: function () {
    this.setData({
      description: true,
      currentPhotoShow: false
    })
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


  gettedDescription: function (e) {
    const that = this
    try {
      app.doPost('/picture/description', {
        photo: that.data.photoList[that.data.currentPhotoIndex].id,
        description: that.data.currentDescription,
        password: that.data.inputPasswordData
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
  }
})