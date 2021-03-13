//获取应用实例
const app = getApp()

Page({

  data: {
    imageType: 0,
    imgList: [],
    index: 0,
    album: [],
    uploadFiles: [],
    imgListState: [],
    buttonTitle: "上传",
    buttonIcon: "cuIcon-upload"
  },

  imageTypeAction: function (e) {
    this.setData({
      imageType: Number(e.currentTarget.dataset.value)
    })
  },

  onLoad: function (options) {
    this.getAlbumList()
  },

  // 获取相册列表
  getAlbumList: function () {
    const that = this
    try {
      app.doPost('/album/list', {
        secret: app.globalData.token
      }).then(function (result) {
        if (!result.Body.Error) {
          const albums = []
          for (let i = 0; i < result.Body.length; i++) {
            if (result.Body[i].acl == 0 || result.Body[i].acl == 2 || result.Body[i].owner) {
              albums.push(result.Body[i])
            }
          }
          if (albums == 0) {
            app.responseAction(
              "无相册可选",
              "未获得到相册，需要新建相册"
            )
            wx.navigateTo({
              url: '/pages/albumInformation/index',
            })
          } else {
            that.setData({
              album: albums
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

uploadData: function () {
  const that = this
  const uploadFiles = this.data.imageType == 1 ? this.data.originalPhotos : this.data.thumbnailPhotos
  for (let i = 0; i < uploadFiles.length; i++) {
    if (that.data.imgListState[i] != "complete") {
      const imgListState = that.data.imgListState
      try {
        app.doPost('/picture/upload/url/get', {
          album: that.data.album[that.data.index].id,
          index: i,
          file: uploadFiles[i]
        }).then(function (result) {
          if (!result.Body.Error) {
            imgListState[result.Body.index] = 'uploading'
            that.setData({
              imgListState: imgListState
            })
            wx.request({
              method: 'PUT',
              url: result.Body.url,
              data: wx.getFileSystemManager().readFileSync(uploadFiles[result.Body.index]),
              header: {
                "Content-Type": " "
              },
              success(res) {
              },
              fail(res) {
              },
              complete(res) {
              }
            })
          } else {
          }
        })
      } catch (ex) {
      }
    }
  }
},

  complete: function () {
    const buttonTitle = "上传"
    const buttonIcon = "cuIcon-upload"
    let state = false
    for (let i = 0; i < this.data.imgListState.length; i++) {
      if (!["warn", "complete"].includes(this.data.imgListState[i])) {
        state = true
      }
    }
    if (state == false) {
      // 删除成功图
      const imgList = []
      const uploadFiles = []
      const imgListState = []
      const originalPhotos = []
      const thumbnailPhotos = []
      for (let i = 0; i < this.data.imgListState.length; i++) {
        if(this.data.imgListState[i] == "warn"){
          imgList.push(this.data.imgList[i])
          uploadFiles.push(this.data.uploadFiles[i])
          imgListState.push(this.data.imgListState[i])
          originalPhotos.push(this.data.originalPhotos[i])
          thumbnailPhotos.push(this.data.thumbnailPhotos[i])
        }
      }

      if(imgList.length == 0){
        wx.showToast({
          title: '上传完成',
        })
      }else{
        wx.showToast({
          icon: 'none',
          title: '可重新上传失败图片',
        })
      }
      

      this.setData({
        imgList: imgList,
        uploadFiles: uploadFiles,
        imgListState: imgListState,
        originalPhotos: originalPhotos,
        thumbnailPhotos: thumbnailPhotos,
        buttonTitle: buttonTitle,
        buttonIcon: buttonIcon
      })
    }
  },

  hidePassword: function (e) {
    wx.redirectTo({
      url: '/pages/index/index',
    })
  },

  inputPassword: function (e) {
    this.setData({
      inputPasswordData: e.detail.value
    })
  },

  gettedPassword: function (e) {
    const that = this
    try {
      app.doPost('/album/get', {
        id: this.data.album[this.data.index].id,
        password: this.data.inputPasswordData
      }).then(function (result) {
        if (!result.Body.Error) {
          that.setData({
            password: false
          })
        } else {
          wx.showModal({
            title: "操作失败",
            content: String(result.Body.Message),
            success: function (res) {
              that.setData({
                password: true
              })
            }
          });
        }
      })
    } catch (ex) {}
  },

  viewImage: function (e) {
    wx.previewImage({
      urls: this.data.imgList,
      current: e.currentTarget.dataset.url
    });
  },

  chooseImage: function () {
    const that = this
    const thumbnailPhotos = []
    const originalPhotos = []
    wx.chooseImage({
      count: 9, //默认9
      sizeType: ['original'],
      sourceType: ['album', 'camera'], //从相册选择
      success: (res) => {
        for (let i = 0; i < res.tempFiles.length; i++) {
          thumbnailPhotos.push(res.tempFilePaths[i])
          originalPhotos.push(res.tempFilePaths[i])
          wx.compressImage({
            src: 'res.tempFilePaths[i]',
            success: (compressImageRes) => {
              thumbnailPhotos[i] = compressImageRes.tempFilePath
            }
          })
        }
        if (that.data.imgList.length != 0) {
          that.setData({
            imgList: that.data.imgList.concat(thumbnailPhotos),
            imgListState: that.data.imgListState.concat(JSON.parse(JSON.stringify(thumbnailPhotos))),
            originalPhotos: that.data.imgList.concat(originalPhotos),
            thumbnailPhotos: that.data.imgList.concat(thumbnailPhotos)
          })
        } else {
          that.setData({
            imgList: thumbnailPhotos,
            imgListState: JSON.parse(JSON.stringify(thumbnailPhotos)),
            originalPhotos: originalPhotos,
            thumbnailPhotos: thumbnailPhotos
          })
        }
      }
    });
  },

  deleteImage(e) {
    this.data.imgList.splice(e.currentTarget.dataset.index, 1);
    this.setData({
      imgList: this.data.imgList
    })
  },
  selectAlbum(e) {
    const tempData = {
      index: e.detail.value
    }
    if (this.data.album[e.detail.value].acl == 2 && this.data.album[e.detail.value].owner == false && this.data.album[e.detail.value].password == true) {
      tempData["password"] = true
    }
    this.setData(tempData)
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